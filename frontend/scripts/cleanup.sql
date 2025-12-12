-- EMERGENCY CLEANUP SQL
-- Run this in Supabase SQL Editor to fix service startup issues

-- 1. Drop all triggers on auth.users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name FROM information_schema.triggers
              WHERE event_object_schema = 'auth' AND event_object_table = 'users')
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON auth.users';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- 2. Drop foreign key constraints referencing auth.users
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- 3. Drop all RLS policies
DROP POLICY IF EXISTS "Tenants are publicly viewable" ON tenants;
DROP POLICY IF EXISTS "Licensors can manage tenants" ON tenants;
DROP POLICY IF EXISTS "Locations viewable by tenant" ON locations;
DROP POLICY IF EXISTS "Licensees can manage their locations" ON locations;
DROP POLICY IF EXISTS "Camps are publicly viewable" ON camps;
DROP POLICY IF EXISTS "Licensees can manage their camps" ON camps;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "User roles visible to user" ON user_roles;
DROP POLICY IF EXISTS "Licensors can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Parents can view own athletes" ON athletes;
DROP POLICY IF EXISTS "Parents can manage own athletes" ON athletes;
DROP POLICY IF EXISTS "Licensees can view their athletes" ON athletes;
DROP POLICY IF EXISTS "Users can view own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can create registrations" ON registrations;
DROP POLICY IF EXISTS "Licensees can manage registrations" ON registrations;
DROP POLICY IF EXISTS "Promo codes viewable by tenant" ON promo_codes;
DROP POLICY IF EXISTS "Licensees can manage promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Addons viewable with camp" ON addons;
DROP POLICY IF EXISTS "Licensees can manage addons" ON addons;
DROP POLICY IF EXISTS "Addon variants viewable with addon" ON addon_variants;
DROP POLICY IF EXISTS "Licensees can manage variants" ON addon_variants;
DROP POLICY IF EXISTS "Registration addons viewable with registration" ON registration_addons;
DROP POLICY IF EXISTS "Users can add to own registrations" ON registration_addons;

-- 4. Disable RLS on all tables
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS camps DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promo_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS addons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS addon_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS registration_addons DISABLE ROW LEVEL SECURITY;

-- 5. Drop any custom functions that might be causing issues
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- 6. Verify no remaining triggers on auth schema
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth';

-- Done! Now restart your Supabase project from the dashboard.
