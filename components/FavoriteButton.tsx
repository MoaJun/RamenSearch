import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { RamenShop } from '../types';
import { favoritesService } from '../services/favoritesService';

interface FavoriteButtonProps {
  shop: RamenShop;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showLabel?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  shop,
  size = 'medium',
  className = '',
  showLabel = false
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Size configurations
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-10 h-10'
  };

  const buttonSizeClasses = {
    small: 'p-1',
    medium: 'p-2',
    large: 'p-3'
  };

  useEffect(() => {
    checkFavoriteStatus();
  }, [shop.placeId]);

  const checkFavoriteStatus = async () => {
    try {
      const favorite = await favoritesService.isFavorite(shop.placeId);
      setIsFavorite(favorite);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click events
    
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (isFavorite) {
        await favoritesService.removeFromFavorites(shop.placeId);
        setIsFavorite(false);
      } else {
        await favoritesService.addToFavorites(shop);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Show user-friendly error message
      alert('お気に入りの更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`
        ${buttonSizeClasses[size]}
        inline-flex items-center justify-center
        rounded-full
        transition-all duration-200
        ${isFavorite 
          ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
          : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
        ${className}
      `}
      title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
      aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
    >
      <Heart 
        className={`${sizeClasses[size]} ${isFavorite ? 'fill-current' : ''}`}
      />
      {showLabel && (
        <span className="ml-1 text-sm font-medium">
          {isFavorite ? 'お気に入り' : 'お気に入りに追加'}
        </span>
      )}
    </button>
  );
};

export default FavoriteButton;