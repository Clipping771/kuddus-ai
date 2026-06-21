-- ============================================================
-- User Long-Term Memory Table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Create the user_memory table
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' 
    CHECK (category IN ('business', 'preferences', 'context', 'personal', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one value per key per user (enables upsert)
  UNIQUE(user_id, key)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id 
  ON user_memory(user_id);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_user_memory_category 
  ON user_memory(user_id, category);

-- Index for recency sorting
CREATE INDEX IF NOT EXISTS idx_user_memory_updated_at 
  ON user_memory(user_id, updated_at DESC);

-- Row Level Security
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their own memory
-- (service role key bypasses RLS — used by our server-side code)
CREATE POLICY "Users can manage their own memory"
  ON user_memory
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );

-- ============================================================
-- Verify the table was created correctly
-- ============================================================
-- SELECT * FROM user_memory LIMIT 5;
