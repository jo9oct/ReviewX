import multer from 'multer';

import {
  normalizeUploadedFile,
} from './upload.js';

import {
  AppError,
} from '../../utils/errors.js';

const storage =
  multer.memoryStorage();

const upload =
  multer({
    storage,

    limits: {
      files: 100,
      fileSize: 10 * 1024 * 1024,
    },

    fileFilter: (
      req,
      file,
      callback,
    ) => {
      if (
        !file ||
        typeof file.originalname !== 'string'
      ) {
        return callback(
          new AppError({
            code: 'INVALID_UPLOAD',
            message:
              'The uploaded file is invalid.',
            statusCode: 400,
          }),
        );
      }

      return callback(
        null,
        true,
      );
    },
  });

const parseMultipartReview =
  upload.array(
    'source',
    100,
  );

const normalizeMultipartReview =
  (req, res, next) => {
    try {
      if (
        !req.is('multipart/form-data')
      ) {
        return next();
      }

      if (
        !Array.isArray(req.files) ||
        req.files.length === 0
      ) {
        throw new AppError({
          code: 'UPLOAD_FILES_REQUIRED',
          message:
            'At least one source file is required.',
          statusCode: 400,
        });
      }

      const files =
        req.files.map(
          (uploadedFile) => {
            const normalized =
              normalizeUploadedFile(
                uploadedFile,
              );

            return {
              path:
                normalized.path,

              filename:
                normalized.filename,

              content:
                normalized.content,
            };
          },
        );

      const firstFile =
        files[0];

      const body =
        req.body || {};

      const bodyOptions =
        body.options &&
        typeof body.options === 'object' &&
        !Array.isArray(body.options)
          ? body.options
          : {};

      const aiAnalysis =
        normalizeBoolean(
          body['options[aiAnalysis]'] ??
            body.aiAnalysis ??
            bodyOptions.aiAnalysis,
        );

      const aiRemediation =
        normalizeBoolean(
          body['options[aiRemediation]'] ??
            body.aiRemediation ??
            bodyOptions.aiRemediation,
        );

      const advancedAnalysis =
        normalizeBoolean(
          body['options[advancedAnalysis]'] ??
            body.advancedAnalysis ??
            bodyOptions.advancedAnalysis,
        );

      const {
        ['options[aiAnalysis]']:
          ignoredAiAnalysis,

        ['options[aiRemediation]']:
          ignoredAiRemediation,

        ['options[advancedAnalysis]']:
          ignoredAdvancedAnalysis,

        aiAnalysis:
          ignoredPlainAiAnalysis,

        aiRemediation:
          ignoredPlainAiRemediation,

        advancedAnalysis:
          ignoredPlainAdvancedAnalysis,

        options:
          ignoredOptions,

        ...cleanBody
      } = body;

      req.body = {
        ...cleanBody,

        source: {
          type: 'upload',

          filename:
            firstFile.filename,

          files,
        },

        options: {
          aiAnalysis,

          aiRemediation,

          advancedAnalysis,
        },
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };

const normalizeBoolean =
  (value) => {
    if (
      value === undefined
    ) {
      return undefined;
    }

    if (
      typeof value === 'boolean'
    ) {
      return value;
    }

    const normalized =
      String(value)
        .trim()
        .toLowerCase();

    if (
      normalized === 'true'
    ) {
      return true;
    }

    if (
      normalized === 'false'
    ) {
      return false;
    }

    return value;
  };

const handleMultipartError =
  (error, req, res, next) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      let code =
        'UPLOAD_FAILED';

      let message =
        'The file upload failed.';

      if (
        error.code ===
        'LIMIT_FILE_SIZE'
      ) {
        code =
          'UPLOAD_FILE_SIZE_LIMIT_EXCEEDED';

        message =
          'The uploaded file exceeds the maximum allowed size.';
      }

      if (
        error.code ===
        'LIMIT_FILE_COUNT'
      ) {
        code =
          'UPLOAD_FILE_COUNT_LIMIT_EXCEEDED';

        message =
          'The number of uploaded files exceeds the maximum allowed count.';
      }

      if (
        error.code ===
        'LIMIT_UNEXPECTED_FILE'
      ) {
        code =
          'UNEXPECTED_UPLOAD_FIELD';

        message =
          'An unexpected upload field was provided.';
      }

      return next(
        new AppError({
          code,
          message,
          statusCode: 400,
        }),
      );
    }

    return next(error);
  };

export {
  parseMultipartReview,
  normalizeMultipartReview,
  handleMultipartError,
};

export default Object.freeze({
  parseMultipartReview,
  normalizeMultipartReview,
  handleMultipartError,
});