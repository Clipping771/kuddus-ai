-- ============================================================
-- RAG System — pgvector + Document Chunks
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Document store — tracks uploaded files per user/agent
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id TEXT,                    -- optional: link to a custom agent
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Document chunks with embeddings
CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  -- 1536 dimensions = OpenAI text-embedding-3-small
  -- 768 dimensions  = nomic-embed-text (free via Ollama/OpenRouter)
  embedding vector(768),
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rag_documents_user_id
  ON rag_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_id
  ON rag_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_user_id
  ON rag_chunks(user_id);

-- Step 5: IVFFlat index for fast vector similarity search
-- (Create AFTER inserting data for best performance)
-- Run this separately after you have at least 100 chunks:
-- CREATE INDEX ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Step 6: Similarity search function
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(768),
  match_user_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  chunk_index INT,
  document_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.content,
    rc.chunk_index,
    rc.document_id,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM rag_chunks rc
  WHERE
    rc.user_id = match_user_id
    AND rc.embedding IS NOT NULL
    AND 1 - (rc.embedding <=> query_embedding) > match_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 7: Row Level Security
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own documents"
  ON rag_documents FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users manage their own chunks"
  ON rag_chunks FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ============================================================
-- Verify
-- ============================================================
-- SELECT * FROM rag_documents LIMIT 5;
-- SELECT COUNT(*) FROM rag_chunks;
