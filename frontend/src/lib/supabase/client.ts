import { createBrowserClient } from '@supabase/ssr'
import { createMockClient, USE_MOCK } from './mock-client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Skip validation if using mock
if (!USE_MOCK) {
  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please add it to your .env.local file.'
    )
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please add it to your .env.local file.'
    )
  }

  if (!supabaseUrl.startsWith('https://')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must start with https:// ' +
      `Got: ${supabaseUrl}`
    )
  }
}

export function createClient() {
  if (USE_MOCK) {
    console.log('[Supabase] Using mock client - Supabase services are down')
    return createMockClient() as unknown as ReturnType<typeof createBrowserClient>
  }
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!)
}

// Export for debugging purposes
export const config = {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  useMock: USE_MOCK,
}
