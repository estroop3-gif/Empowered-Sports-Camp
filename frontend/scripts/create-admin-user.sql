-- ============================================================================
-- CREATE ADMIN USER: estroop3@gmail.com
-- ============================================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates an HQ Admin user with full system access
-- ============================================================================

-- Step 1: Create the user in auth.users
-- Note: Supabase handles password hashing automatically when using their auth
-- We'll use the auth.users insert with encrypted password

DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'estroop3@gmail.com';

  IF new_user_id IS NOT NULL THEN
    RAISE NOTICE 'User already exists with ID: %', new_user_id;
  ELSE
    -- Create the auth user
    -- Using Supabase's internal function to properly hash the password
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'estroop3@gmail.com',
      crypt('Parkera1bc!', gen_salt('bf')),
      NOW(), -- Email confirmed immediately
      '{"provider": "email", "providers": ["email"]}',
      '{"first_name": "Admin", "last_name": "User"}',
      'authenticated',
      'authenticated',
      NOW(),
      NOW(),
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    RAISE NOTICE 'Created user with ID: %', new_user_id;
  END IF;

  -- Step 2: Create profile
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (new_user_id, 'estroop3@gmail.com', 'Admin', 'User')
  ON CONFLICT (id) DO UPDATE SET
    first_name = 'Admin',
    last_name = 'User',
    updated_at = NOW();

  -- Step 3: Create HQ Admin role
  INSERT INTO user_roles (user_id, role, is_active)
  VALUES (new_user_id, 'hq_admin', true)
  ON CONFLICT (user_id, tenant_id, role) DO UPDATE SET
    is_active = true;

  RAISE NOTICE 'Admin user setup complete!';
END $$;

-- Verify the user was created
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
