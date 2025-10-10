import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Replace these with your actual Supabase credentials
// You can find these in your Supabase Dashboard > Settings > API
const supabaseUrl = 'YOUR_SUPABASE_URL'; // e.g., 'https://xyz.supabase.co'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // Your anon key

// Temporary development credentials check
if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('⚠️  Please update your Supabase credentials in src/services/supabase.js');
  console.log('Find your credentials at: https://app.supabase.com > Settings > API');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);