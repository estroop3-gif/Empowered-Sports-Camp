'use client'

/**
 * CIT Certifications Page
 *
 * Allows CITs to view and upload required certifications.
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Loader2,
  AlertCircle,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  ExternalLink,
  Eye,
  RefreshCw,
} from 'lucide-react'
import type { CitCertificationSummary } from '@/lib/services/cit-dashboard'

interface CertificationsData {
  items: CitCertificationSummary[]
  required_types: { type: string; display_name: string }[]
}

export default function CitCertificationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CertificationsData | null>(null)
  const [uploadingType, setUploadingType] = useState<string | null>(null)

  useEffect(() => {
    loadCertifications()
  }, [])

  async function loadCertifications() {
    try {
      setLoading(true)
      const res = await fetch('/api/cit/certifications')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load certifications')
      }

      setData(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <LmsGate featureName="certifications">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-magenta animate-spin" />
        </div>
      </LmsGate>
    )
  }

  if (error || !data) {
    return (
      <LmsGate featureName="certifications">
        <PortalPageHeader
          title="Certifications"
          description="Upload and manage your certifications"
        />
        <PortalCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Certifications</h3>
            <p className="text-white/50 mb-4">{error}</p>
            <button
              onClick={loadCertifications}
              className="px-6 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </PortalCard>
      </LmsGate>
    )
  }

  const completedCount = data.items.filter((c) => c.status === 'approved').length
  const pendingCount = data.items.filter(
    (c) => c.status === 'pending_review' && c.document_url
  ).length
  const totalRequired = data.required_types.length

  return (
    <LmsGate featureName="certifications">
      <div>
        <PortalPageHeader
          title="Certifications"
          description="Upload and manage your required certifications"
        />

        {/* Progress Summary */}
        <PortalCard accent="magenta" className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                {completedCount} of {totalRequired} Required Certifications
              </h2>
              <p className="text-white/60">
                {completedCount === totalRequired
                  ? "You're all set! All certifications are approved."
                  : pendingCount > 0
                  ? `${pendingCount} certification(s) pending review.`
                  : 'Upload your certifications below to get started.'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-neon">{completedCount}</div>
                <div className="text-xs text-white/40 uppercase">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{pendingCount}</div>
                <div className="text-xs text-white/40 uppercase">Pending</div>
              </div>
            </div>
          </div>

          <div className="mt-4 h-2 bg-white/10 overflow-hidden">
            <div
              className="h-full bg-magenta transition-all duration-500"
              style={{
                width: `${totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0}%`,
              }}
            />
          </div>
        </PortalCard>

        {/* External Training Link */}
        <a
          href="https://www.nfhslearn.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-6 p-4 bg-orange-400/10 border border-orange-400/30 hover:border-orange-400/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ExternalLink className="h-8 w-8 text-orange-400" />
              <div>
                <h3 className="font-bold text-white">Complete NFHS Courses</h3>
                <p className="text-sm text-white/50">
                  Visit NFHS Learn to complete required coaching certifications
                </p>
              </div>
            </div>
            <span className="text-orange-400">Visit Site &rarr;</span>
          </div>
        </a>

        {/* Certification List */}
        <PortalCard title="Required Certifications">
          <div className="space-y-4">
            {data.items.map((cert) => (
              <CertificationRow
                key={cert.document_type}
                cert={cert}
                isUploading={uploadingType === cert.document_type}
                onUploadStart={() => setUploadingType(cert.document_type)}
                onUploadComplete={() => {
                  setUploadingType(null)
                  loadCertifications()
                }}
              />
            ))}
          </div>
        </PortalCard>

        {/* Instructions */}
        <PortalCard className="mt-6 bg-white/5">
          <h3 className="font-bold text-white mb-3">Upload Instructions</h3>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex items-start gap-2">
              <span className="text-magenta">1.</span>
              Complete your NFHS courses at nfhslearn.com
            </li>
            <li className="flex items-start gap-2">
              <span className="text-magenta">2.</span>
              Download your completion certificate as a PDF
            </li>
            <li className="flex items-start gap-2">
              <span className="text-magenta">3.</span>
              Click &quot;Upload&quot; next to the certification and select your file
            </li>
            <li className="flex items-start gap-2">
              <span className="text-magenta">4.</span>
              Wait for review - you&apos;ll be notified when approved
            </li>
          </ul>
        </PortalCard>
      </div>
    </LmsGate>
  )
}

function CertificationRow({
  cert,
  isUploading,
  onUploadStart,
  onUploadComplete,
}: {
  cert: CitCertificationSummary
  isUploading: boolean
  onUploadStart: () => void
  onUploadComplete: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const statusConfig = {
    approved: {
      label: 'Approved',
      color: 'text-neon',
      bgColor: 'bg-neon/20',
      icon: CheckCircle,
    },
    pending_review: cert.document_url
      ? {
          label: 'Pending Review',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/20',
          icon: Clock,
        }
      : {
          label: 'Not Uploaded',
          color: 'text-white/50',
          bgColor: 'bg-white/10',
          icon: Upload,
        },
    rejected: {
      label: 'Rejected',
      color: 'text-red-400',
      bgColor: 'bg-red-400/20',
      icon: XCircle,
    },
    expired: {
      label: 'Expired',
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/20',
      icon: Clock,
    },
  }

  const config = statusConfig[cert.status] || statusConfig.pending_review
  const StatusIcon = config.icon

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or image file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be smaller than 10MB')
      return
    }

    try {
      setUploading(true)
      setError(null)
      onUploadStart()

      // Get presigned URL
      const urlRes = await fetch('/api/cit/certifications/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          documentType: cert.document_type,
        }),
      })

      const urlJson = await urlRes.json()
      if (!urlRes.ok) {
        throw new Error(urlJson.error || 'Failed to get upload URL')
      }

      // Upload to S3
      const uploadRes = await fetch(urlJson.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file')
      }

      // Save certification record
      const saveRes = await fetch('/api/cit/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: cert.document_type,
          displayName: cert.display_name,
          documentUrl: urlJson.data.fileUrl,
        }),
      })

      const saveJson = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveJson.error || 'Failed to save certification')
      }

      onUploadComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      onUploadComplete()
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="p-4 bg-white/5 border border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'h-10 w-10 flex items-center justify-center flex-shrink-0',
              config.bgColor
            )}
          >
            <StatusIcon className={cn('h-5 w-5', config.color)} />
          </div>
          <div>
            <h4 className="font-bold text-white">{cert.display_name}</h4>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-bold uppercase',
                  config.bgColor,
                  config.color
                )}
              >
                {config.label}
              </span>
              {cert.submitted_at && (
                <span className="text-xs text-white/40">
                  Uploaded: {new Date(cert.submitted_at).toLocaleDateString()}
                </span>
              )}
              {cert.expires_at && (
                <span className="text-xs text-orange-400">
                  Expires: {new Date(cert.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {cert.reviewer_notes && cert.status === 'rejected' && (
              <p className="text-sm text-red-400 mt-2">{cert.reviewer_notes}</p>
            )}
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:flex-shrink-0">
          {cert.document_url && (
            <a
              href={cert.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-white/10 text-white text-sm font-bold uppercase tracking-wider hover:bg-white/20 transition-colors flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              View
            </a>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-1',
              cert.status === 'approved'
                ? 'bg-white/10 text-white/50 hover:bg-white/20'
                : 'bg-magenta text-white hover:bg-magenta/90',
              uploading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : cert.document_url ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Replace
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
