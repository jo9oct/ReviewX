import multer from "multer";
import path from "node:path";

import { uploadConfig } from "../config/upload.js";
import { BadRequestError } from "../utils/errors.js";

const storage = multer.memoryStorage();

function getExtension(filename) {
  return path
    .extname(filename)
    .toLowerCase();
}

function fileFilter(_req, file, callback) {
  const extension = getExtension(
    file.originalname
  );

  if (
    !uploadConfig.allowedExtensions.includes(
      extension
    )
  ) {
    return callback(
      new BadRequestError(
        `Unsupported source-code extension: ${extension || "none"}.`
      )
    );
  }

  if (
    !uploadConfig.allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    return callback(
      new BadRequestError(
        `Unsupported MIME type: ${file.mimetype}.`
      )
    );
  }

  callback(null, true);
}

const upload = multer({
  storage,

  limits: {
    fileSize: uploadConfig.maxFileSize,
    files: uploadConfig.maxFiles,
    fields: 20,
    parts: 21
  },

  fileFilter
});

export function uploadSingleSource(
  req,
  res,
  next
) {
  upload.single("sourceFile")(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      if (
        error instanceof multer.MulterError
      ) {
        if (
          error.code === "LIMIT_FILE_SIZE"
        ) {
          return next(
            new BadRequestError(
              "Uploaded source file exceeds the configured size limit."
            )
          );
        }

        if (
          error.code === "LIMIT_FILE_COUNT"
        ) {
          return next(
            new BadRequestError(
              "Only one source-code file is allowed."
            )
          );
        }

        return next(
          new BadRequestError(
            `Upload failed: ${error.message}`
          )
        );
      }

      return next(error);
    }
  );
}