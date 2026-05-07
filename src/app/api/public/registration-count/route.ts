import { NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const count = await prisma.registration.count({
      where: {
        status: 'confirmed',
      },
    })

    return NextResponse.json(
      { count },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch {
    return NextResponse.json({ count: 0 }, { status: 500 })
  }
}
