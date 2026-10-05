const LANGUAGES = Object.freeze({
  javascript: Object.freeze({
    id: 'javascript',
    extensions: ['.js', '.mjs', '.cjs'],
    parser: 'javascript',
  }),

  typescript: Object.freeze({
    id: 'typescript',
    extensions: ['.ts'],
    parser: 'typescript',
  }),

  tsx: Object.freeze({
    id: 'tsx',
    extensions: ['.tsx'],
    parser: 'tsx',
  }),

  python: Object.freeze({
    id: 'python',
    extensions: ['.py'],
    parser: 'python',
  }),

  java: Object.freeze({
    id: 'java',
    extensions: ['.java'],
    parser: 'java',
  }),

  c: Object.freeze({
    id: 'c',
    extensions: ['.c', '.h'],
    parser: 'c',
  }),

  cpp: Object.freeze({
    id: 'cpp',
    extensions: ['.cc', '.cpp', '.cxx', '.hpp'],
    parser: 'cpp',
  }),

  go: Object.freeze({
    id: 'go',
    extensions: ['.go'],
    parser: 'go',
  }),

  php: Object.freeze({
    id: 'php',
    extensions: ['.php'],
    parser: 'php',
  }),

  csharp: Object.freeze({
    id: 'csharp',
    extensions: ['.cs'],
    parser: 'csharp',
  }),
});

export default LANGUAGES;