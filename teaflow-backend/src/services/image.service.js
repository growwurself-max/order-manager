import cloudinary from '../config/cloudinary.js';

const CLOUDINARY_HOST = 'res.cloudinary.com';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// Only allow raster image formats. SVG is rejected because it can carry
// embedded <script> payloads (stored XSS).
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Verify the decoded bytes actually match the declared MIME type.
const hasValidMagicBytes = (mime, buf) => {
  if (buf.length < 12) return false;
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === 'image/gif') {
    return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
  }
  if (mime === 'image/webp') {
    return buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
};

export const uploadImage = async (base64Data, folder = 'teaflow/menu') => {
  try {
    console.log('[Image Upload] Starting upload to folder:', folder);

    // Validate base64 data
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Invalid image data provided');
    }

    const match = base64Data.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
    if (!match) {
      throw new Error('Invalid image format. Expected base64 image data');
    }

    const mime = match[1].toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      throw new Error('Unsupported image type. Only JPG, PNG, WEBP and GIF are allowed');
    }

    const buf = Buffer.from(match[2], 'base64');
    if (buf.length === 0) {
      throw new Error('Image data is empty');
    }
    if (buf.length > MAX_IMAGE_BYTES) {
      throw new Error('Image exceeds the 5MB size limit');
    }
    if (!hasValidMagicBytes(mime, buf)) {
      throw new Error('Image content does not match its declared type');
    }

    const result = await cloudinary.uploader.upload(base64Data, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto', width: 1200, crop: 'limit' },
      ],
      overwrite: false,
    });

    console.log('[Image Upload] Upload successful:', result.public_id);
    return result.secure_url;
  } catch (error) {
    console.error('[Image Upload] Error:', error.message);
    console.error('[Image Upload] Details:', JSON.stringify(error, null, 2));

    if (error.http_code) {
      throw new Error(`Cloudinary upload failed (HTTP ${error.http_code}): ${error.message}`);
    }

    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

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

export const deleteImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes(CLOUDINARY_HOST)) return;

  const publicId = extractPublicId(imageUrl);
  if (!publicId) return;

  try {
    console.log('[Image Delete] Deleting:', publicId);
    await cloudinary.uploader.destroy(publicId);
    console.log('[Image Delete] Delete successful');
  } catch (err) {
    console.error('[Image Delete] Failed to delete Cloudinary image:', publicId, err.message);
    // Don't throw error - deletion failures shouldn't block the main operation
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
