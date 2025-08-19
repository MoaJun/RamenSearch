
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
  lat: number;
  lng: number;
  hours: string;
  website: string;
  twitterUrl?: string;
  instagramUrl?: string;
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
  time?: number; // Unix timestamp
  relative_time_description?: string; // "1週間前"等の相対表記
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

export interface FavoriteShop {
  id?: string; // UUID for Supabase
  user_id?: string; // User identifier for Supabase
  placeId: string; // place_id in Supabase
  name: string;
  address: string;
  rating: number;
  savedAt: Date; // saved_at in Supabase
  personal_notes?: string; // renamed from personalNotes for Supabase compatibility
  visitCount?: number; // visit_count in Supabase
  lastVisit?: Date; // last_visit in Supabase
  tags?: string[];
  created_at?: Date; // Supabase timestamp
}

export interface VisitHistory {
  id?: string; // UUID for Supabase
  user_id?: string; // User identifier for Supabase
  placeId: string; // place_id in Supabase
  shop_name?: string; // Added for Supabase compatibility
  visitDate: Date; // visit_date in Supabase
  rating?: number;
  notes?: string; // renamed from personalReview for Supabase compatibility
  photos?: string[];
  created_at?: Date; // Supabase timestamp
  // Removed: spend (not in Supabase table)
}