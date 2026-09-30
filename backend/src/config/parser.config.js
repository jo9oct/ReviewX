const parserConfig = Object.freeze({
  defaultLanguage: 'text',

  supportedLanguages: Object.freeze([
    'javascript',
    'typescript',
    'python',
    'java',
    'c',
    'cpp',
    'go',
    'php',
    'csharp'
  ]),

  maxAstNodes: 100000,
  maxTraversalDepth: 1000
});

export default parserConfig;