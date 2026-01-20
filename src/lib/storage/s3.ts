/**
 * AWS S3 Storage Utilities
 *
 * Handles file uploads, downloads, and presigned URL generation.
 * Uses the AWS SDK v3 for S3 operations.
 *
 * Usage:
 * 1. Client-side: Request a presigned URL from /api/upload
 * 2. Upload directly to S3 using the presigned URL
 * 3. Store the resulting file URL in the database
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Singleton S3 client
let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-2'
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.APP_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.APP_SECRET_ACCESS_KEY

    s3Client = new S3Client({
      region,
      credentials: accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
          }
        : undefined, // Use default credential chain (IAM role, environment, etc.)
    })
  }
  return s3Client
}

function getBucketName(): string {
  const bucket = process.env.S3_BUCKET_NAME
  if (!bucket) {
    throw new Error('S3_BUCKET_NAME environment variable is not set')
  }
  return bucket
}

// ============================================================================
// TYPES
// ============================================================================

export interface UploadOptions {
  /** Content type of the file */
  contentType?: string
  /** Folder path within the bucket (e.g., 'images', 'certifications') */
  folder?: string
  /** Make the file publicly readable */
  isPublic?: boolean
  /** Custom metadata to attach to the object */
  metadata?: Record<string, string>
}

export interface PresignedUrlOptions {
  /** Content type for uploads */
  contentType?: string
  /** Folder path within the bucket */
  folder?: string
  /** URL expiration time in seconds (default: 3600 = 1 hour) */
  expiresIn?: number
}

export interface FileInfo {
  key: string
  url: string
  size?: number
  contentType?: string
  lastModified?: Date
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

/**
 * Generate a presigned URL for uploading a file directly from the client.
 * The client can then PUT the file to this URL.
 */
export async function getUploadUrl(
  filename: string,
  options: PresignedUrlOptions = {}
): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  const { contentType = 'application/octet-stream', folder = '', expiresIn = 3600 } = options

  const bucket = getBucketName()
  const client = getS3Client()

  // Generate a unique key with optional folder prefix
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = folder
    ? `${folder}/${timestamp}-${randomId}-${sanitizedFilename}`
    : `${timestamp}-${randomId}-${sanitizedFilename}`

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn })

  // Construct the public URL (assuming public read access or CloudFront)
  const region = process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-2'
  const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`

  return { uploadUrl, fileUrl, key }
}

/**
 * Upload a file directly from the server (for server-side operations).
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  options: UploadOptions = {}
): Promise<FileInfo> {
  const {
    contentType = 'application/octet-stream',
    folder = '',
    isPublic = true,
    metadata = {},
  } = options

  const bucket = getBucketName()
  const client = getS3Client()

  // Generate a unique key
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = folder
    ? `${folder}/${timestamp}-${randomId}-${sanitizedFilename}`
    : `${timestamp}-${randomId}-${sanitizedFilename}`

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: isPublic ? 'public-read' : 'private',
    Metadata: metadata,
  })

  await client.send(command)

  const region = process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-2'
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`

  return {
    key,
    url,
    size: buffer.length,
    contentType,
  }
}

// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

/**
 * Generate a presigned URL for downloading a private file.
 */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const bucket = getBucketName()
  const client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn })
}

/**
 * Download a file from S3 (returns the buffer).
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const bucket = getBucketName()
  const client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const response = await client.send(command)

  if (!response.Body) {
    throw new Error('No file body returned from S3')
  }

  // Convert the stream to a buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// ============================================================================
// DELETE FUNCTIONS
// ============================================================================

/**
 * Delete a file from S3.
 */
export async function deleteFile(key: string): Promise<void> {
  const bucket = getBucketName()
  const client = getS3Client()

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  await client.send(command)
}

/**
 * Delete multiple files from S3 by extracting the key from URLs.
 */
export async function deleteFileByUrl(url: string): Promise<void> {
  const key = extractKeyFromUrl(url)
  if (key) {
    await deleteFile(key)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract the S3 key from a full S3 URL.
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    // Remove leading slash
    return urlObj.pathname.substring(1)
  } catch {
    return null
  }
}

/**
 * Check if a file exists in S3.
 */
export async function fileExists(key: string): Promise<boolean> {
  const bucket = getBucketName()
  const client = getS3Client()

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })
    await client.send(command)
    return true
  } catch {
    return false
  }
}

/**
 * List files in a folder.
 */
export async function listFiles(
  folder: string,
  maxKeys: number = 100
): Promise<FileInfo[]> {
  const bucket = getBucketName()
  const client = getS3Client()
  const region = process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-2'

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: folder.endsWith('/') ? folder : `${folder}/`,
    MaxKeys: maxKeys,
  })

  const response = await client.send(command)

  return (response.Contents || []).map((item) => ({
    key: item.Key || '',
    url: `https://${bucket}.s3.${region}.amazonaws.com/${item.Key}`,
    size: item.Size,
    lastModified: item.LastModified,
  }))
}

/**
 * Get file metadata.
 */
export async function getFileInfo(key: string): Promise<FileInfo | null> {
  const bucket = getBucketName()
  const client = getS3Client()
  const region = process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-2'

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })
    const response = await client.send(command)

    return {
      key,
      url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
    }
  } catch {
    return null
  }
}

// ============================================================================
// FOLDER CONSTANTS
// ============================================================================

/** Standard folders for organizing uploads */
export const STORAGE_FOLDERS = {
  /** Profile avatars */
  AVATARS: 'avatars',
  /** Athlete profile photos */
  ATHLETE_PHOTOS: 'athletes',
  /** Camp images */
  CAMP_IMAGES: 'camps',
  /** Shop product images */
  PRODUCT_IMAGES: 'products',
  /** Volunteer certifications (CPR, first aid, etc.) */
  CERTIFICATIONS: 'certifications',
  /** LMS course materials */
  LMS_CONTENT: 'lms',
  /** General documents */
  DOCUMENTS: 'documents',
  /** Tenant logos */
  TENANT_LOGOS: 'tenants',
  /** Venue contracts */
  CONTRACTS: 'contracts',
  /** Curriculum PDFs (templates and blocks) */
  CURRICULUM: 'curriculum',
} as const

export type StorageFolder = typeof STORAGE_FOLDERS[keyof typeof STORAGE_FOLDERS]
