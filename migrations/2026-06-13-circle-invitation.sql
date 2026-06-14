-- ════════════════════════════════════════════════════════════════
-- STONES V32 — Circle Invitations via Email
-- Adds circle_invitations table for sending email-based invitations
-- to non-Stones users (and existing users via email path).
-- Date: June 13, 2026
-- ════════════════════════════════════════════════════════════════

-- Step 1: Create the circle_invitations table
CREATE TABLE IF NOT EXISTS circle_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id       UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  invited_email   TEXT NOT NULL,
  invited_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending',
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ
);

-- Step 2: CHECK constraint for valid status values
ALTER TABLE circle_invitations DROP CONSTRAINT IF EXISTS circle_invitations_status_check;
ALTER TABLE circle_invitations ADD CONSTRAINT circle_invitations_status_check
  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));

-- Step 3: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_circle_invitations_token ON circle_invitations(token);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_email ON circle_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_circle ON circle_invitations(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_inviter_recent ON circle_invitations(invited_by, created_at DESC);

-- Step 4: Index for the rate-limit check (5/day per inviter)
-- This helps the daily count query stay fast even as the table grows

-- Step 5: Verify
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'circle_invitations'
ORDER BY ordinal_position;