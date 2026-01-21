'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  getBlockById,
  updateBlock,
  deleteBlock,
  SPORTS,
  BLOCK_CATEGORIES,
  INTENSITIES,
  SportType,
  BlockCategory,
  IntensityLevel,
  CurriculumBlock,
} from '@/lib/services/curriculum'
import { useUpload, STORAGE_FOLDERS } from '@/lib/storage/use-upload'
import { PdfViewer } from '@/components/ui/pdf-viewer'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Blocks,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Building2,
  Clock,
  Trash2,
  FileText,
  Upload,
  X,
  Eye,
} from 'lucide-react'

/**
 * Edit Block Page
 *
 * Form for editing an existing curriculum block.
 */

interface FormData {
  title: string
  description: string
  sport: SportType
  category: BlockCategory
  duration_minutes: string
  intensity: IntensityLevel
  equipment_needed: string
  setup_notes: string
  coaching_points: string
  is_global: boolean
  // PDF fields
  pdf_url: string | null
  pdf_name: string | null
}

interface FormErrors {
  title?: string
  duration_minutes?: string
}

export default function EditBlockPage() {
  const router = useRouter()
  const params = useParams()
  const blockId = params.id as string
  const { user, role, isHqAdmin, tenant } = useAuth()
  const { upload, uploading, progress } = useUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [block, setBlock] = useState<CurriculumBlock | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    sport: 'multi_sport',
    category: 'drill',
    duration_minutes: '15',
    intensity: 'moderate',
    equipment_needed: '',
    setup_notes: '',
    coaching_points: '',
    is_global: false,
    pdf_url: null,
    pdf_name: null,
  })

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  // Load block data
  useEffect(() => {
    async function loadBlock() {
      setLoading(true)
      const { data, error: fetchError } = await getBlockById(blockId)

      if (fetchError || !data) {
        setError(fetchError?.message || 'Block not found')
        setLoading(false)
        return
      }

      setBlock(data)
      setFormData({
        title: data.title,
        description: data.description || '',
        sport: data.sport,
        category: data.category,
        duration_minutes: data.duration_minutes.toString(),
        intensity: data.intensity || 'moderate',
        equipment_needed: data.equipment_needed || '',
        setup_notes: data.setup_notes || '',
        coaching_points: data.coaching_points || '',
        is_global: data.is_global,
        pdf_url: data.pdf_url,
        pdf_name: data.pdf_name,
      })
      setLoading(false)
    }

    if (blockId) {
      loadBlock()
    }
  }, [blockId])

  // Check if user can edit this block
  const canEdit = isHqAdmin || (block && block.licensee_id === tenant?.id)

  const updateField = (field: keyof FormData, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // PDF file handling
  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }

    const result = await upload(file, { folder: STORAGE_FOLDERS.CURRICULUM })
    if (result) {
      setFormData(prev => ({
        ...prev,
        pdf_url: result.fileUrl,
        pdf_name: file.name,
      }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handlePdfUpload(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handlePdfUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const removePdf = () => {
    setFormData(prev => ({
      ...prev,
      pdf_url: null,
      pdf_name: null,
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleViewPdf = async () => {
    if (!formData.pdf_url) return

    setLoadingPdf(true)
    try {
      const res = await fetch(`/api/curriculum/document?type=block&id=${blockId}`)
      const data = await res.json()
      if (data.url) {
        setPdfViewerUrl(data.url)
        setShowPdfViewer(true)
      }
    } catch (err) {
      setError('Failed to load PDF')
    } finally {
      setLoadingPdf(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (!formData.title.trim()) {
      errors.title = 'Block title is required'
    }

    const duration = parseInt(formData.duration_minutes)
    if (!duration || duration < 1 || duration > 180) {
      errors.duration_minutes = 'Duration must be between 1 and 180 minutes'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setSaving(true)

    const { error: updateError } = await updateBlock(blockId, {
      licensee_id: formData.is_global ? null : tenant?.id || null,
      sport: formData.sport,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      duration_minutes: parseInt(formData.duration_minutes),
      category: formData.category,
      intensity: formData.intensity,
      equipment_needed: formData.equipment_needed.trim() || undefined,
      setup_notes: formData.setup_notes.trim() || undefined,
      coaching_points: formData.coaching_points.trim() || undefined,
      is_global: formData.is_global,
      pdf_url: formData.pdf_url,
      pdf_name: formData.pdf_name,
    })

    if (updateError) {
      setError(updateError.message || 'Failed to update block')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    setTimeout(() => {
      router.push('/admin/curriculum?tab=blocks')
    }, 1500)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error: deleteError } = await deleteBlock(blockId)

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete block')
      setDeleting(false)
      setShowDeleteConfirm(false)
      return
    }

    router.push('/admin/curriculum?tab=blocks')
  }

  if (loading) {
    return (
      <AdminLayout userRole={role || 'hq_admin'} userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-magenta" />
        </div>
      </AdminLayout>
    )
  }

  if (!block) {
    return (
      <AdminLayout userRole={role || 'hq_admin'} userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Block Not Found</h2>
            <p className="text-white/50 mb-4">{error || 'The requested block could not be found.'}</p>
            <Link
              href="/admin/curriculum?tab=blocks"
              className="text-magenta hover:underline"
            >
              Back to Blocks
            </Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (success) {
    return (
      <AdminLayout userRole={role || 'hq_admin'} userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-magenta/10 border border-magenta/30 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-magenta" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
              Block Updated!
            </h2>
            <p className="text-white/50 mb-4">Your changes have been saved.</p>
            <p className="text-sm text-white/30">Redirecting...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole={role || 'hq_admin'} userName={userName}>
      <div className="mb-6">
        <Link
          href="/admin/curriculum?tab=blocks"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-magenta transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blocks
        </Link>
      </div>

      <PageHeader
        title="Edit Block"
        description={`Editing "${block.title}"`}
      />

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">Error</p>
            <p className="text-sm text-red-400/70">{error}</p>
          </div>
        </div>
      )}

      {/* Read-only warning */}
      {!canEdit && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-400">Read Only</p>
            <p className="text-sm text-yellow-400/70">
              You don't have permission to edit this block. It belongs to {block.is_global ? 'HQ (Global)' : 'another licensee'}.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <ContentCard title="Block Information" accent="magenta">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Blocks className="h-4 w-4 inline mr-2" />
                    Block Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g., Dynamic Warmup - Full Body"
                    className={cn(
                      'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50',
                      formErrors.title
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-white/20 focus:border-magenta'
                    )}
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Describe the activity and its purpose..."
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none resize-none disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Sport
                    </label>
                    <select
                      value={formData.sport}
                      onChange={(e) => updateField('sport', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none appearance-none disabled:opacity-50"
                    >
                      {SPORTS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none appearance-none disabled:opacity-50"
                    >
                      {BLOCK_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </ContentCard>

            {/* Timing & Intensity */}
            <ContentCard title="Timing & Intensity" accent="purple">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <Clock className="h-4 w-4 inline mr-2" />
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={formData.duration_minutes}
                      onChange={(e) => updateField('duration_minutes', e.target.value)}
                      disabled={!canEdit}
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white focus:outline-none disabled:opacity-50',
                        formErrors.duration_minutes
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-purple'
                      )}
                    />
                    {formErrors.duration_minutes && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.duration_minutes}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Intensity
                    </label>
                    <select
                      value={formData.intensity}
                      onChange={(e) => updateField('intensity', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none appearance-none disabled:opacity-50"
                    >
                      {INTENSITIES.map(i => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </ContentCard>

            {/* Coaching Notes */}
            <ContentCard title="Coaching Details" accent="neon">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Equipment Needed
                  </label>
                  <input
                    type="text"
                    value={formData.equipment_needed}
                    onChange={(e) => updateField('equipment_needed', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g., Cones, Basketballs (1 per athlete)"
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Setup Notes
                  </label>
                  <textarea
                    value={formData.setup_notes}
                    onChange={(e) => updateField('setup_notes', e.target.value)}
                    disabled={!canEdit}
                    placeholder="How to set up the activity..."
                    rows={2}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Coaching Points
                  </label>
                  <textarea
                    value={formData.coaching_points}
                    onChange={(e) => updateField('coaching_points', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Key things coaches should emphasize..."
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none disabled:opacity-50"
                  />
                </div>
              </div>
            </ContentCard>

            {/* PDF Document */}
            <ContentCard title="PDF Document" accent="purple">
              <div className="space-y-4">
                <p className="text-sm text-white/50">
                  Attach a PDF document to this block (optional). This could be a detailed drill diagram,
                  coaching guide, or any supplementary material.
                </p>

                {formData.pdf_url ? (
                  <div className="border border-purple/30 bg-purple/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple/20 border border-purple/30">
                          <FileText className="h-6 w-6 text-purple" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{formData.pdf_name}</p>
                          <p className="text-xs text-white/50">PDF Document</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleViewPdf}
                          disabled={loadingPdf}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple/20 border border-purple/30 text-purple text-sm font-bold uppercase tracking-wider hover:bg-purple/30 transition-colors disabled:opacity-50"
                        >
                          {loadingPdf ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          View
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={removePdf}
                            className="p-1.5 text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : canEdit ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                      'border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
                      isDragging
                        ? 'border-purple bg-purple/10'
                        : 'border-white/20 hover:border-purple/50'
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-10 w-10 text-purple animate-spin" />
                        <p className="text-white/60">Uploading... {progress}%</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-white/30 mx-auto mb-3" />
                        <p className="text-white/60 mb-1">
                          Drag and drop a PDF here, or click to browse
                        </p>
                        <p className="text-xs text-white/30">
                          PDF files only
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="border border-white/10 p-8 text-center">
                    <FileText className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">No PDF attached to this block</p>
                  </div>
                )}
              </div>
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              {/* Scope */}
              {isHqAdmin && canEdit && (
                <ContentCard title="Block Scope" accent="magenta">
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => updateField('is_global', true)}
                      className={cn(
                        'flex items-center gap-3 w-full p-4 border transition-colors text-left',
                        formData.is_global
                          ? 'bg-neon/10 border-neon'
                          : 'border-white/20 hover:border-white/40'
                      )}
                    >
                      <Globe className={cn(
                        'h-5 w-5',
                        formData.is_global ? 'text-neon' : 'text-white/40'
                      )} />
                      <div>
                        <p className={cn(
                          'font-bold',
                          formData.is_global ? 'text-neon' : 'text-white'
                        )}>
                          Global Block
                        </p>
                        <p className="text-xs text-white/40">
                          Available to all licensees
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('is_global', false)}
                      className={cn(
                        'flex items-center gap-3 w-full p-4 border transition-colors text-left',
                        !formData.is_global
                          ? 'bg-magenta/10 border-magenta'
                          : 'border-white/20 hover:border-white/40'
                      )}
                    >
                      <Building2 className={cn(
                        'h-5 w-5',
                        !formData.is_global ? 'text-magenta' : 'text-white/40'
                      )} />
                      <div>
                        <p className={cn(
                          'font-bold',
                          !formData.is_global ? 'text-magenta' : 'text-white'
                        )}>
                          Licensee Block
                        </p>
                        <p className="text-xs text-white/40">
                          Only visible to this licensee
                        </p>
                      </div>
                    </button>
                  </div>
                </ContentCard>
              )}

              {/* Current Scope Display (non-HQ admins) */}
              {!isHqAdmin && (
                <ContentCard title="Block Scope" accent="magenta">
                  <div className="flex items-center gap-3 p-4 border border-white/20">
                    {block.is_global ? (
                      <>
                        <Globe className="h-5 w-5 text-neon" />
                        <div>
                          <p className="font-bold text-neon">Global Block</p>
                          <p className="text-xs text-white/40">Created by HQ</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Building2 className="h-5 w-5 text-magenta" />
                        <div>
                          <p className="font-bold text-magenta">Licensee Block</p>
                          <p className="text-xs text-white/40">Your organization</p>
                        </div>
                      </>
                    )}
                  </div>
                </ContentCard>
              )}

              {/* Category Preview */}
              {canEdit && (
                <ContentCard title="Category" accent="magenta">
                  <div className="flex flex-wrap gap-2">
                    {BLOCK_CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => updateField('category', c.value)}
                        className={cn(
                          'px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors',
                          formData.category === c.value
                            ? c.color
                            : 'bg-transparent border-white/20 text-white/40 hover:border-white/40'
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </ContentCard>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {canEdit && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-magenta text-white font-bold uppercase tracking-widest hover:bg-magenta/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                )}

                <Link
                  href="/admin/curriculum?tab=blocks"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                >
                  {canEdit ? 'Cancel' : 'Back'}
                </Link>

                {/* Delete Button */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-center gap-2 w-full py-3 border border-red-500/30 text-red-400 font-bold uppercase tracking-wider hover:bg-red-500/10 hover:border-red-500/50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Block
                  </button>
                )}
              </div>

              {/* Block Info */}
              <div className="p-4 bg-black/30 border border-white/10 text-xs text-white/40">
                <p className="font-bold text-white/60 mb-2">Block Info</p>
                <div className="space-y-1">
                  <p>Created: {new Date(block.created_at).toLocaleDateString()}</p>
                  {block.updated_at && (
                    <p>Updated: {new Date(block.updated_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/20 p-6 max-w-md w-full">
            <h3 className="text-xl font-black uppercase tracking-wider text-white mb-4">
              Delete Block?
            </h3>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete "{block.title}"? This action cannot be undone.
              Any templates using this block will have it removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 border border-white/20 text-white font-bold uppercase tracking-wider hover:border-white/40 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-500 text-white font-bold uppercase tracking-wider hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfViewer && pdfViewerUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">{formData.pdf_name}</h3>
            <button
              onClick={() => {
                setShowPdfViewer(false)
                setPdfViewerUrl(null)
              }}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <PdfViewer
              url={pdfViewerUrl}
              filename={formData.pdf_name || 'document.pdf'}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
