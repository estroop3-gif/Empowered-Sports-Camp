-- ============================================================================
-- CREATE ADMIN USER: estroop3@gmail.com
-- ============================================================================
-- Run this DIRECTLY in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste this > Run
-- ============================================================================

-- First, check if there's a profile trigger causing issues
-- (This is likely the root cause of the "Database error saving new user")

-- Temporarily disable the trigger if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
    RAISE NOTICE 'Disabled on_auth_user_created trigger';
  END IF;
END $$;

-- Create the user using Supabase's internal function
-- This bypasses the problematic trigger
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'estroop3@gmail.com',
  crypt('Parkera1bc!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Admin", "last_name": "User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'estroop3@gmail.com'
);

-- Get the user ID
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'estroop3@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found after creation';
  END IF;

  RAISE NOTICE 'User ID: %', v_user_id;

  -- Create profile
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (v_user_id, 'estroop3@gmail.com', 'Admin', 'User')
  ON CONFLICT (id) DO UPDATE SET
    first_name = 'Admin',
    last_name = 'User',
    updated_at = NOW();

  RAISE NOTICE 'Profile created';

  -- Delete any existing roles
  DELETE FROM user_roles WHERE user_id = v_user_id;

  -- Create HQ Admin role
  INSERT INTO user_roles (user_id, role, is_active)
  VALUES (v_user_id, 'hq_admin', true);

  RAISE NOTICE 'HQ Admin role assigned';

  -- Also create the identity record for email login
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'estroop3@gmail.com'),
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = v_user_id AND provider = 'email'
  );

  RAISE NOTICE 'Identity created';
END $$;

-- Re-enable the trigger
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
    RAISE NOTICE 'Re-enabled on_auth_user_created trigger';
  END IF;
END $$;

-- Verify the user
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  p.first_name,
  p.last_name,
  ur.role,
  ur.is_active
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'estroop3@gmail.com';
