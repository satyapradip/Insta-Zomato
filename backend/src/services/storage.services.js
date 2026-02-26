const cloudinary = require("cloudinary").v2;

// Initialize Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
