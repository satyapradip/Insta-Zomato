const cloudinary = require("cloudinary").v2;
const config = require("../config/index");
const logger = require("../config/logger");

// Initialize Cloudinary using centralized config
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Uploads a video buffer directly to Cloudinary with automatic optimization.
 * @param {Buffer} fileBuffer - The file buffer from multer memoryStorage
 * @param {string} fileName - Unique filename
 * @returns {Promise<Object>} Object containing videoUrl, thumbnailUrl, and publicId
 */
function uploadFile(fileBuffer, fileName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        public_id: fileName,
        folder: "insta-zomato/reels",
        // Cloudinary auto transformations
        transformation: [
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary video upload failed", {
            fileName,
            error: error.message,
          });
          return reject(error);
        }

        // Generate poster thumbnail URL (frame at 0.5s converted to WebP)
        const thumbnailUrl = cloudinary.url(result.public_id, {
          resource_type: "video",
          format: "webp",
          transformation: [
            { start_offset: "0.5", width: 720, height: 1280, crop: "fill" },
          ],
        });

        resolve({
          secure_url: result.secure_url,
          thumbnailUrl: thumbnailUrl || result.secure_url,
          public_id: result.public_id,
          duration: result.duration,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );
    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete a media asset from Cloudinary.
 * @param {string} publicId - Cloudinary public_id
 * @param {string} resourceType - 'video' | 'image'
 */
async function deleteFile(publicId, resourceType = "video") {
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    logger.error("Cloudinary file deletion failed", {
      publicId,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  uploadFile,
  deleteFile,
};
