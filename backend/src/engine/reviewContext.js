export function createReviewContext({
  code,
  fileName,
  fileExtension,
  language,
  sourceSize,
  parsed,
  companyRules = []
}) {
  if (
    typeof code !== "string" ||
    code.length === 0
  ) {
    throw new TypeError(
      "Review source code is required."
    );
  }

  if (!language) {
    throw new TypeError(
      "Review language is required."
    );
  }

  return Object.freeze({
    code,

    fileName:
      fileName || "source",

    fileExtension:
      fileExtension || "",

    language,

    sourceSize:
      sourceSize ??
      Buffer.byteLength(
        code,
        "utf8"
      ),

    parsed:
      parsed || null,

    companyRules:
      Array.isArray(companyRules)
        ? companyRules
        : []
  });
}