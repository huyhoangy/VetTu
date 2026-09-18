/**
 * Cloudinary Upload Helper for React Native (Expo)
 * Uploads images directly to Cloudinary using Unsigned Upload Preset
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'dtcxoncos',
  uploadPreset: 'vettu_preset', // Tên upload preset (unsigned) bạn tạo trên Cloudinary
  folder: 'VetTu/Image_CongDong',
};

/**
 * Upload an image URI from Expo ImagePicker to Cloudinary
 * @param {string} imageUri - Local URI (e.g. file:///... or ph://...)
 * @returns {Promise<string>} - Cloudinary Secure URL (https://res.cloudinary.com/...)
 */
export const uploadImageToCloudinary = async (imageUri) => {
  if (!imageUri) return null;

  // If already a remote URL (http/https), return directly
  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    return imageUri;
  }

  try {
    const filename = imageUri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase()}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    });
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);
    formData.append('folder', CLOUDINARY_CONFIG.folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const data = await response.json();

    if (data.secure_url) {
      return data.secure_url;
    } else {
      console.warn('Cloudinary upload error response:', data);
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
