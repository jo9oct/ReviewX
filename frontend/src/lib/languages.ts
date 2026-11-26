export const SUPPORTED_LANGUAGES = [
  {
    value: "javascript",
    label: "JavaScript",
    extension: "js",
    mono: "JS",
    color: "text-[#f7df1e]",
  },
  {
    value: "typescript",
    label: "TypeScript",
    extension: "ts",
    mono: "TS",
    color: "text-[#3178c6]",
  },
  { value: "tsx", label: "TypeScript JSX", extension: "tsx", mono: "TSX", color: "text-[#3178c6]" },
  { value: "python", label: "Python", extension: "py", mono: "PY", color: "text-[#4b8bbe]" },
  { value: "java", label: "Java", extension: "java", mono: "JV", color: "text-[#ed8b00]" },
  { value: "c", label: "C", extension: "c", mono: "C", color: "text-[#659ad2]" },
  { value: "cpp", label: "C++", extension: "cpp", mono: "C++", color: "text-[#659ad2]" },
  { value: "go", label: "Go", extension: "go", mono: "GO", color: "text-[#00add8]" },
  { value: "php", label: "PHP", extension: "php", mono: "PHP", color: "text-[#8892be]" },
  { value: "csharp", label: "C#", extension: "cs", mono: "C#", color: "text-[#9b4f96]" },
] as const;

export const SUPPORTED_LANGUAGE_COUNT = SUPPORTED_LANGUAGES.length;
