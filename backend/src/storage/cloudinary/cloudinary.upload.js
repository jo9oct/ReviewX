import { v2 as cloudinary } from "cloudinary";
import { cloudinaryConfig } from "../../config/cloudinary.js";

if (cloudinaryConfig.cloudName && cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret) {
  cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret,
    secure: true
  });
}

export async function uploadPDF({ filePath, publicId }) {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.apiSecret) {
    return {
      url: `https://res.cloudinary.com/demo/raw/upload/v1/${publicId || "report"}.pdf`,
      publicId: publicId || `pdf-${Date.now()}`
    };
  }

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "raw",
    folder: cloudinaryConfig.folder || "ReviewX/reports",
    public_id: publicId,
    overwrite: true
  });

  return {
    url: result.secure_url || result.url,
    publicId: result.public_id
  };
}

export default { uploadPDF };
