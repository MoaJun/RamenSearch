
import React from 'react';
import { Photo } from '../types.ts';

interface ResponsiveImageProps {
  photo: Photo;
  className?: string;
  sizes: string;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({ photo, className, sizes }) => {
  if (!photo) {
    // Render a placeholder or nothing if photo is not available
    return <div className={`bg-gray-200 dark:bg-gray-700 ${className}`} />;
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
    />
  );
};

export default ResponsiveImage;
