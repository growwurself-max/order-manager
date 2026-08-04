import { useState } from 'react';
import { getCategoryPlaceholder } from '../utils/categoryPlaceholders';

const CLOUDINARY_HOST = 'res.cloudinary.com';

const getOptimizedCloudinaryUrl = (url, width = 400) => {
  if (!url || !url.includes(CLOUDINARY_HOST)) return url;
  const transforms = `q_auto,f_auto,w_${width},c_limit`;
  return url.replace('/upload/', `/upload/${transforms}/`);
};

export default function ProductImage({
  imageUrl,
  category = 'milk-tea',
  alt = 'Product',
  className = '',
  size = 'md',
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 sm:w-28 sm:h-28',
    lg: 'w-full aspect-[4/3]',
  };

  const placeholder = getCategoryPlaceholder(category);
  const src = error || !imageUrl
    ? placeholder
    : getOptimizedCloudinaryUrl(imageUrl, size === 'lg' ? 600 : 300);

  return (
    <div
      className={`relative overflow-hidden rounded-xl flex-shrink-0 bg-gray-100 ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}
    </div>
  );
}
