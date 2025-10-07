# Supabase Setup Guide

This project uses Supabase for authentication and database. Follow these steps to set up your database:

## 1. Database Schema

Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  role text NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

## 2. Enable Email Authentication

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Settings
3. Make sure "Enable Email Signup" is turned ON
4. Optionally disable "Email Confirmations" for easier testing (turn it back on for production)

## 3. Environment Variables

Your `.env` file should already have:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 4. Testing

1. Start the development server: `npm run dev`
2. Navigate to `/signup.html` to create a test account
3. Log in at `/login.html`
4. The navigation should show "Logout" when authenticated

## Features Implemented

- User signup with profile creation
- Email/password login
- Secure logout
- Theme toggle (dark/light mode)
- Row Level Security for data protection
- Responsive design
