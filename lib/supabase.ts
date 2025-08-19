/**
 * Supabase Client Configuration
 * Manages connection to Supabase database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table names
export const TABLES = {
  FAVORITES: 'favorites',
  VISIT_HISTORY: 'visit_history'
} as const;

// Type definitions for Supabase tables
export interface DatabaseFavorite {
  id: string;
  user_id: string;
  place_id: string;
  name: string;
  address: string;
  rating: number;
  saved_at: string;
  visit_count: number;
  last_visit: string | null;
  personal_notes: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface DatabaseVisitHistory {
  id: string;
  user_id: string;
  place_id: string;
  shop_name: string;
  visit_date: string;
  rating: number | null;
  notes: string | null;
  photos: string[] | null;
  created_at: string;
}