-- ============================================================
-- Memory Scoring Migration
-- Adds importance_score, access_count, last_accessed to user_memory
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add scoring columns to existing user_memory table
ALTER TABLE user_memory
  ADD COLUMN IF NOT EXISTS importance_score FLOAT NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS access_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ DEFAULT NOW();

-- Index for fast score-based retrieval
CREATE INDEX IF NOT EXISTS idx_user_memory_score
  ON user_memory(user_id, importance_score DESC);

-- Index for decay queries
CREATE INDEX IF NOT EXISTS idx_user_memory_last_accessed
  ON user_memory(user_id, last_accessed DESC);

-- Add user_behavior table for adaptive UI
CREATE TABLE IF NOT EXISTS user_behavior (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 1,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  avg_message_length FLOAT DEFAULT 0,
  preferred_tone TEXT DEFAULT 'brutally-honest',
  complexity_level TEXT DEFAULT 'medium'
    CHECK (complexity_level IN ('simple', 'medium', 'complex')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_user_behavior_user_id
  ON user_behavior(user_id);

CREATE INDEX IF NOT EXISTS idx_user_behavior_use_count
  ON user_behavior(user_id, use_count DESC);

ALTER TABLE user_behavior ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own behavior"
  ON user_behavior FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );
