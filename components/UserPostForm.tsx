import React, { useState, useRef } from 'react';
import { UserPost, Photo } from '../types.ts';
import { Camera, Send } from 'lucide-react';
import ResponsiveImage from './ResponsiveImage.tsx';

interface UserPostFormProps {
  placeId: string;
  onAddPost: (post: UserPost) => void;
  showToast: (message: string) => void; // Add this line
}

const UserPostForm: React.FC<UserPostFormProps> = ({ placeId, onAddPost, showToast }) => {
  const [comment, setComment] = useState('');
  const [image, setImage] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        // For uploaded images, we use the same URL for all sizes
        const newPhoto: Photo = {
          small: imageUrl,
          medium: imageUrl,
          large: imageUrl,
          alt: "User uploaded image"
        };
        setImage(newPhoto);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment || !image) {
      showToast('写真とコメントの両方を入力してください。'); // Replaced alert
      return;
    }

    const newPost: UserPost = {
      postId: `post-${Date.now()}`,
      placeId,
      comment,
      image: image,
      createdAt: new Date().toLocaleString('ja-JP'),
      likes: 0,
    };

    onAddPost(newPost);
    setComment('');
    setImage(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    showToast('投稿しました！'); // Success toast
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg my-4">
      <form onSubmit={handleSubmit}>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="ラーメンの感想を投稿..."
          className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-red-500 transition"
          rows={3}
        ></textarea>
        
        {image && (
          <div className="mt-2">
            <ResponsiveImage photo={image} sizes="100px" className="w-24 h-24 object-cover rounded-md" />
          </div>
        )}

        <div className="flex justify-between items-center mt-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
          >
            <Camera className="w-5 h-5 mr-2" />
            <span>写真を選択</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/*"
          />

          <button
            type="submit"
            disabled={!comment || !image}
            className="flex items-center bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow disabled:bg-red-400 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 mr-2" />
            <span>投稿する</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserPostForm;