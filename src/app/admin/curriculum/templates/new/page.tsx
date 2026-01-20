'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  createTemplate,
  SPORTS,
  DIFFICULTIES,
  SportType,
  DifficultyLevel,
} from '@/lib/services/curriculum'
import { useUpload, STORAGE_FOLDERS } from '@/lib/storage/use-upload'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  BookOpen,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Building2,
  Users,
  Trophy,
  FileText,
  Upload,
  X,
  FileUp,
} from 'lucide-react'

/**
 * Create New Template Page
 *
 * Form for creating a new curriculum template.
 * HQ admins can create global templates; licensees create licensee-specific ones.
 */

interface FormData {
  name: string
  description: string
  sport: SportType
  age_min: string
  age_max: string
  difficulty: DifficultyLevel
  is_global: boolean
  total_days: string
  // PDF fields
  is_pdf_only: boolean
  pdf_url: string | null
  pdf_name: string | null
}

interface FormErrors {
  name?: string
  sport?: string
  age_min?: string
  age_max?: string
}

export default function NewTemplatePage() {
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
    name: '',
    description: '',
    sport: 'multi_sport',
    age_min: '',
    age_max: '',
    difficulty: 'intro',
    is_global: isHqAdmin,
    total_days: '5',
    is_pdf_only: false,
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

    if (!formData.name.trim()) {
      errors.name = 'Template name is required'
    }

    if (formData.age_min && formData.age_max) {
      const minAge = parseInt(formData.age_min)
      const maxAge = parseInt(formData.age_max)
      if (minAge > maxAge) {
        errors.age_min = 'Min age cannot be greater than max age'
      }
    }

    // PDF-only templates must have a PDF uploaded
    if (formData.is_pdf_only && !formData.pdf_url) {
      setError('Please upload a PDF for PDF-only templates')
      return false
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

    const { data, error: createError } = await createTemplate({
      licensee_id: formData.is_global ? null : tenant?.id || null,
      sport: formData.sport,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      age_min: formData.age_min ? parseInt(formData.age_min) : undefined,
      age_max: formData.age_max ? parseInt(formData.age_max) : undefined,
      difficulty: formData.difficulty,
      is_global: formData.is_global,
      total_days: formData.is_pdf_only ? 0 : (parseInt(formData.total_days) || 5),
      pdf_url: formData.pdf_url,
      pdf_name: formData.pdf_name,
      is_pdf_only: formData.is_pdf_only,
    })

    if (createError) {
      setError(createError.message || 'Failed to create template')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    // Redirect - PDF-only templates go to detail, structured templates go to planner
    setTimeout(() => {
      if (formData.is_pdf_only) {
        router.push(`/admin/curriculum/templates/${data?.id}`)
      } else {
        router.push(`/admin/curriculum/templates/${data?.id}?tab=planner`)
      }
    }, 1500)
  }

  if (success) {
    return (
      <AdminLayout userRole={role || 'hq_admin'} userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-neon/10 border border-neon/30 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-neon" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
              Template Created!
            </h2>
            <p className="text-white/50 mb-4">Now let's add days and blocks to your curriculum.</p>
            <p className="text-sm text-white/30">Redirecting to planner...</p>
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
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Curriculum
        </Link>
      </div>

      <PageHeader
        title="Create Template"
        description="Design a new curriculum template for camps."
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
            <ContentCard title="Template Information" accent="neon">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <BookOpen className="h-4 w-4 inline mr-2" />
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g., Intro Multi-Sport Confidence Camp - Ages 5-7"
                    className={cn(
                      'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none',
                      formErrors.name
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-white/20 focus:border-neon'
                    )}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Describe what this curriculum covers and who it's designed for..."
                    rows={4}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                  />
                </div>
              </div>
            </ContentCard>

            {/* Sport & Level */}
            <ContentCard title="Sport & Level" accent="magenta">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    <Trophy className="h-4 w-4 inline mr-2" />
                    Sport *
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
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DIFFICULTIES.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => updateField('difficulty', d.value)}
                        className={cn(
                          'px-4 py-3 border text-sm font-bold uppercase tracking-wider transition-colors',
                          formData.difficulty === d.value
                            ? 'bg-magenta/20 border-magenta text-magenta'
                            : 'bg-black border-white/20 text-white/60 hover:border-white/40'
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </ContentCard>

            {/* Target Audience */}
            <ContentCard title="Target Audience" accent="purple">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      <Users className="h-4 w-4 inline mr-2" />
                      Min Age
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="18"
                      value={formData.age_min}
                      onChange={(e) => updateField('age_min', e.target.value)}
                      placeholder="e.g., 5"
                      className={cn(
                        'w-full px-4 py-3 bg-black border text-white placeholder:text-white/30 focus:outline-none',
                        formErrors.age_min
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/20 focus:border-purple'
                      )}
                    />
                    {formErrors.age_min && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.age_min}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Max Age
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="18"
                      value={formData.age_max}
                      onChange={(e) => updateField('age_max', e.target.value)}
                      placeholder="e.g., 10"
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none"
                    />
                  </div>
                </div>

                {/* Only show day selector for structured templates */}
                {!formData.is_pdf_only && (
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                      Number of Days
                    </label>
                    <select
                      value={formData.total_days}
                      onChange={(e) => updateField('total_days', e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-purple focus:outline-none appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 10, 14].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Day' : 'Days'}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-white/40">
                      You can add more days later in the planner.
                    </p>
                  </div>
                )}
              </div>
            </ContentCard>

            {/* PDF Document */}
            <ContentCard title="PDF Document" accent="neon">
              <div className="space-y-6">
                {/* Template Type Toggle */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                    Template Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField('is_pdf_only', false)}
                      className={cn(
                        'p-4 border transition-colors text-left',
                        !formData.is_pdf_only
                          ? 'bg-neon/10 border-neon'
                          : 'border-white/20 hover:border-white/40'
                      )}
                    >
                      <BookOpen className={cn(
                        'h-5 w-5 mb-2',
                        !formData.is_pdf_only ? 'text-neon' : 'text-white/40'
                      )} />
                      <p className={cn(
                        'font-bold text-sm',
                        !formData.is_pdf_only ? 'text-neon' : 'text-white'
                      )}>
                        Structured
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        Days & activity blocks
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('is_pdf_only', true)}
                      className={cn(
                        'p-4 border transition-colors text-left',
                        formData.is_pdf_only
                          ? 'bg-neon/10 border-neon'
                          : 'border-white/20 hover:border-white/40'
                      )}
                    >
                      <FileText className={cn(
                        'h-5 w-5 mb-2',
                        formData.is_pdf_only ? 'text-neon' : 'text-white/40'
                      )} />
                      <p className={cn(
                        'font-bold text-sm',
                        formData.is_pdf_only ? 'text-neon' : 'text-white'
                      )}>
                        PDF Only
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        Just upload a PDF
                      </p>
                    </button>
                  </div>
                </div>

                {/* PDF Upload Section */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                    <FileUp className="h-4 w-4 inline mr-2" />
                    {formData.is_pdf_only ? 'Curriculum PDF *' : 'Attach PDF (Optional)'}
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
                    <div className="flex items-center justify-between p-4 bg-neon/5 border border-neon/30">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-neon" />
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
                    <div className="p-6 border border-neon/30 bg-neon/5">
                      <div className="flex items-center gap-4 mb-3">
                        <Loader2 className="h-6 w-6 text-neon animate-spin" />
                        <span className="text-white">Uploading...</span>
                      </div>
                      <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neon transition-all duration-300"
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
                        'p-8 border-2 border-dashed cursor-pointer transition-colors text-center',
                        isDragging
                          ? 'border-neon bg-neon/10'
                          : 'border-white/20 hover:border-white/40'
                      )}
                    >
                      <Upload className="h-10 w-10 text-white/30 mx-auto mb-3" />
                      <p className="text-white/60">
                        Drag and drop a PDF here, or{' '}
                        <span className="text-neon">browse</span>
                      </p>
                      <p className="text-xs text-white/30 mt-2">PDF files only (max 50MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              {/* Scope */}
              {isHqAdmin && (
                <ContentCard title="Template Scope" accent="neon">
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
                          Global Template
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
                          Licensee Template
                        </p>
                        <p className="text-xs text-white/40">
                          Only visible to this licensee
                        </p>
                      </div>
                    </button>
                  </div>
                </ContentCard>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Create Template
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

              {/* Help */}
              <div className="p-4 bg-black/30 border border-white/10 text-xs text-white/40">
                <p className="font-bold text-white/60 mb-2">Template Types</p>
                {formData.is_pdf_only ? (
                  <>
                    <p>PDF-Only templates are perfect for:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Existing curriculum documents</li>
                      <li>Quick template creation</li>
                      <li>Printable lesson plans</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>Structured templates let you:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Add and name each day</li>
                      <li>Assign blocks (warmups, drills, etc.)</li>
                      <li>Reorder activities</li>
                      <li>Add coaching notes</li>
                      <li>Optionally attach a PDF</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
