import React, { useState } from 'react';
import { Photo } from '../types.ts';
import { ImageOff } from 'lucide-react'; // Import an icon for placeholder

interface ResponsiveImageProps {
  photo: Photo;
  className?: string;
  sizes: string;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({ photo, className, sizes }) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state if photo changes
  React.useEffect(() => {
    setImageError(false);
  }, [photo]);

  if (!photo || imageError) {
    // Render a placeholder with an icon if photo is not available or failed to load
    return (
      <div className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 ${className}`}>
        <ImageOff className="w-1/2 h-1/2" />
      </div>
    );
  }

  const srcSet = `${photo.small} 400w, ${photo.medium} 800w, ${photo.large} 1200w`;

  return (
    <img
      src={photo.small}
      srcSet={srcSet}
      sizes={sizes}
      alt={photo.alt}
      className={className}
      loading="lazy"
      onError={() => setImageError(true)} // Set error state on image load failure
    />
  );
};

export default ResponsiveImage;