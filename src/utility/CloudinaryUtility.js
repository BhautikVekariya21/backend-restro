import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import fs from 'fs';

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (filePath, originalName, retries = 3) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await cloudinary.uploader.upload(
          filePath,
          {
            folder: 'restro/images',
            public_id: `${Date.now()}_${originalName.split('.')[0]}`,
            resource_type: 'image',
          }
        );
        console.log(`Uploaded ${originalName} to Cloudinary: ${result.secure_url}`);
        return result.secure_url;
      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${originalName}: ${error.message}`);
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  } catch (error) {
    console.error(`Cloudinary upload error for ${originalName}:`, {
      message: error.message,
      status: error.http_code,
      response: error.response ? error.response.data : null,
    });
    throw new Error(`Cloudinary upload failed after ${retries} attempts: ${error.message}`);
  }
};

export const deleteLocalFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Failed to delete local file ${filePath}: ${err.message}`);
    } else {
      console.log(`Deleted local file: ${filePath}`);
    }
  });
};