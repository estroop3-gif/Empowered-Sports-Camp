import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Test 1: Check if we can reach Supabase
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(1)

    if (tenantsError) {
      return NextResponse.json({
        success: false,
        error: tenantsError.message,
        hint: tenantsError.hint,
        code: tenantsError.code,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection working!',
      config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      testData: {
        tenantsFound: tenants?.length ?? 0,
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
