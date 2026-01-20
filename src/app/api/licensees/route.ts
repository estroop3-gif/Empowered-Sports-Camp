/**
 * Licensees API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAllLicensees,
  getLicenseeById,
  createLicensee,
  updateLicensee,
  deactivateLicensee,
  activateLicensee,
} from '@/lib/services/licensees'

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'all'
  const id = request.nextUrl.searchParams.get('id')

  try {
    switch (action) {
      case 'all': {
        const { data, error } = await getAllLicensees()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'byId': {
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data, error } = await getLicenseeById(id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, ...data } = body

  try {
    switch (action) {
      case 'create': {
        const { data: licensee, error } = await createLicensee(data)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: licensee })
      }

      case 'update': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { data: licensee, error } = await updateLicensee(id, updates)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data: licensee })
      }

      case 'deactivate': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { success, error } = await deactivateLicensee(id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success })
      }

      case 'activate': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const { success, error } = await activateLicensee(id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
