-- Migration 52: User management columns (is_blocked, deleted_at)
-- Adds columns for admin user management (block/unblock/soft-delete)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON public.users(is_blocked) WHERE is_blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.users.is_blocked IS 'Admin can block a user from accessing the app';
COMMENT ON COLUMN public.users.deleted_at IS 'Soft delete timestamp - user is considered deleted if set';
