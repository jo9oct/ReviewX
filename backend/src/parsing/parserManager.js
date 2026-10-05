import {
  detectLanguageFromPath
} from '../engine/languageDetector.js';

import {
  parseSource
} from './treeSitter.js';

import {
  buildAst
} from './ast.js';

import {
  hasLanguage
} from './languageRegistry.js';

import {
  AppError
} from '../utils/errors.js';

const parseFile = (
  file
) => {
  if (
    !file ||
    typeof file !== 'object'
  ) {
    throw new AppError({
      code:
        'INVALID_SOURCE_FILE',
      message:
        'The parser received an invalid source file.',
      statusCode: 400,
    });
  }

  if (
    typeof file.path !==
      'string' ||
    !file.path.trim()
  ) {
    throw new AppError({
      code:
        'SOURCE_FILE_PATH_REQUIRED',
      message:
        'The source file path is required.',
      statusCode: 400,
    });
  }

  if (
    typeof file.content !==
      'string'
  ) {
    throw new AppError({
      code:
        'SOURCE_FILE_CONTENT_REQUIRED',
      message:
        'The source file content is required.',
      statusCode: 400,
    });
  }

  const language =
    detectLanguageFromPath(
      file.path
    );

  if (!hasLanguage(language)) {
    return {
      path: file.path,
      language,
      supported: false,
      tree: null,
      ast: null,
    };
  }

  const tree =
    parseSource({
      language,
      source: file.content,
    });

  const ast =
    buildAst(
      tree,
      file.content
    );

  return {
    path: file.path,
    language,
    supported: true,
    tree,
    ast,
  };
};

const parseFiles = (
  files
) => {
  if (!Array.isArray(files)) {
    throw new AppError({
      code:
        'INVALID_FILE_COLLECTION',
      message:
        'The parser requires a source file collection.',
      statusCode: 400,
    });
  }

  const parsedFiles =
    new Map();

  for (const file of files) {
    const parsedFile =
      parseFile(file);

    parsedFiles.set(
      parsedFile.path,
      parsedFile
    );
  }

  return parsedFiles;
};

export {
  parseFile,
  parseFiles,
};

export default parseFiles;