import path from 'node:path';

import { AppError } from '../utils/errors.js';

const EXTENSION_LANGUAGE_MAP = Object.freeze({
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cc': 'cpp',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.go': 'go',
  '.php': 'php',
  '.cs': 'csharp',
});

const detectLanguageFromPath = (
  filePath,
) => {
  if (
    typeof filePath !== 'string' ||
    !filePath.trim()
  ) {
    throw new AppError({
      code: 'INVALID_FILE_PATH',
      message:
        'A valid file path is required for language detection.',
      statusCode: 400,
    });
  }

  const extension = path
    .extname(filePath)
    .toLowerCase();

  return (
    EXTENSION_LANGUAGE_MAP[extension] ||
    'text'
  );
};

const detectLanguageFromContent = (content) => {
  if (typeof content !== 'string' || !content.trim()) {
    return 'text';
  }

  const trimmed = content.trim();

  // Python indicators (def/class without braces, imports, elif, print without semicolons)
  if (
    /(?:^|\n)\s*(?:def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|class\s+\w+.*:|if\s+__name__\s*==\s*['"]__main__['"]:|elif\s+|print\s*\()/.test(trimmed) &&
    !/[{}]/.test(trimmed)
  ) {
    return 'python';
  }

  // JavaScript/TypeScript indicators
  if (
    /(?:^|\n)\s*(?:import\s+.*?\s+from\s+['"]|export\s+(?:default|const|function|class)|const\s+\w+\s*=|let\s+\w+\s*=|function\s+\w+\s*\(|console\.(?:log|debug|info|error)\s*\()/.test(trimmed)
  ) {
    return /:\s*(?:string|number|boolean|any|unknown)\b/.test(trimmed) ? 'typescript' : 'javascript';
  }

  // Java indicators
  if (
    /(?:^|\n)\s*(?:package\s+[\w.]+|import\s+java\.|public\s+class\s+\w+|public\s+static\s+void\s+main\s*\()/.test(trimmed)
  ) {
    return 'java';
  }

  // C / C++ indicators
  if (/(?:^|\n)\s*#include\s*<[\w.]+>/.test(trimmed)) {
    return 'cpp';
  }

  // Go indicators
  if (/(?:^|\n)\s*(?:package\s+\w+|func\s+\w+\s*\()/.test(trimmed)) {
    return 'go';
  }

  // PHP indicators
  if (/<\?php/.test(trimmed)) {
    return 'php';
  }

  return 'text';
};

const detectLanguage = (file) => {
  if (
    typeof file === 'string'
  ) {
    return detectLanguageFromPath(file);
  }

  if (
    !file ||
    typeof file !== 'object' ||
    typeof file.path !== 'string'
  ) {
    throw new AppError({
      code: 'INVALID_LANGUAGE_INPUT',
      message:
        'A valid file or file path is required for language detection.',
      statusCode: 400,
    });
  }

  const detectedFromPath = detectLanguageFromPath(
    file.path,
  );

  if (
    detectedFromPath === 'text' &&
    typeof file.content === 'string' &&
    file.content.trim()
  ) {
    const detectedFromContent = detectLanguageFromContent(file.content);
    if (detectedFromContent !== 'text') {
      return detectedFromContent;
    }
  }

  return detectedFromPath;
};

const detectLanguages = (files) => {
  if (!Array.isArray(files)) {
    throw new AppError({
      code: 'INVALID_FILE_COLLECTION',
      message:
        'The source file collection is invalid.',
      statusCode: 400,
    });
  }

  return files.map((file) => ({
    path: file.path,
    language: detectLanguage(file),
  }));
};

export {
  EXTENSION_LANGUAGE_MAP,
  detectLanguage,
  detectLanguageFromContent,
  detectLanguageFromPath,
  detectLanguages,
};

export default detectLanguage;