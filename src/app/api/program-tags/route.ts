/**
 * Program Tags API
 *
 * GET  /api/program-tags          — public: active tags for filter dropdowns
 * POST /api/program-tags          — hq_admin: create tag
 * PUT  /api/program-tags?id=xxx   — hq_admin: update tag
 * DELETE /api/program-tags?id=xxx — hq_admin: delete tag (fails if in use)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import {
  fetchActiveProgramTags,
  fetchAllProgramTags,
  createProgramTag,
  updateProgramTag,
  deleteProgramTag,
} from '@/lib/services/program-tags'

export async function GET(request: NextRequest) {
  try {
    const includeAll = request.nextUrl.searchParams.get('all') === '1'

    if (includeAll) {
      // Admin view — includes inactive + camp counts
      const user = await getAuthenticatedUserFromRequest(request)
      if (!user || user.role?.toLowerCase() !== 'hq_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const data = await fetchAllProgramTags()
      return NextResponse.json({ data })
    }

    // Public — active tags only
    const data = await fetchActiveProgramTags()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[program-tags GET]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user || user.role?.toLowerCase() !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const tag = await createProgramTag({
      name: body.name.trim(),
      slug: body.slug?.trim() || undefined,
      description: body.description?.trim() || undefined,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    })

    return NextResponse.json({ data: tag }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A tag with that slug already exists' }, { status: 409 })
    }
    console.error('[program-tags POST]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user || user.role?.toLowerCase() !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query param required' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.slug !== undefined) updateData.slug = body.slug.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder)
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

    const tag = await updateProgramTag(id, updateData)
    return NextResponse.json({ data: tag })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[program-tags PUT]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user || user.role?.toLowerCase() !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query param required' }, { status: 400 })
    }

    await deleteProgramTag(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[program-tags DELETE]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
