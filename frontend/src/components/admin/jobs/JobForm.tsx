'use client'

/**
 * JobForm Component
 *
 * Reusable form for creating and editing job postings.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface JobFormData {
  title: string
  slug: string
  short_description: string
  full_description: string
  location_label: string
  employment_type: string
  is_remote_friendly: boolean
  min_comp_cents: number | null
  max_comp_cents: number | null
  comp_frequency: string | null
  application_instructions: string | null
  application_email: string | null
  application_url: string | null
  status: string
  priority: number
}

interface JobFormProps {
  initialData?: Partial<JobFormData>
  jobId?: string
  userId: string
  tenantId?: string
  onSuccess?: () => void
}

const EMPLOYMENT_OPTIONS = [
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'full_time', label: 'Full-Time' },
  { value: 'internship', label: 'Internship' },
  { value: 'contract', label: 'Contract' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open (Published)' },
  { value: 'closed', label: 'Closed' },
]

const COMP_FREQUENCY_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'hourly', label: 'Per Hour' },
  { value: 'weekly', label: 'Per Week' },
  { value: 'salary', label: 'Per Year (Salary)' },
  { value: 'stipend', label: 'Stipend' },
]

export default function JobForm({
  initialData,
  jobId,
  userId,
  tenantId,
  onSuccess,
}: JobFormProps) {
  const router = useRouter()
  const isEditing = Boolean(jobId)

  const [formData, setFormData] = useState<JobFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    short_description: initialData?.short_description || '',
    full_description: initialData?.full_description || '',
    location_label: initialData?.location_label || '',
    employment_type: initialData?.employment_type || 'seasonal',
    is_remote_friendly: initialData?.is_remote_friendly ?? false,
    min_comp_cents: initialData?.min_comp_cents || null,
    max_comp_cents: initialData?.max_comp_cents || null,
    comp_frequency: initialData?.comp_frequency || null,
    application_instructions: initialData?.application_instructions || null,
    application_email: initialData?.application_email || null,
    application_url: initialData?.application_url || null,
    status: initialData?.status || 'draft',
    priority: initialData?.priority ?? 0,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: prev.slug || generateSlug(value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const url = isEditing ? `/api/admin/jobs/${jobId}` : '/api/admin/jobs'
      const method = isEditing ? 'PATCH' : 'POST'

      const body = {
        ...formData,
        created_by_user_id: userId,
        tenant_id: tenantId,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const { data, error: apiError } = await res.json()

      if (apiError || !res.ok) {
        setError(apiError || 'Failed to save job posting')
        return
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/admin/jobs')
      }
    } catch (err) {
      console.error('Error saving job:', err)
      setError('Failed to save job posting. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-400/10 border border-red-400/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">
          Basic Information
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Camp Director, Assistant Coach"
              required
            />
          </div>

          <div>
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="auto-generated-from-title"
            />
            <p className="text-xs text-white/40 mt-1">
              Will appear as /careers/{formData.slug || 'your-slug'}
            </p>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              required
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="short_description">Short Description *</Label>
          <textarea
            id="short_description"
            value={formData.short_description}
            onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
            placeholder="A concise summary for the job card (1-2 sentences)"
            rows={2}
            className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none resize-none"
            required
          />
        </div>

        <div>
          <Label htmlFor="full_description">Full Description *</Label>
          <textarea
            id="full_description"
            value={formData.full_description}
            onChange={(e) => setFormData((prev) => ({ ...prev, full_description: e.target.value }))}
            placeholder="Detailed job description including responsibilities, requirements, and what makes this role special..."
            rows={10}
            className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none resize-y"
            required
          />
        </div>
      </div>

      {/* Location & Type */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">
          Location & Type
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="location_label">Location *</Label>
            <Input
              id="location_label"
              value={formData.location_label}
              onChange={(e) => setFormData((prev) => ({ ...prev, location_label: e.target.value }))}
              placeholder="e.g., Chicago, IL & suburbs"
              required
            />
          </div>

          <div>
            <Label htmlFor="employment_type">Employment Type *</Label>
            <select
              id="employment_type"
              value={formData.employment_type}
              onChange={(e) => setFormData((prev) => ({ ...prev, employment_type: e.target.value }))}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              required
            >
              {EMPLOYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_remote_friendly}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_remote_friendly: e.target.checked }))}
                className="w-5 h-5 bg-black border border-white/20 text-neon focus:ring-neon"
              />
              <span className="text-white">Remote-friendly position</span>
            </label>
          </div>
        </div>
      </div>

      {/* Compensation */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">
          Compensation (Optional)
        </h3>

        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <Label htmlFor="min_comp">Min Compensation ($)</Label>
            <Input
              id="min_comp"
              type="number"
              value={formData.min_comp_cents ? formData.min_comp_cents / 100 : ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  min_comp_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null,
                }))
              }
              placeholder="e.g., 15"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <Label htmlFor="max_comp">Max Compensation ($)</Label>
            <Input
              id="max_comp"
              type="number"
              value={formData.max_comp_cents ? formData.max_comp_cents / 100 : ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  max_comp_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null,
                }))
              }
              placeholder="e.g., 25"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <Label htmlFor="comp_frequency">Frequency</Label>
            <select
              id="comp_frequency"
              value={formData.comp_frequency || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  comp_frequency: e.target.value || null,
                }))
              }
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
            >
              {COMP_FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Application */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">
          Application Settings
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="application_email">Application Email</Label>
            <Input
              id="application_email"
              type="email"
              value={formData.application_email || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  application_email: e.target.value || null,
                }))
              }
              placeholder="jobs@empoweredsportscamp.com"
            />
          </div>

          <div>
            <Label htmlFor="application_url">Application URL</Label>
            <Input
              id="application_url"
              type="url"
              value={formData.application_url || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  application_url: e.target.value || null,
                }))
              }
              placeholder="https://forms.google.com/..."
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="application_instructions">Application Instructions</Label>
            <textarea
              id="application_instructions"
              value={formData.application_instructions || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  application_instructions: e.target.value || null,
                }))
              }
              placeholder="Any special instructions for applicants..."
              rows={3}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">
          Display Settings
        </h3>

        <div className="max-w-xs">
          <Label htmlFor="priority">Priority (Higher = More Prominent)</Label>
          <Input
            id="priority"
            type="number"
            value={formData.priority}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                priority: parseInt(e.target.value) || 0,
              }))
            }
            min="0"
            max="100"
          />
          <p className="text-xs text-white/40 mt-1">
            Jobs with higher priority appear first in listings.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/jobs')}
          disabled={saving}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" variant="neon" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update Job' : 'Create Job'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
