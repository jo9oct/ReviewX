import {
  CLOUDINARY_DEFAULTS,
  CLOUDINARY_RESOURCE_TYPES,
} from "./cloudinary.constants.js";

import {
  getCloudinaryClient,
} from "./cloudinary.client.js";

import environment from "../../config/environment.js";

const sanitizePublicIdPart = (
  value,
) =>
  String(value || "")
    .trim()
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    )
    .replace(
      /^-|-$/g,
      "",
    );

const getExtension = (
  format,
) => {
  if (format === "html") {
    return "html";
  }

  if (format === "pdf") {
    return "pdf";
  }

  return "json";
};

export const buildReportPublicId = ({
  reviewId,
  format,
}) => {
  const safeReviewId =
    sanitizePublicIdPart(
      reviewId,
    );

  if (!safeReviewId) {
    throw new Error(
      "A valid review ID is required for report storage.",
    );
  }

  const extension =
    getExtension(format);

  const folder =
    environment.cloudinary.folder ||
    CLOUDINARY_DEFAULTS.REPORT_FOLDER;

  return `${folder}/${safeReviewId}.${extension}`;
};

const createUploadData = (
  content,
  format,
) => {
  const isBuffer =
    Buffer.isBuffer(content);

  if (isBuffer) {
    return `data:application/pdf;base64,${content.toString(
      "base64",
    )}`;
  }

  if (
    typeof content !== "string"
  ) {
    throw new TypeError(
      "Report content must be a string or Buffer.",
    );
  }

  const mimeType =
    format === "html"
      ? "text/html"
      : "application/json";

  return `data:${mimeType};base64,${Buffer.from(
    content,
    "utf8",
  ).toString("base64")}`;
};

export const uploadReport =
  async ({
    reviewId,
    format,
    content,
  }) => {
    const cloudinary =
      getCloudinaryClient();

    const publicId =
      buildReportPublicId({
        reviewId,
        format,
      });

    const dataUri =
      createUploadData(
        content,
        format,
      );

    const result =
      await cloudinary.uploader.upload(
        dataUri,
        {
          public_id:
            publicId,

          resource_type:
            CLOUDINARY_RESOURCE_TYPES.RAW,

          overwrite: true,

          invalidate: true,

          use_filename: false,
        },
      );

    return {
      publicId:
        result.public_id,

      resourceType:
        result.resource_type,

      secureUrl:
        result.secure_url,

      bytes:
        result.bytes,

      format,
    };
  };