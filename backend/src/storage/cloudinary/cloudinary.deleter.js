import {
  CLOUDINARY_RESOURCE_TYPES,
} from "./cloudinary.constants.js";
import { getCloudinaryClient } from "./cloudinary.client.js";

export const deleteReport = async ({
  publicId,
}) => {
  if (
    typeof publicId !== "string" ||
    !publicId.trim()
  ) {
    throw new TypeError(
      "Cloudinary public ID is required.",
    );
  }

  const cloudinary = getCloudinaryClient();

  const result =
    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type:
          CLOUDINARY_RESOURCE_TYPES.RAW,
        invalidate: true,
      },
    );

  return {
    publicId,
    result: result.result,
  };
};