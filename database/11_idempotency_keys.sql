-- Migration: Create Idempotency Keys table (Audit A19)
-- Used to prevent duplicate transactions (bookings, payments) if a request is retried.

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    request_path TEXT NOT NULL,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
    UNIQUE(user_id, idempotency_key)
);

-- Index for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- RLS Policies
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own idempotency keys
CREATE POLICY "Users can view own idempotency keys"
ON idempotency_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Cleanup function to be run periodically
CREATE OR REPLACE FUNCTION delete_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
    DELETE FROM idempotency_keys WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
