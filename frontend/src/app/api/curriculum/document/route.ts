/**
 * Curriculum Document API
 *
 * GET /api/curriculum/document - Get presigned URL for viewing PDF
 *
 * Query params:
 * - type: 'template' | 'block'
 * - id: The template or block ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import { getTemplateById, getBlockById } from '@/lib/services/curriculum'
import { getDownloadUrl, extractKeyFromUrl } from '@/lib/storage/s3'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // All authenticated users can view curriculum PDFs
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Missing required parameters: type and id' },
        { status: 400 }
      )
    }

    if (type !== 'template' && type !== 'block') {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "template" or "block"' },
        { status: 400 }
      )
    }

    let pdfUrl: string | null = null
    let pdfName: string | null = null

    if (type === 'template') {
      const { data: template, error } = await getTemplateById(id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      pdfUrl = template.pdf_url
      pdfName = template.pdf_name
    } else {
      const { data: block, error } = await getBlockById(id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!block) {
        return NextResponse.json({ error: 'Block not found' }, { status: 404 })
      }
      pdfUrl = block.pdf_url
      pdfName = block.pdf_name
    }

    if (!pdfUrl) {
      return NextResponse.json(
        { error: `No PDF attached to this ${type}` },
        { status: 404 }
      )
    }

    // Extract the S3 key from the document URL
    const key = extractKeyFromUrl(pdfUrl)
    if (!key) {
      return NextResponse.json({ error: 'Invalid document URL' }, { status: 500 })
    }

    // Generate a presigned URL for viewing (1 hour expiry)
    const viewUrl = await getDownloadUrl(key, 3600)

    return NextResponse.json({
      url: viewUrl,
      filename: pdfName || 'document.pdf',
    })
  } catch (error) {
    console.error('[API] GET /api/curriculum/document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
