-- Apply in Supabase SQL editor only after reviewing existing production policies.
-- User profiles contain entitlement fields (including pro_status).
-- Authenticated users must not be able to grant themselves Pro.
BEGIN;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Defense in depth: remove table-wide UPDATE permission granted directly
-- to authenticated clients. Privileged service_role maintenance is unaffected.
REVOKE UPDATE ON TABLE public.users FROM authenticated;

COMMIT;

-- Verify with an authenticated non-Pro account:
-- UPDATE public.users SET pro_status = true WHERE id = auth.uid();
-- must not succeed. Profile SELECT should continue to work.
