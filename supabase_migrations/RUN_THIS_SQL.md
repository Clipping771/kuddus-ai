# 🚀 OpenRouter Multi-Key System - Setup

## Step 1: Run This SQL in Supabase

1. Go to your Supabase Dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy-paste the SQL below and click **Run**

```sql
-- OpenRouter API Keys Table
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
```

## Step 2: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Step 3: Add Your First API Key

1. Open http://localhost:3000/dashboard
2. Click the **Key icon** (🔑) in the top-right header
3. Click **"Add New Key"**
4. Paste your OpenRouter API key (starts with `sk-or-v1-...`)
5. Give it a label like "Account 1"
6. Click **"Add Key"**

## Step 4: Add More Keys (Optional but Recommended)

- Create 3-5 OpenRouter accounts (use different emails)
- Generate a key from each account at https://openrouter.ai/keys
- Add all keys via Settings page
- System will automatically rotate through them when one hits the 50/day limit

## ✅ Done!

You now have unlimited OpenRouter requests! The system will automatically:
- Try the first key
- If it hits 429 (rate limit), switch to the next key
- Continue rotating through all your keys
- Show clear errors if all keys are exhausted

Check the console logs to see which key is being used:
```
[OpenRouter] ✅ Key ...abc123 → model "deepseek/deepseek-v4-flash:free" OK
```
