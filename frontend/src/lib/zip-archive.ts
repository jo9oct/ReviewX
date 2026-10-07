const SOURCE_FILE_EXTENSIONS = new Set([
  ".c", ".cc", ".cpp", ".cs", ".css", ".go", ".h", ".hpp", ".html", ".java",
  ".js", ".jsx", ".json", ".kt", ".php", ".py", ".rb", ".rs", ".sql", ".swift",
  ".ts", ".tsx", ".vue", ".xml", ".yaml", ".yml",
]);

function sourceFileName(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.split("/").some((part) => part === "..")) return false;
  const name = normalized.split("/").pop()?.toLowerCase() ?? "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 && SOURCE_FILE_EXTENSIONS.has(name.slice(dot));
}

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot extract compressed ZIP files. Use a current browser or upload source files.");
  }
  const compressedBuffer = new ArrayBuffer(compressed.byteLength);
  new Uint8Array(compressedBuffer).set(compressed);
  const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readSourceFilesFromZip(file: File): Promise<Array<{ filename: string; content: string }>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minEndOffset = Math.max(0, bytes.length - 65_557);
  let endOffset = -1;

  for (let offset = bytes.length - 22; offset >= minEndOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("The selected file is not a valid ZIP archive.");

  const entryCount = view.getUint16(endOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(endOffset + 16, true);
  if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff) {
    throw new Error("ZIP64 archives are not supported by this browser uploader.");
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const files: Array<{ filename: string; content: string }> = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("The ZIP archive contains an invalid directory entry.");
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + fileNameLength);
    const path = decoder.decode(nameBytes);
    offset += 46 + fileNameLength + extraLength + commentLength;

    if (!sourceFileName(path)) continue;
    if ((flags & 1) !== 0) throw new Error(`The ZIP archive contains an encrypted source file: ${path}`);
    if (compressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error("ZIP64 archives are not supported by this browser uploader.");
    }
    if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      throw new Error(`The ZIP archive has an invalid file header for ${path}.`);
    }

    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
    let content: Uint8Array;
    if (method === 0) {
      content = compressed;
    } else if (method === 8) {
      content = await inflateRaw(compressed);
    } else {
      throw new Error(`The ZIP archive uses an unsupported compression method for ${path}.`);
    }
    files.push({ filename: path, content: decoder.decode(content) });
  }

  if (files.length === 0) throw new Error("The ZIP archive contains no supported source-code files.");
  return files;
}
