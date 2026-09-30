import { v2 as cloudinary } from "cloudinary";

import environment from "../../config/environment.js";

let configured = false;

export const configureCloudinary = () => {
  if (configured) {
    return cloudinary;
  }

  if (
    !environment.cloudinary.cloudName ||
    !environment.cloudinary.apiKey ||
    !environment.cloudinary.apiSecret
  ) {
    throw new Error(
      "Cloudinary configuration is incomplete.",
    );
  }

  cloudinary.config({
    cloud_name: environment.cloudinary.cloudName,
    api_key: environment.cloudinary.apiKey,
    api_secret: environment.cloudinary.apiSecret,
    secure: environment.cloudinary.secure,
  });

  configured = true;

  return cloudinary;
};

export const getCloudinaryClient = () =>
  configureCloudinary();