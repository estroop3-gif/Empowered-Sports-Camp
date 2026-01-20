/**
 * CIT Certification Upload API
 *
 * POST /api/cit/certifications/upload - Get presigned URL for uploading certification document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { getUploadUrl, STORAGE_FOLDERS } from '@/lib/storage/s3'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['cit_volunteer', 'hq_admin']
    const userRole = user.role?.toLowerCase() || ''

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { filename, contentType, documentType } = body

    if (!filename || !contentType || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, contentType, documentType' },
        { status: 400 }
      )
    }

    // Validate content type (only allow PDFs and images)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and image files are allowed.' },
        { status: 400 }
      )
    }

    // Create folder path: certifications/[userId]/[documentType]
    const folder = `${STORAGE_FOLDERS.CERTIFICATIONS}/${user.id}/${documentType}`

    const { uploadUrl, fileUrl, key } = await getUploadUrl(filename, {
      contentType,
      folder,
      expiresIn: 600, // 10 minutes to complete upload
    })

    return NextResponse.json({
      data: {
        uploadUrl,
        fileUrl,
        key,
      },
    })
  } catch (error) {
    console.error('[API] POST /api/cit/certifications/upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
