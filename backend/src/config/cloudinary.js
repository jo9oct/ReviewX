import { env } from "./env.js";

export const cloudinaryConfig = Object.freeze({
  cloudName:
    env.cloudinary.cloudName,

  apiKey:
    env.cloudinary.apiKey,

  apiSecret:
    env.cloudinary.apiSecret,

  folder:
    "ReviewX/reports"
});

export function assertCloudinaryConfig() {
  const missing = [];

  if (!cloudinaryConfig.cloudName) {
    missing.push(
      "CLOUDINARY_CLOUD_NAME"
    );
  }

  if (!cloudinaryConfig.apiKey) {
    missing.push(
      "CLOUDINARY_API_KEY"
    );
  }

  if (!cloudinaryConfig.apiSecret) {
    missing.push(
      "CLOUDINARY_API_SECRET"
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Cloudinary configuration is incomplete. Missing: ${missing.join(
        ", "
      )}`
    );
  }
}