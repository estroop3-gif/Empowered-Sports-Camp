'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  createBlock,
  SPORTS,
  BLOCK_CATEGORIES,
  INTENSITIES,
  SportType,
  BlockCategory,
  IntensityLevel,
} from '@/lib/services/curriculum'
import { useUpload, STORAGE_FOLDERS } from '@/lib/storage/use-upload'
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
  FileText,
  Upload,
  X,
} from 'lucide-react'

/**
 * Create New Block Page
 *
 * Form for creating a new reusable curriculum block.
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

export default function NewBlockPage() {
  const router = useRouter()
  const { user, role, isHqAdmin, tenant } = useAuth()
  const { upload, uploading, progress } = useUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [isDragging, setIsDragging] = useState(false)

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
    is_global: isHqAdmin,
    pdf_url: null,
    pdf_name: null,
  })

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

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

    const { data, error: createError } = await createBlock({
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

    if (createError) {
      setError(createError.message || 'Failed to create block')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    setTimeout(() => {
      router.push('/admin/curriculum?tab=blocks')
    }, 1500)
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
              Block Created!
            </h2>
            <p className="text-white/50 mb-4">Your block is ready to be used in templates.</p>
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
          href="/admin/curriculum"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-magenta transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Curriculum
        </Link>
      </div>

      <PageHeader
        title="Create Block"
        description="Create a reusable activity block for curriculum templates."
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
                    placeholder="e.g., Dynamic Warmup - Full Body"
                    className={cn(
                      'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none',
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
                    placeholder="Describe the activity and its purpose..."
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none resize-none"
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
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none appearance-none"
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
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none appearance-none"
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
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white focus:outline-none',
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
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none appearance-none"
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
                    placeholder="e.g., Cones, Basketballs (1 per athlete)"
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Setup Notes
                  </label>
                  <textarea
                    value={formData.setup_notes}
                    onChange={(e) => updateField('setup_notes', e.target.value)}
                    placeholder="How to set up the activity..."
                    rows={2}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Coaching Points
                  </label>
                  <textarea
                    value={formData.coaching_points}
                    onChange={(e) => updateField('coaching_points', e.target.value)}
                    placeholder="Key things coaches should emphasize..."
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                  />
                </div>
              </div>
            </ContentCard>

            {/* PDF Attachment */}
            <ContentCard title="PDF Attachment" accent="purple">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Attach PDF (Optional)
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {formData.pdf_url ? (
                  // Show uploaded file
                  <div className="flex items-center justify-between p-4 bg-purple/5 border border-purple/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-purple" />
                      <div>
                        <p className="font-semibold text-white">{formData.pdf_name}</p>
                        <p className="text-xs text-white/40">PDF uploaded successfully</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removePdf}
                      className="p-2 text-white/40 hover:text-red-400 transition-colors"
                      title="Remove PDF"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : uploading ? (
                  // Show upload progress
                  <div className="p-6 border border-purple/30 bg-purple/5">
                    <div className="flex items-center gap-4 mb-3">
                      <Loader2 className="h-6 w-6 text-purple animate-spin" />
                      <span className="text-white">Uploading...</span>
                    </div>
                    <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/40 mt-2">{progress}% complete</p>
                  </div>
                ) : (
                  // Show dropzone
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'p-6 border-2 border-dashed cursor-pointer transition-colors text-center',
                      isDragging
                        ? 'border-purple bg-purple/10'
                        : 'border-white/20 hover:border-white/40'
                    )}
                  >
                    <Upload className="h-8 w-8 text-white/30 mx-auto mb-2" />
                    <p className="text-sm text-white/60">
                      Drag and drop a PDF, or{' '}
                      <span className="text-purple">browse</span>
                    </p>
                    <p className="text-xs text-white/30 mt-1">PDF files only</p>
                  </div>
                )}
              </div>
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              {/* Scope */}
              {isHqAdmin && (
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

              {/* Category Preview */}
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

              {/* Actions */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-magenta text-white font-bold uppercase tracking-widest hover:bg-magenta/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Create Block
                    </>
                  )}
                </button>

                <Link
                  href="/admin/curriculum"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
