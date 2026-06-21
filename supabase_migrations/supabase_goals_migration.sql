-- Goal Engine Migration — Kacha Morich AI
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    original_text TEXT,
    category TEXT DEFAULT 'personal' CHECK (category IN ('career', 'business', 'learning', 'health', 'finance', 'personal', 'other')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    estimated_days INTEGER DEFAULT 30,
    sub_tasks JSONB DEFAULT '[]'::jsonb,
    success_criteria TEXT DEFAULT '',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON user_goals(user_id, status);

-- RLS policies
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
    ON user_goals FOR ALL
    USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
