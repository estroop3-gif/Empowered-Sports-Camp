/**
 * Upload API Route
 *
 * Generates presigned URLs for direct client-side uploads to S3.
 * Used by certification uploads and other file upload features.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUploadUrl, STORAGE_FOLDERS } from '@/lib/storage/s3'
import { verifyToken } from '@/lib/auth/cognito-server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using id_token
    const cookieStore = await cookies()
    const idToken = cookieStore.get('id_token')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyToken(idToken)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { filename, contentType, folder } = body

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    // Validate folder if provided
    const validFolders = Object.values(STORAGE_FOLDERS)
    if (folder && !validFolders.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
    }

    // Generate presigned URL
    const { uploadUrl, fileUrl, key } = await getUploadUrl(filename, {
      contentType: contentType || 'application/octet-stream',
      folder: folder || STORAGE_FOLDERS.DOCUMENTS,
    })

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key,
    })
  } catch (error) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
