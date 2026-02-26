// Use the official @imagekit/nodejs SDK (v7+)
const { ImageKit } = require("@imagekit/nodejs");

// Initialize ImageKit with credentials from environment variables
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Uploads a file buffer to ImageKit.
 * @param {Buffer} fileBuffer - The file buffer (from multer memoryStorage)
 * @param {string} fileName - Unique file name to store on ImageKit
 * @returns {Promise<Object>} ImageKit response containing url, fileId, etc.
 */
async function uploadFile(fileBuffer, fileName) {
  try {
    // In @imagekit/nodejs v7, upload lives under the .files sub-resource
    const response = await imagekit.files.upload({
      file: fileBuffer,
      fileName: fileName,
    });
    return response;
  } catch (error) {
    console.error("Error uploading file to ImageKit:", error);
    throw error;
  }
}

module.exports = {
  uploadFile,
};
