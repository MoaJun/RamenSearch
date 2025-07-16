
export interface Photo {
  small: string;
  medium: string;
  large: string;
  alt: string;
}

export interface RamenShop {
  placeId: string;
  name: string;
  photos: Photo[];
  rating: number;
  address: string;
  hours: string;
  website: string;
  twitterUrl?: string;
  reviews: Review[];
  distance: number; // in meters
  keywords: string[];
  isOpenNow: boolean;
  congestion: '混雑' | '普通' | '空席あり' | '不明';
  accessInfo: string;
  menu: { name: string; price: string; }[];
  parkingInfo: string;
}

export interface Review {
  author: string;
  text: string;
  rating: number;
}

export interface UserPost {
  postId: string;
  placeId: string;
  comment: string;
  image: Photo;
  createdAt: string;
  likes: number;
}

export interface ReviewSummaryData {
  goodPoints: string[];
  badPoints: string[];
  tips: string[];
}