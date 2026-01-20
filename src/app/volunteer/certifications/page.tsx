'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  Eye,
} from 'lucide-react'
// Type definition (no longer imported from service)
interface Certification {
  id: string
  profile_id: string
  document_url: string
  document_type: string
  document_name: string | null
  status: 'pending_review' | 'approved' | 'rejected' | 'expired'
  submitted_at: string
  expires_at: string | null
  reviewed_at: string | null
  notes: string | null
  reviewer_notes: string | null
  tenant_id: string | null
}

/**
 * Volunteer Certifications Page
 *
 * Allows volunteers to:
 * - Upload certification documents
 * - View status of submitted certifications
 * - Delete pending certifications
 */

const DOCUMENT_TYPES = [
  { value: 'background_check', label: 'Background Check' },
  { value: 'concussion_training', label: 'Concussion Training (NFHS)' },
  { value: 'cpr_first_aid', label: 'CPR / First Aid' },
  { value: 'safe_sport', label: 'Safe Sport Certification' },
  { value: 'other', label: 'Other' },
]

export default function CertificationsPage() {
  const { user, tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCertifications()
  }, [])

  async function loadCertifications() {
    if (!user?.id) return

    try {
      const res = await fetch(`/api/certifications?action=byUser&profileId=${user.id}`)
      const { data } = await res.json()
      if (data) {
        setCertifications(data)
      }
    } catch (err) {
      console.error('Error loading certifications:', err)
    }
    setLoading(false)
  }

  async function handleUpload() {
    if (!selectedFile || !documentType || !user?.id) {
      setError('Please select a file and document type')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Get presigned URL from API
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
          folder: 'certifications',
        }),
      })

      if (!presignRes.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, fileUrl } = await presignRes.json()

      // Upload file directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream',
        },
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file')
      }

      // Create certification record
      const certRes = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          profile_id: user.id,
          document_url: fileUrl,
          document_type: documentType,
          document_name: selectedFile.name,
          notes: notes || undefined,
          tenant_id: tenant?.id || undefined,
        }),
      })

      const { error: insertError } = await certRes.json()
      if (insertError) throw new Error(insertError)

      // Reset form and reload
      setShowUploadForm(false)
      setSelectedFile(null)
      setDocumentType('')
      setNotes('')
      loadCertifications()
    } catch (err: unknown) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload certification')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(certId: string) {
    if (!confirm('Are you sure you want to delete this certification?')) return
    if (!user?.id) return

    try {
      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          certId,
          profileId: user.id,
        }),
      })

      const { error } = await res.json()
      if (!error) {
        loadCertifications()
      }
    } catch (err) {
      console.error('Error deleting certification:', err)
    }
  }

  const pendingCount = certifications.filter(c => c.status === 'pending_review').length
  const approvedCount = certifications.filter(c => c.status === 'approved').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-purple animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <PortalPageHeader
        title="Certifications"
        description="Upload and manage your certification documents"
        actions={
          <button
            onClick={() => setShowUploadForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Upload New
          </button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-yellow-500/20 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
              <p className="text-sm text-white/50">Pending Review</p>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-neon" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{approvedCount}</p>
              <p className="text-sm text-white/50">Approved</p>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
              <FileText className="h-6 w-6 text-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{certifications.length}</p>
              <p className="text-sm text-white/50">Total Uploaded</p>
            </div>
          </div>
        </PortalCard>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-dark-100 border border-white/10 w-full max-w-md">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-white uppercase tracking-wider">
                Upload Certification
              </h3>
              <button
                onClick={() => setShowUploadForm(false)}
                className="p-2 text-white/50 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Document Type */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Document Type *
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none"
                >
                  <option value="">Select type...</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Document File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-8 border-2 border-dashed border-white/20 hover:border-purple/50 transition-colors text-center"
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-purple" />
                      <span className="text-white">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-white/50">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-white/30" />
                      <p>Click to select file</p>
                      <p className="text-xs text-white/30 mt-1">PDF, JPG, or PNG</p>
                    </div>
                  )}
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !documentType}
                className="w-full py-4 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload Certification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certifications List */}
      {certifications.length > 0 ? (
        <div className="space-y-4">
          {certifications.map((cert) => (
            <PortalCard
              key={cert.id}
              accent={
                cert.status === 'approved'
                  ? 'neon'
                  : cert.status === 'pending_review'
                    ? 'orange'
                    : undefined
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 flex items-center justify-center flex-shrink-0 ${
                    cert.status === 'approved'
                      ? 'bg-neon/20 text-neon'
                      : cert.status === 'pending_review'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : cert.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-white/10 text-white/50'
                  }`}>
                    {cert.status === 'approved' ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : cert.status === 'pending_review' ? (
                      <Clock className="h-6 w-6" />
                    ) : (
                      <AlertCircle className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white capitalize">
                      {cert.document_type.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-sm text-white/50 mt-1">
                      {cert.document_name || 'Document'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                      <span>Submitted {new Date(cert.submitted_at).toLocaleDateString()}</span>
                      {cert.expires_at && (
                        <span>Expires {new Date(cert.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    {cert.notes && (
                      <p className="text-sm text-white/60 mt-2">{cert.notes}</p>
                    )}
                    {cert.reviewer_notes && (
                      <p className="text-sm text-purple mt-2">
                        Reviewer: {cert.reviewer_notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 text-xs font-bold uppercase ${
                    cert.status === 'approved'
                      ? 'bg-neon/10 text-neon'
                      : cert.status === 'pending_review'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : cert.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-white/10 text-white/50'
                  }`}>
                    {cert.status.replace(/_/g, ' ')}
                  </span>

                  <a
                    href={cert.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-white/50 hover:text-white transition-colors"
                    title="View document"
                  >
                    <Eye className="h-5 w-5" />
                  </a>

                  {cert.status === 'pending_review' && (
                    <button
                      onClick={() => handleDelete(cert.id)}
                      className="p-2 text-white/50 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </PortalCard>
          ))}
        </div>
      ) : (
        <PortalCard>
          <div className="text-center py-12">
            <Upload className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Certifications Yet</h3>
            <p className="text-white/50 mb-6">
              Upload your background check, training certificates, and other required documents.
            </p>
            <button
              onClick={() => setShowUploadForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors"
            >
              <Upload className="h-5 w-5" />
              Upload Your First Certification
            </button>
          </div>
        </PortalCard>
      )}
    </div>
  )
}
