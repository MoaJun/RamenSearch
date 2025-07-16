
import React, { useState } from 'react';
import { UserPost } from '../types.ts';
import { Heart } from 'lucide-react';
import ResponsiveImage from './ResponsiveImage.tsx';

interface UserPostListProps {
  posts: UserPost[];
}

const UserPostItem: React.FC<{ post: UserPost }> = ({ post }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes);

    const handleLike = () => {
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
        setIsLiked(!isLiked);
    }
    
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <ResponsiveImage photo={post.image} sizes="(max-width: 768px) 100vw, 50vw" className="w-full h-48 object-cover rounded-md mb-3" />
            <p className="text-gray-800 dark:text-gray-200 mb-3">{post.comment}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span>{post.createdAt}</span>
                <button onClick={handleLike} className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-500">
                    <Heart className={`w-5 h-5 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400'}`} fill={isLiked ? 'currentColor' : 'none'}/>
                    <span>{likeCount}</span>
                </button>
            </div>
        </div>
    );
};


const UserPostList: React.FC<UserPostListProps> = ({ posts }) => {
  if (posts.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-4">まだ投稿がありません。一番乗りで投稿しよう！</p>;
  }

  return (
    <div className="space-y-4 mt-4">
      {posts.map(post => (
        <UserPostItem key={post.postId} post={post} />
      ))}
    </div>
  );
};

export default UserPostList;
