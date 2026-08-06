import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('Cloudinary Config Loading:');
console.log('Cloud Name:', cloudName ? '✓ Set' : '✗ Missing');
console.log('API Key:', apiKey ? '✓ Set' : '✗ Missing');
console.log('API Secret:', apiSecret ? '✓ Set' : '✗ Missing');

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Cloudinary credentials are missing in environment variables');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export default cloudinary;
