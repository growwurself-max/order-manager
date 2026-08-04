import cloudinary from '../config/cloudinary.js';

const CLOUDINARY_HOST = 'res.cloudinary.com';

/**
 * Extract Cloudinary public_id from a secure URL.
 */
const extractPublicId = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes(CLOUDINARY_HOST)) return null;

  try {
    const url = new URL(imageUrl);
    const parts = url.pathname.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1 || uploadIndex >= parts.length - 1) return null;

    // Skip version (v123...) and transformation segments (contain commas)
    let startIndex = uploadIndex + 1;
    while (startIndex < parts.length) {
      const segment = parts[startIndex];
      if (/^v\d+$/.test(segment)) {
        startIndex++;
        continue;
      }
      if (segment.includes(',')) {
        startIndex++;
        continue;
      }
      break;
    }

    const publicIdWithExt = parts.slice(startIndex).join('/');
    return publicIdWithExt.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
};

export const uploadImage = async (base64Data, folder = 'teaflow/menu') => {
  const result = await cloudinary.uploader.upload(base64Data, {
    folder,
    resource_type: 'image',
    transformation: [
      { quality: 'auto', fetch_format: 'auto', width: 1200, crop: 'limit' },
    ],
  });
  return result.secure_url;
};

export const deleteImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes(CLOUDINARY_HOST)) return;

  const publicId = extractPublicId(imageUrl);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete Cloudinary image:', publicId, err.message);
  }
};

export const getOptimizedUrl = (url, options = {}) => {
  if (!url || !url.includes(CLOUDINARY_HOST)) return url;

  const { width = 400, height, quality = 'auto', crop = 'fill' } = options;
  const transforms = [`q_${quality}`, `f_auto`, `w_${width}`];
  if (height) {
    transforms.push(`h_${height}`, `c_${crop}`);
  } else {
    transforms.push('c_limit');
  }

  const transformStr = transforms.join(',');

  // Insert transformation after /upload/
  return url.replace('/upload/', `/upload/${transformStr}/`);
};
