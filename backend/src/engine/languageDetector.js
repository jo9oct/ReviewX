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

  return detectLanguageFromPath(
    file.path,
  );
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
    language:
      detectLanguageFromPath(file.path),
  }));
};

export {
  EXTENSION_LANGUAGE_MAP,
  detectLanguage,
  detectLanguageFromPath,
  detectLanguages,
};

export default detectLanguage;