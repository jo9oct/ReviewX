import { AppError } from '../utils/errors.js';

const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const sanitizeText = (value) => {

  if (typeof value !== 'string') {

    return value;

  }

  return value.replace(

    CONTROL_CHARACTER_PATTERN,

    '',

  );

};

const sanitizePath = (value) => {

  if (typeof value !== 'string') {

    return value;

  }

  return sanitizeText(value)

    .replaceAll('\\\\', '/')

    .replace(/^\/+/, '');

};

const sanitizeProjectName = (value) => {

  if (typeof value !== 'string') {

    throw new AppError({

      code: 'INVALID_PROJECT_NAME',

      message: 'The project name must be a string.',

      statusCode: 400,

    });

  }

  const sanitized =

    sanitizeText(value).trim();

  if (!sanitized) {

    throw new AppError({

      code: 'INVALID_PROJECT_NAME',

      message: 'The project name cannot be empty.',

      statusCode: 400,

    });

  }

  return sanitized;

};

const sanitizeSourceText = (value) => {

  if (typeof value !== 'string') {

    throw new AppError({

      code: 'INVALID_SOURCE_CONTENT',

      message: 'The source content must be text.',

      statusCode: 400,

    });

  }

  return sanitizeText(value);

};

export {

  sanitizeText,

  sanitizePath,

  sanitizeProjectName,

  sanitizeSourceText,

};