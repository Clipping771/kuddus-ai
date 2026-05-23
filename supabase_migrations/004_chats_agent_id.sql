-- Add agent_id column to chats table
-- This links chats to custom agents and enables cascade delete:
-- when a custom agent is deleted, all its associated chats are automatically deleted.

-- 1. Add the agent_id column (nullable — existing chats have no agent association)
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES custom_agents(id) ON DELETE CASCADE;

-- 2. Index for efficient agent-based queries
CREATE INDEX IF NOT EXISTS idx_chats_agent_id ON chats(agent_id);
