
import { env } from "./env.js";

export const cloudinaryConfig = Object.freeze({
  cloudName:
    env.CLOUDINARY_CLOUD_NAME || "",

  apiKey:
    env.CLOUDINARY_API_KEY || "",

  apiSecret:
    env.CLOUDINARY_API_SECRET || "",

  folder:
    env.CLOUDINARY_REPORT_FOLDER ||
    "code-review/reports"
});

export function assertCloudinaryConfig() {
  const missing = [];

  if (!cloudinaryConfig.cloudName) {
    missing.push("CLOUDINARY_CLOUD_NAME");
  }

  if (!cloudinaryConfig.apiKey) {
    missing.push("CLOUDINARY_API_KEY");
  }

  if (!cloudinaryConfig.apiSecret) {
    missing.push("CLOUDINARY_API_SECRET");
  }

  if (missing.length > 0) {
    throw new Error(
      `Cloudinary configuration is incomplete. Missing: ${missing.join(
        ", "
      )}`
    );
  }
}