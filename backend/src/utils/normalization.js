
export function normalizeLineText(
  text
) {
  return String(text)
    .replace(/\t/g, "    ")
    .trimEnd();
}

export function normalizeIdentifier(
  value
) {
  return String(value)
    .trim()
    .replace(/\s+/g, "_");
}

export function normalizeLanguageName(
  language
) {
  return String(language)
    .trim()
    .toLowerCase();
}