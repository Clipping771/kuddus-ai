-- API Keys Table for Multiple Providers (OpenAI, Anthropic, Gemini)
-- Stores multiple API keys per user for automatic rotation or standard usage

CREATE TABLE IF NOT EXISTS provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini', 'openrouter', 'groq')),
  api_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'API Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_provider_keys_user_id ON provider_keys(user_id);

-- Index for active keys only by provider
CREATE INDEX IF NOT EXISTS idx_provider_keys_active ON provider_keys(user_id, provider, is_active) WHERE is_active = true;

-- Prevent duplicate keys for same user and provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_keys_unique ON provider_keys(user_id, provider, api_key);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_provider_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_keys_updated_at
BEFORE UPDATE ON provider_keys
FOR EACH ROW
EXECUTE FUNCTION update_provider_keys_updated_at();
