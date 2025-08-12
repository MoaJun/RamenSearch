import React from 'react';
import { Photo } from '../types.ts';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  shopName: string;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  photos,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
  shopName
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={handleBackdropClick}>
      <div className="relative max-w-7xl max-h-screen w-full h-full flex items-center justify-center p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          aria-label="モーダルを閉じる"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
              aria-label="前の写真"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
              aria-label="次の写真"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Main Image */}
        <div className="relative flex items-center justify-center w-full h-full">
          <img
            src={photos[currentIndex]?.large || photos[currentIndex]?.medium || ''}
            alt={`${shopName} - ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>

        {/* Image Counter and Info */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg">
          <div className="text-center">
            <div className="text-sm font-medium">{shopName}</div>
            <div className="text-xs text-gray-300 mt-1">
              {currentIndex + 1} / {photos.length}
            </div>
          </div>
        </div>

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex space-x-2 bg-black/50 p-2 rounded-lg max-w-sm overflow-x-auto">
            {photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => {/* Will be handled by parent */}}
                className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                  index === currentIndex ? 'border-white' : 'border-transparent hover:border-white/50'
                }`}
              >
                <img
                  src={photo.small || photo.medium || ''}
                  alt={`${shopName} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoModal;