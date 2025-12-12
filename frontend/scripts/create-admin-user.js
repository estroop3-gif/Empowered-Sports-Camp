/**
 * Create Admin User Script
 *
 * Run with: node scripts/create-admin-user.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const ADMIN_EMAIL = 'estroop3@gmail.com'
const ADMIN_PASSWORD = 'Parkera1bc!'
const ADMIN_FIRST_NAME = 'Admin'
const ADMIN_LAST_NAME = 'User'

async function createAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables!')
    process.exit(1)
  }

  // Use anon key for signup
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

  // Use service key for admin operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('Creating admin user...')
  console.log('Email:', ADMIN_EMAIL)
  console.log('')

  try {
    // Try to sign up the user normally first
    console.log('Attempting signup...')
    const { data: signupData, error: signupError } = await supabaseAnon.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          first_name: ADMIN_FIRST_NAME,
          last_name: ADMIN_LAST_NAME,
        }
      }
    })

    let userId

    if (signupError) {
      console.log('Signup error (might already exist):', signupError.message)

      // Try to sign in instead
      console.log('Trying to sign in existing user...')
      const { data: signinData, error: signinError } = await supabaseAnon.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      })

      if (signinError) {
        console.log('Sign in failed:', signinError.message)

        // List users with admin API
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = listData?.users?.find(u => u.email === ADMIN_EMAIL)

        if (existingUser) {
          userId = existingUser.id
          console.log('Found existing user:', userId)

          // Update their password
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: ADMIN_PASSWORD,
          })
          console.log('Password reset')
        } else {
          console.error('Could not find or create user')
          process.exit(1)
        }
      } else {
        userId = signinData.user.id
        console.log('Signed in existing user:', userId)
      }
    } else {
      userId = signupData.user?.id

      if (!userId) {
        console.log('No user ID returned, checking if confirmation needed...')
        console.log('Signup response:', JSON.stringify(signupData, null, 2))

        // User might need confirmation - let's confirm them via admin API
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
        const newUser = listData?.users?.find(u => u.email === ADMIN_EMAIL)

        if (newUser) {
          userId = newUser.id
          // Confirm their email
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            email_confirm: true,
          })
          console.log('User confirmed via admin API')
        }
      } else {
        console.log('User signed up:', userId)
      }
    }

    if (!userId) {
      console.error('Failed to get user ID')
      process.exit(1)
    }

    // Now confirm the email via admin API
    console.log('Confirming email...')
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })
    if (confirmError) {
      console.log('Confirm error (might already be confirmed):', confirmError.message)
    }

    // Create profile
    console.log('Setting up profile...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: ADMIN_EMAIL,
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
      }, { onConflict: 'id' })

    if (profileError) {
      console.log('Profile error:', profileError.message)
      // Try insert
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: ADMIN_EMAIL,
          first_name: ADMIN_FIRST_NAME,
          last_name: ADMIN_LAST_NAME,
        })
      if (insertError && !insertError.message.includes('duplicate')) {
        console.error('Profile insert error:', insertError.message)
      }
    }
    console.log('Profile ready')

    // Assign HQ Admin role
    console.log('Assigning HQ Admin role...')

    // Delete existing roles first
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'hq_admin',
        is_active: true,
      })

    if (roleError) {
      console.log('Role error:', roleError.message)
    } else {
      console.log('HQ Admin role assigned')
    }

    console.log('')
    console.log('========================================')
    console.log('Admin user setup complete!')
    console.log('========================================')
    console.log('')
    console.log('Login at: http://localhost:3000/login')
    console.log('Email:', ADMIN_EMAIL)
    console.log('Password:', ADMIN_PASSWORD)
    console.log('')
    console.log('This user has HQ Admin access (/admin)')
    console.log('========================================')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createAdminUser()
