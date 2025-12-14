'use client'

import { useState } from 'react'
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

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    sport: 'multi_sport',
    age_min: '',
    age_max: '',
    difficulty: 'intro',
    is_global: isHqAdmin,
    total_days: '5',
  })

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
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
      total_days: parseInt(formData.total_days) || 5,
    })

    if (createError) {
      setError(createError.message || 'Failed to create template')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    // Redirect to template editor after short delay
    setTimeout(() => {
      router.push(`/admin/curriculum/templates/${data?.id}?tab=planner`)
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
                <p className="font-bold text-white/60 mb-2">Next Steps</p>
                <p>After creating your template, you'll be taken to the Day Planner where you can:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Add and name each day</li>
                  <li>Assign blocks (warmups, drills, etc.)</li>
                  <li>Reorder activities</li>
                  <li>Add coaching notes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
