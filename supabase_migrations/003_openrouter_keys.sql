-- OpenRouter API Keys Table
-- Stores multiple API keys per user for automatic rotation

CREATE TABLE IF NOT EXISTS openrouter_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'API Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_openrouter_keys_user_id ON openrouter_keys(user_id);

-- Index for active keys only
CREATE INDEX IF NOT EXISTS idx_openrouter_keys_active ON openrouter_keys(user_id, is_active) WHERE is_active = true;

-- Prevent duplicate keys for same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_openrouter_keys_unique ON openrouter_keys(user_id, api_key);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_openrouter_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_openrouter_keys_updated_at
BEFORE UPDATE ON openrouter_keys
FOR EACH ROW
EXECUTE FUNCTION update_openrouter_keys_updated_at();
