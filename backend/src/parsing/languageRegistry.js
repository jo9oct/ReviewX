import LANGUAGES from './languages.js';

import javascript from 'tree-sitter-javascript';
import typescript from 'tree-sitter-typescript';
import python from 'tree-sitter-python';
import java from 'tree-sitter-java';
import c from 'tree-sitter-c';
import cpp from 'tree-sitter-cpp';
import go from 'tree-sitter-go';
import php from 'tree-sitter-php';
import csharp from 'tree-sitter-c-sharp';

const byExtension = new Map();

for (const language of Object.values(LANGUAGES)) {
  for (const extension of language.extensions) {
    byExtension.set(
      extension.toLowerCase(),
      language,
    );
  }
}

const languageRegistry = new Map([
  [
    'javascript',
    {
      name: 'javascript',
      parserLanguage: javascript,
    },
  ],

  [
    'typescript',
    {
      name: 'typescript',
      parserLanguage: typescript.typescript,
    },
  ],

  [
    'tsx',
    {
      name: 'tsx',
      parserLanguage: typescript.tsx,
    },
  ],

  [
    'python',
    {
      name: 'python',
      parserLanguage: python,
    },
  ],

  [
    'java',
    {
      name: 'java',
      parserLanguage: java,
    },
  ],

  [
    'c',
    {
      name: 'c',
      parserLanguage: c,
    },
  ],

  [
    'cpp',
    {
      name: 'cpp',
      parserLanguage: cpp,
    },
  ],

  [
    'go',
    {
      name: 'go',
      parserLanguage: go,
    },
  ],

  [
    'php',
    {
      name: 'php',
      parserLanguage: php,
    },
  ],

  [
    'csharp',
    {
      name: 'csharp',
      parserLanguage: csharp,
    },
  ],
]);

export const getLanguageByExtension = (
  extension,
) => {
  if (!extension) {
    return null;
  }

  return (
    byExtension.get(
      String(extension).toLowerCase(),
    ) || null
  );
};

export const getLanguage = (
  languageId,
) => {
  if (!languageId) {
    return null;
  }

  return (
    Object.values(LANGUAGES).find(
      (language) =>
        language.id === languageId,
    ) || null
  );
};

export const getLanguageDefinition = (
  language,
) => {
  if (!language) {
    return null;
  }

  return (
    languageRegistry.get(
      String(language).toLowerCase(),
    ) || null
  );
};

export const hasLanguage = (
  language,
) => {
  if (!language) {
    return false;
  }

  return languageRegistry.has(
    String(language).toLowerCase(),
  );
};

export const getSupportedLanguages = () =>
  [...languageRegistry.keys()];

export const isSupportedLanguage = (
  languageId,
) =>
  Boolean(
    getLanguage(languageId),
  );

export {
  languageRegistry,
};

export default Object.freeze({
  languageRegistry,
  getLanguageByExtension,
  getLanguage,
  getLanguageDefinition,
  hasLanguage,
  getSupportedLanguages,
  isSupportedLanguage,
});