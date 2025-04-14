// src/testCloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import fs from 'fs';

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const testUpload = async () => {
  try {
    const filePath = 'C:\\Users\\bhaut\\Desktop\\bckend_restro\\Uploads\\1744605360174_R.jpeg'; // From logs
    if (!fs.existsSync(filePath)) {
      console.error('Test file not found at:', filePath);
      return;
    }
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'restro/images',
      public_id: `test_${Date.now()}`,
      resource_type: 'image',
    });
    console.log('Upload successful:', result.secure_url);
  } catch (error) {
    console.error('Upload failed:', {
      message: error.message,
      status: error.http_code,
      response: error.response ? error.response.data : null,
    });
  }
};

testUpload();