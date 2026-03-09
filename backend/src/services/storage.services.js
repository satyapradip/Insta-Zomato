const cloudinary = require("cloudinary").v2;
const config = require("../config/index");

// Initialize Cloudinary using the centralized config (values come from .env via Zod)
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - The file buffer (from multer memoryStorage)
 * @param {string} fileName - Unique public_id to store on Cloudinary
 * @returns {Promise<Object>} Cloudinary response containing url, public_id, etc.
 */
function uploadFile(fileBuffer, fileName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video", // supports mp4, mov, etc.
        public_id: fileName,
        folder: "insta-zomato",
      },
      (error, result) => {
        if (error) {
          console.error("Error uploading file to Cloudinary:", error);
          return reject(error);
        }
        resolve(result);
      },
    );
    uploadStream.end(fileBuffer);
  });
}

module.exports = {
  uploadFile,
};
