/**
 * Registration Drafts API
 *
 * POST /api/registration-drafts — Action-based handler
 *   Actions: save, load, delete, mark-completed
 *
 * GET /api/registration-drafts?action=list&email=xxx
 *   List active drafts for a parent email
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  saveDraft,
  loadDraft,
  listDrafts,
  deleteDraft,
  markDraftCompleted,
} from '@/lib/services/registrationDrafts'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'save': {
        if (!data.parentEmail || !data.campId || !data.campName || !data.campSlug || !data.checkoutState || !data.currentStep) {
          return NextResponse.json(
            { error: 'Missing required fields: parentEmail, campId, campName, campSlug, checkoutState, currentStep' },
            { status: 400 }
          )
        }

        const draft = await saveDraft({
          parentEmail: data.parentEmail,
          parentName: data.parentName,
          campId: data.campId,
          campName: data.campName,
          campSlug: data.campSlug,
          tenantId: data.tenantId,
          checkoutState: data.checkoutState,
          currentStep: data.currentStep,
          camperCount: data.camperCount || 1,
          totalEstimate: data.totalEstimate,
        })

        return NextResponse.json({ data: { id: draft.id } })
      }

      case 'load': {
        if (!data.parentEmail || !data.campId) {
          return NextResponse.json(
            { error: 'Missing required fields: parentEmail, campId' },
            { status: 400 }
          )
        }

        const draft = await loadDraft(data.parentEmail, data.campId)
        return NextResponse.json({ data: draft })
      }

      case 'delete': {
        if (!data.id) {
          return NextResponse.json(
            { error: 'Missing required field: id' },
            { status: 400 }
          )
        }

        await deleteDraft(data.id)
        return NextResponse.json({ data: { success: true } })
      }

      case 'mark-completed': {
        if (!data.parentEmail || !data.campId) {
          return NextResponse.json(
            { error: 'Missing required fields: parentEmail, campId' },
            { status: 400 }
          )
        }

        await markDraftCompleted(data.parentEmail, data.campId)
        return NextResponse.json({ data: { success: true } })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Registration drafts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action')
    const email = request.nextUrl.searchParams.get('email')

    switch (action) {
      case 'list': {
        if (!email) {
          return NextResponse.json(
            { error: 'Missing required param: email' },
            { status: 400 }
          )
        }

        const drafts = await listDrafts(email)
        return NextResponse.json({ data: drafts })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Registration drafts GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
