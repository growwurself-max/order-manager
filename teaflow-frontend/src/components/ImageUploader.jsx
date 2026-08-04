import { useState, useRef, useCallback } from 'react';
import { ImagePlus, Camera, Images, X, RefreshCw } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const convertHeicIfNeeded = async (file) => {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name);

  if (!isHeic) return file;

  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: JPEG_QUALITY });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  return new File([resultBlob], file.name.replace(/\.heic$/i, '.jpg'), {
    type: 'image/jpeg',
  });
};

export default function ImageUploader({
  existingImageUrl = null,
  onImageChange,
  onRemove,
  disabled = false,
}) {
  const [preview, setPreview] = useState(existingImageUrl);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const processFile = useCallback(
    async (file) => {
      if (!file) return;
      setError('');

      if (file.size > MAX_FILE_SIZE) {
        setError('Image must be under 5MB');
        return;
      }

      if (!file.type.startsWith('image/') && !/\.heic$/i.test(file.name)) {
        setError('Please select a valid image file');
        return;
      }

      setProcessing(true);
      try {
        const converted = await convertHeicIfNeeded(file);
        const base64 = await compressImage(converted);
        setPreview(base64);
        onImageChange?.(base64);
      } catch (err) {
        setError(err.message || 'Failed to process image');
      } finally {
        setProcessing(false);
      }
    },
    [onImageChange]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || processing) return;
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [disabled, processing, processFile]
  );

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleRemove = () => {
    setPreview(null);
    setError('');
    onImageChange?.(null);
    onRemove?.();
  };

  const displayUrl = preview || existingImageUrl;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        Product Image <span className="text-gray-400 font-normal">(optional)</span>
      </label>

      {displayUrl ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-orange-200 bg-gray-50">
          <img
            src={displayUrl}
            alt="Product preview"
            className="w-full h-48 sm:h-56 object-cover"
          />
          {processing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex gap-2 justify-center">
            <button
              type="button"
              disabled={disabled || processing}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/90 text-gray-800 rounded-xl text-sm font-semibold hover:bg-white transition disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Replace
            </button>
            <button
              type="button"
              disabled={disabled || processing}
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500/90 text-white rounded-xl text-sm font-semibold hover:bg-red-500 transition disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
            dragOver
              ? 'border-orange-400 bg-orange-50'
              : 'border-gray-200 bg-gray-50 hover:border-orange-300'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {processing ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">Processing image...</p>
            </div>
          ) : (
            <>
              <div className="mx-auto w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                <ImagePlus className="w-7 h-7 text-orange-500" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Drag & drop an image here
              </p>
              <p className="text-xs text-gray-500 mb-4">PNG, JPG, WEBP or HEIC · Max 5MB</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-orange-300 transition min-h-[44px]"
                >
                  <Images className="w-4 h-4" />
                  Gallery
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition min-h-[44px]"
                >
                  <Camera className="w-4 h-4" />
                  Camera
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
