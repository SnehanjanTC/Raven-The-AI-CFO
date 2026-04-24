-- Supabase Migration: Raven Chat-First Schema Simplification
-- Created: 2026-04-23
-- Version: 1.0.0
-- Description: Introduces conversations, messages, and usage tables for chat-first AI CFO

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================================
-- TABLE 1: conversations
-- Purpose: Chat conversation threads between user and AI CFO
-- ========================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- ========================================================================
-- TABLE 2: messages
-- Purpose: Individual messages within conversations
-- ========================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  card_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- ========================================================================
-- TABLE 3: usage
-- Purpose: Token usage tracking for billing and metrics
-- ========================================================================
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_user_created ON usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_conversation ON usage(conversation_id);

-- ========================================================================
-- TABLE 4: Update metrics table with source column
-- Purpose: Track source of metric data (manual, csv, computed)
-- ========================================================================
-- Note: This assumes the metrics table already exists from supabase_schema.sql
-- If running independently, uncomment and adjust the ALTER TABLE statement below:
-- ALTER TABLE metrics ADD COLUMN source TEXT CHECK (source IN ('manual', 'csv', 'computed')) DEFAULT 'manual';

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only access their own
CREATE POLICY "Users can read own conversations" ON conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Messages: Users can access messages from their own conversations
CREATE POLICY "Users can read own conversation messages" ON messages FOR SELECT TO authenticated USING (
  conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create messages in own conversations" ON messages FOR INSERT TO authenticated WITH CHECK (
  conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE TO authenticated USING (
  conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
);

-- Usage: Users can only access their own usage records
CREATE POLICY "Users can read own usage" ON usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create usage records" ON usage FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ========================================================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================================================
COMMENT ON TABLE conversations IS 'Stores chat conversation threads between users and the AI CFO. Each conversation is user-scoped and tracks metadata like title and timestamps.';
COMMENT ON TABLE messages IS 'Individual messages within a conversation. Supports user, assistant, and system roles. card_data JSONB field stores rendered UI components and financial metrics.';
COMMENT ON TABLE usage IS 'Token usage tracking for cost monitoring and billing. Tracks input/output tokens per model and conversation for metrics.';

-- ========================================================================
-- END OF MIGRATION
-- ========================================================================
