/**
 * Cloudinary Upload Helper for React Native (Expo)
 * Uploads images directly to Cloudinary using JSON POST with Base64 payload
 * (Avoids React Native FormDataPart implementation issues)
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'dtcxoncos',
  uploadPreset: 'vettu_preset',
};

/**
 * Upload an image (Base64 data URI or URL) to Cloudinary
 * @param {string} fileData - Base64 data URI (e.g. data:image/jpeg;base64,...)
 * @returns {Promise<string>} - Cloudinary Secure URL (https://res.cloudinary.com/...)
 */
export const uploadImageToCloudinary = async (fileData) => {
  if (!fileData) return null;

  // If already a remote URL (http/https), return directly
  if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
    return fileData;
  }

  try {
    let base64Payload = fileData;
    if (!base64Payload.startsWith('data:image/')) {
      base64Payload = `data:image/jpeg;base64,${fileData}`;
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          file: base64Payload,
          upload_preset: CLOUDINARY_CONFIG.uploadPreset,
        }),
      }
    );

    const data = await response.json();

    if (data.secure_url) {
      return data.secure_url;
    } else {
      console.error('Cloudinary API error:', data);
      throw new Error(data.error?.message || 'Không thể tải ảnh lên Cloudinary');
    }
  } catch (error) {
    console.error('Error in uploadImageToCloudinary:', error);
    throw error;
  }
};

export default {
  uploadImageToCloudinary,
  CLOUDINARY_CONFIG,
};
