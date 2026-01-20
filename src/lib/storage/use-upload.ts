'use client'

/**
 * useUpload Hook
 *
 * React hook for uploading files to S3 via presigned URLs.
 *
 * Usage:
 * ```tsx
 * const { upload, uploading, progress, error } = useUpload()
 *
 * const handleUpload = async (file: File) => {
 *   const result = await upload(file, { folder: 'avatars' })
 *   if (result) {
 *     console.log('Uploaded to:', result.fileUrl)
 *   }
 * }
 * ```
 */

import { useState, useCallback } from 'react'
import { STORAGE_FOLDERS, type StorageFolder } from './s3'

interface UploadOptions {
  folder?: StorageFolder
  onProgress?: (progress: number) => void
}

interface UploadResult {
  fileUrl: string
  key: string
}

interface UploadState {
  uploading: boolean
  progress: number
  error: string | null
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
  })

  const upload = useCallback(async (
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult | null> => {
    const { folder = STORAGE_FOLDERS.DOCUMENTS, onProgress } = options

    setState({ uploading: true, progress: 0, error: null })

    try {
      // Step 1: Get presigned URL from our API
      const presignResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder,
        }),
      })

      if (!presignResponse.ok) {
        const errorData = await presignResponse.json()
        throw new Error(errorData.error || 'Failed to get upload URL')
      }

      const { uploadUrl, fileUrl, key, maxSize } = await presignResponse.json()

      // Check file size
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`)
      }

      // Step 2: Upload directly to S3 using the presigned URL
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setState(prev => ({ ...prev, progress }))
            onProgress?.(progress)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      setState({ uploading: false, progress: 100, error: null })
      return { fileUrl, key }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      setState({ uploading: false, progress: 0, error: message })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ uploading: false, progress: 0, error: null })
  }, [])

  return {
    upload,
    reset,
    ...state,
  }
}

/**
 * useMultiUpload Hook
 *
 * For uploading multiple files with individual progress tracking.
 */
interface FileUploadState {
  file: File
  progress: number
  error: string | null
  result: UploadResult | null
  status: 'pending' | 'uploading' | 'success' | 'error'
}

export function useMultiUpload() {
  const [files, setFiles] = useState<Map<string, FileUploadState>>(new Map())
  const [uploading, setUploading] = useState(false)

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => {
      const next = new Map(prev)
      newFiles.forEach(file => {
        const id = `${file.name}-${file.size}-${Date.now()}`
        next.set(id, {
          file,
          progress: 0,
          error: null,
          result: null,
          status: 'pending',
        })
      })
      return next
    })
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const uploadAll = useCallback(async (options: UploadOptions = {}): Promise<UploadResult[]> => {
    const { folder = STORAGE_FOLDERS.DOCUMENTS } = options
    setUploading(true)
    const results: UploadResult[] = []

    for (const [id, fileState] of files) {
      if (fileState.status !== 'pending') continue

      setFiles(prev => {
        const next = new Map(prev)
        next.set(id, { ...fileState, status: 'uploading' })
        return next
      })

      try {
        // Get presigned URL
        const presignResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: fileState.file.name,
            contentType: fileState.file.type,
            folder,
          }),
        })

        if (!presignResponse.ok) {
          throw new Error('Failed to get upload URL')
        }

        const { uploadUrl, fileUrl, key } = await presignResponse.json()

        // Upload to S3
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100)
              setFiles(prev => {
                const next = new Map(prev)
                const current = next.get(id)
                if (current) {
                  next.set(id, { ...current, progress })
                }
                return next
              })
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          })

          xhr.addEventListener('error', () => reject(new Error('Network error')))
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', fileState.file.type)
          xhr.send(fileState.file)
        })

        const result = { fileUrl, key }
        results.push(result)

        setFiles(prev => {
          const next = new Map(prev)
          next.set(id, {
            ...fileState,
            progress: 100,
            result,
            status: 'success',
          })
          return next
        })
      } catch (error) {
        setFiles(prev => {
          const next = new Map(prev)
          next.set(id, {
            ...fileState,
            error: error instanceof Error ? error.message : 'Upload failed',
            status: 'error',
          })
          return next
        })
      }
    }

    setUploading(false)
    return results
  }, [files])

  const reset = useCallback(() => {
    setFiles(new Map())
    setUploading(false)
  }, [])

  return {
    files: Array.from(files.entries()).map(([id, state]) => ({ id, ...state })),
    addFiles,
    removeFile,
    uploadAll,
    reset,
    uploading,
  }
}

// Re-export folder constants for convenience
export { STORAGE_FOLDERS }
