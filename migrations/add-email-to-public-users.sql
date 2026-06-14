-- ════════════════════════════════════════════════════════════════
-- STONES V32 — Add email column to public.users
-- Required for circle invitation smart-check (and future features)
-- Date: June 13, 2026
-- ════════════════════════════════════════════════════════════════

-- Step 1: Add the email column (nullable initially, for safe backfill)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Backfill email from auth.users for all existing users
UPDATE public.users pu
SET email = au.email
FROM auth.users au
WHERE pu.id = au.id
  AND pu.email IS NULL;

-- Step 3: Add index for lookups (case-insensitive search common)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(LOWER(email));

-- Step 4: Create trigger to auto-sync email on future user inserts
-- The signup flow inserts to auth.users (via Supabase auth) — we need to copy to public.users
-- However, your app code may already be doing this manually. Let's check first.

-- Step 5: Verify
SELECT 
  pu.id,
  pu.display_name,
  pu.email,
  au.email AS auth_email,
  CASE 
    WHEN pu.email = au.email THEN '✅ synced'
    WHEN pu.email IS NULL THEN '⚠️ missing'
    ELSE '❌ mismatch'
  END AS status
FROM public.users pu
LEFT JOIN auth.users au ON au.id = pu.id
ORDER BY pu.display_name;
