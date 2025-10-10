// Supabase Configuration
// Update these with your actual Supabase project credentials
// Find these at: https://app.supabase.com > Settings > API

export const supabaseConfig = {
  url: 'https://your-project-id.supabase.co',
  anonKey: 'your-anon-key-here'
};

// For development: You can also use these test credentials
// if you don't have a Supabase project yet:
export const developmentConfig = {
  url: 'https://demo.supabase.co',
  anonKey: 'demo-key'
};

// Export the config to use (change this to supabaseConfig when you have real credentials)
export const config = developmentConfig;