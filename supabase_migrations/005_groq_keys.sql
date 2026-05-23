-- Groq API Keys Table
-- Stores multiple Groq API keys per user for automatic rotation

CREATE TABLE IF NOT EXISTS groq_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Groq Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groq_keys_user_id ON groq_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_groq_keys_active ON groq_keys(user_id, is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_groq_keys_unique ON groq_keys(user_id, api_key);

CREATE OR REPLACE FUNCTION update_groq_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_groq_keys_updated_at
BEFORE UPDATE ON groq_keys
FOR EACH ROW
EXECUTE FUNCTION update_groq_keys_updated_at();
