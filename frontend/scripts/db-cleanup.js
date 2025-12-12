const { Client } = require('pg')

const client = new Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.qdkgmafbjcscrvkikbds',
  password: 'Chibstera1bc!',
  ssl: { rejectUnauthorized: false }
})

async function cleanup() {
  try {
    await client.connect()
    console.log('Connected to database')

    // Drop all custom triggers on auth.users (just in case any remain)
    console.log('Checking for triggers on auth.users...')
    const triggers = await client.query(`
      SELECT trigger_name FROM information_schema.triggers
      WHERE event_object_schema = 'auth' AND event_object_table = 'users'
    `)
    console.log('Triggers found:', triggers.rows)

    for (const row of triggers.rows) {
      console.log(`Dropping trigger: ${row.trigger_name}`)
      await client.query(`DROP TRIGGER IF EXISTS "${row.trigger_name}" ON auth.users`)
    }

    // Drop all RLS policies on public tables
    console.log('\nDropping RLS policies...')
    const tables = ['tenants', 'locations', 'camps', 'profiles', 'user_roles',
                    'athletes', 'registrations', 'promo_codes', 'addons',
                    'addon_variants', 'registration_addons']

    for (const table of tables) {
      const policies = await client.query(`
        SELECT policyname FROM pg_policies WHERE tablename = $1
      `, [table])

      for (const policy of policies.rows) {
        console.log(`Dropping policy ${policy.policyname} on ${table}`)
        await client.query(`DROP POLICY IF EXISTS "${policy.policyname}" ON ${table}`)
      }

      // Disable RLS
      await client.query(`ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY`)
      console.log(`Disabled RLS on ${table}`)
    }

    // Drop foreign key constraints to auth.users
    console.log('\nDropping FK constraints to auth.users...')
    await client.query(`ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey`)
    await client.query(`ALTER TABLE IF EXISTS user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey`)
    console.log('FK constraints dropped')

    // Drop any functions that reference auth schema
    console.log('\nDropping custom functions...')
    await client.query(`DROP FUNCTION IF EXISTS handle_new_user() CASCADE`)
    await client.query(`DROP FUNCTION IF EXISTS update_updated_at() CASCADE`)
    console.log('Functions dropped')

    // Check for any remaining issues
    console.log('\nChecking for remaining triggers...')
    const remainingTriggers = await client.query(`
      SELECT trigger_schema, trigger_name, event_object_schema, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public' OR event_object_schema = 'auth'
    `)
    console.log('Remaining triggers:', remainingTriggers.rows)

    // List all tables to verify state
    console.log('\nCurrent tables:')
    const tableList = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `)
    console.log(tableList.rows.map(r => r.tablename))

    console.log('\n✅ Cleanup complete!')
    console.log('Please restart your Supabase project from the dashboard.')

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}

cleanup()
