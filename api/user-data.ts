import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase URL or Anon Key environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // For simplicity, we'll use a fixed user_id for now.
  // In a real application, this would come from user authentication.
  const fixedUserId = 'user1'; 

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('bookmarks, visited, favorites, user_posts')
        .eq('user_id', fixedUserId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (first time user)
        console.error('Error fetching user data from Supabase:', error);
        return res.status(500).json({ error: 'Failed to fetch user data.' });
      }

      // If no data found, return empty arrays
      if (!data) {
        return res.status(200).json({
          bookmarks: [],
          visited: [],
          favorites: [],
          userPosts: [],
        });
      }

      return res.status(200).json({
        bookmarks: data.bookmarks || [],
        visited: data.visited || [],
        favorites: data.favorites || [],
        userPosts: data.user_posts || [],
      });
    } catch (error) {
      console.error('Unexpected error in GET /api/user-data:', error);
      return res.status(500).json({ error: 'Internal Server Error.' });
    }
  } else if (req.method === 'POST') {
    const { bookmarks, visited, favorites, userPosts } = req.body;

    try {
      const { data, error } = await supabase
        .from('user_data')
        .upsert(
          {
            user_id: fixedUserId,
            bookmarks: bookmarks,
            visited: visited,
            favorites: favorites,
            user_posts: userPosts,
          },
          { onConflict: 'user_id' } // Upsert based on user_id
        );

      if (error) {
        console.error('Error saving user data to Supabase:', error);
        return res.status(500).json({ error: 'Failed to save user data.' });
      }

      return res.status(200).json({ message: 'Data saved to Supabase.' });
    } catch (error) {
      console.error('Unexpected error in POST /api/user-data:', error);
      return res.status(500).json({ error: 'Internal Server Error.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}