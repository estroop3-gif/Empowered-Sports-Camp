'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { CampCreateStepper, getStepsForCurrentStep } from '@/components/admin/camps/CampCreateStepper'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Shield,
  Loader2,
  AlertCircle,
  FileText,
  Check,
  Globe,
  Building2,
  Plus,
  X,
} from 'lucide-react'

interface CampFormData {
  name: string
  slug: string
  description: string
  sport: string
  location_id: string | null
  venue_id: string | null
  tenant_id: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  age_min: number
  age_max: number
  capacity: number
  price: number
  early_bird_price: number | null
  early_bird_deadline: string | null
  status: 'draft' | 'published' | 'open' | 'closed'
  featured: boolean
  image_url: string | null
  selectedTerritoryId?: string
}

interface ScheduleTemplate {
  id: string
  name: string
  description: string | null
  isDefault: boolean
}

interface WaiverTemplate {
  id: string
  title: string
  description: string | null
  isMandatorySiteWide: boolean
  isActive: boolean
  currentVersion: number
  tenant: { id: string; name: string } | null
}

export default function CampCreateSchedulePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<CampFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Schedule template selection
  const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  // Waiver selection
  const [availableWaivers, setAvailableWaivers] = useState<WaiverTemplate[]>([])
  const [selectedWaiverIds, setSelectedWaiverIds] = useState<string[]>([])
  const [loadingWaivers, setLoadingWaivers] = useState(true)
  const [showWaiverPicker, setShowWaiverPicker] = useState(false)

  useEffect(() => {
    // Load form data from sessionStorage
    const savedData = sessionStorage.getItem('campCreateFormData')
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData))
      } catch {
        setError('Failed to load camp data. Please start over.')
      }
    } else {
      setError('No camp data found. Please start from the beginning.')
    }
    setLoading(false)

    // Load schedule templates and waivers
    loadScheduleTemplates()
    loadWaivers()
  }, [])

  async function loadScheduleTemplates() {
    setLoadingTemplates(true)
    try {
      const response = await fetch('/api/schedule-templates')
      if (response.ok) {
        const result = await response.json()
        const templates = result.data || result.templates || []
        setScheduleTemplates(templates)
        // Auto-select default template if available
        const defaultTemplate = templates.find((t: ScheduleTemplate) => t.isDefault)
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id)
        }
      }
    } catch (err) {
      console.error('Failed to load schedule templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  async function loadWaivers() {
    setLoadingWaivers(true)
    try {
      const response = await fetch('/api/admin/waivers')
      if (response.ok) {
        const data = await response.json()
        const activeWaivers = (data.waivers || []).filter((w: WaiverTemplate) => w.isActive)
        setAvailableWaivers(activeWaivers)
        // Auto-select mandatory site-wide waivers
        const mandatoryIds = activeWaivers
          .filter((w: WaiverTemplate) => w.isMandatorySiteWide)
          .map((w: WaiverTemplate) => w.id)
        setSelectedWaiverIds(mandatoryIds)
      }
    } catch (err) {
      console.error('Failed to load waivers:', err)
    } finally {
      setLoadingWaivers(false)
    }
  }

  const toggleWaiver = (waiverId: string, isMandatory: boolean) => {
    if (isMandatory) return // Can't unselect mandatory waivers
    setSelectedWaiverIds(prev =>
      prev.includes(waiverId)
        ? prev.filter(id => id !== waiverId)
        : [...prev, waiverId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return

    setSaving(true)
    setError(null)

    try {
      // Create the camp
      const campResponse = await fetch('/api/admin/camps?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!campResponse.ok) {
        const errorData = await campResponse.json()
        throw new Error(errorData.error || 'Failed to create camp')
      }

      const campData = await campResponse.json()
      const campId = campData.camp.id

      // Apply schedule template if selected
      if (selectedTemplateId) {
        try {
          await fetch(`/api/camps/${campId}/hq/schedule/apply-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: selectedTemplateId }),
          })
        } catch (err) {
          console.error('Failed to apply schedule template:', err)
        }
      }

      // Assign waivers if any selected
      if (selectedWaiverIds.length > 0) {
        try {
          const waiverRequirements = selectedWaiverIds.map((id, index) => ({
            waiverTemplateId: id,
            displayOrder: index + 1,
            isRequired: true,
          }))
          await fetch(`/api/camps/${campId}/waivers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirements: waiverRequirements }),
          })
        } catch (err) {
          console.error('Failed to assign waivers:', err)
        }
      }

      // Clear session storage
      sessionStorage.removeItem('campCreateFormData')

      // Navigate to success page with camp info
      const successUrl = `/admin/camps/new/success?campId=${campId}&name=${encodeURIComponent(formData.name)}`
      router.replace(successUrl)
    } catch (err) {
      console.error('Failed to create camp:', err)
      setError(err instanceof Error ? err.message : 'Failed to create camp')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  if (!formData) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Session Expired</h2>
          <p className="text-white/50 mb-6">{error || 'Please start the camp creation process again.'}</p>
          <Link
            href="/admin/camps/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" />
            Start Over
          </Link>
        </div>
      </AdminLayout>
    )
  }

  // Get selected waiver objects for display
  const selectedWaivers = availableWaivers.filter(w => selectedWaiverIds.includes(w.id))
  const unselectedWaivers = availableWaivers.filter(w => !selectedWaiverIds.includes(w.id))

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="mb-6">
        <Link
          href="/admin/camps/new"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Basic Details
        </Link>
      </div>

      <PageHeader
        title="Schedule & Waivers"
        description={`Setting up: ${formData.name}`}
      />

      {/* Wizard Stepper */}
      <CampCreateStepper steps={getStepsForCurrentStep(2)} currentStep={2} />

      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta flex-shrink-0" />
          <p className="text-magenta">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Schedule Template Selection */}
            <ContentCard title="Schedule Template" accent="purple">
              <div className="space-y-4">
                <p className="text-sm text-white/60">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Select a schedule template to apply to all camp days. You can customize individual days after creation.
                </p>

                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple" />
                  </div>
                ) : scheduleTemplates.length === 0 ? (
                  <div className="p-6 text-center bg-black/30 border border-white/10">
                    <FileText className="h-8 w-8 text-white/20 mx-auto mb-3" />
                    <p className="text-white/50 text-sm">No schedule templates available.</p>
                    <p className="text-white/40 text-xs mt-1">You can build schedules manually after creation.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* No template option */}
                    <label
                      className={`flex items-start gap-3 p-4 cursor-pointer border transition-all ${
                        selectedTemplateId === null
                          ? 'border-purple bg-purple/10'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        checked={selectedTemplateId === null}
                        onChange={() => setSelectedTemplateId(null)}
                        className="mt-1"
                      />
                      <div>
                        <div className={`font-bold ${selectedTemplateId === null ? 'text-purple' : 'text-white'}`}>
                          Build Schedule Manually
                        </div>
                        <div className="text-sm text-white/50">Skip template and create schedule from scratch</div>
                      </div>
                    </label>

                    {scheduleTemplates.map(template => (
                      <label
                        key={template.id}
                        className={`flex items-start gap-3 p-4 cursor-pointer border transition-all ${
                          selectedTemplateId === template.id
                            ? 'border-purple bg-purple/10'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="template"
                          checked={selectedTemplateId === template.id}
                          onChange={() => setSelectedTemplateId(template.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${selectedTemplateId === template.id ? 'text-purple' : 'text-white'}`}>
                              {template.name}
                            </span>
                            {template.isDefault && (
                              <span className="px-2 py-0.5 text-xs bg-purple/20 text-purple border border-purple/30">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <div className="text-sm text-white/50 mt-1">{template.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </ContentCard>

            {/* Waiver Selection */}
            <ContentCard title="Required Waivers" accent="magenta">
              <div className="space-y-4">
                <p className="text-sm text-white/60">
                  <Shield className="h-4 w-4 inline mr-2" />
                  Select waiver templates that parents must sign during registration.
                </p>

                {loadingWaivers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-magenta" />
                  </div>
                ) : availableWaivers.length === 0 ? (
                  <div className="p-6 text-center bg-black/30 border border-white/10">
                    <Shield className="h-8 w-8 text-white/20 mx-auto mb-3" />
                    <p className="text-white/50 text-sm">No waiver templates available.</p>
                    <Link href="/admin/waivers" className="text-neon text-sm hover:underline">
                      Create waivers in settings
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Selected waivers */}
                    <div className="space-y-2">
                      {selectedWaivers.length === 0 ? (
                        <div className="p-4 text-center border border-dashed border-white/20 text-white/40 text-sm">
                          No waivers selected. Click "Add Waiver" below.
                        </div>
                      ) : (
                        selectedWaivers.map(waiver => (
                          <div
                            key={waiver.id}
                            className="flex items-center justify-between p-4 bg-magenta/5 border border-magenta/20"
                          >
                            <div className="flex items-center gap-3">
                              <Check className="h-5 w-5 text-magenta" />
                              <div>
                                <div className="font-medium text-white flex items-center gap-2">
                                  {waiver.title}
                                  {waiver.isMandatorySiteWide && (
                                    <span className="px-2 py-0.5 text-xs bg-magenta/20 text-magenta">
                                      MANDATORY
                                    </span>
                                  )}
                                </div>
                                {waiver.description && (
                                  <div className="text-sm text-white/50">{waiver.description}</div>
                                )}
                              </div>
                            </div>
                            {!waiver.isMandatorySiteWide && (
                              <button
                                type="button"
                                onClick={() => toggleWaiver(waiver.id, false)}
                                className="p-2 hover:bg-magenta/20 transition-colors"
                              >
                                <X className="h-4 w-4 text-white/50 hover:text-white" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add waiver button */}
                    {unselectedWaivers.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowWaiverPicker(!showWaiverPicker)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-neon border border-neon/30 hover:bg-neon/10 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add Waiver
                        </button>

                        {showWaiverPicker && (
                          <>
                            <div
                              className="fixed inset-0 z-[60]"
                              onClick={() => setShowWaiverPicker(false)}
                            />
                            <div className="absolute z-[70] left-0 top-full mt-2 w-96 bg-dark-100 border border-white/20 shadow-2xl max-h-80 overflow-y-auto">
                              {unselectedWaivers.map(waiver => (
                                <button
                                  key={waiver.id}
                                  type="button"
                                  onClick={() => {
                                    toggleWaiver(waiver.id, false)
                                    setShowWaiverPicker(false)
                                  }}
                                  className="flex items-center gap-3 w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                >
                                  <Shield className="h-4 w-4 text-white/40 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white flex items-center gap-2">
                                      {waiver.title}
                                      {waiver.tenant ? (
                                        <span className="flex items-center gap-1 text-xs text-white/40">
                                          <Building2 className="h-3 w-3" />
                                          {waiver.tenant.name}
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-xs text-purple">
                                          <Globe className="h-3 w-3" />
                                          HQ
                                        </span>
                                      )}
                                    </div>
                                    {waiver.description && (
                                      <div className="text-sm text-white/50 truncate">{waiver.description}</div>
                                    )}
                                  </div>
                                  <Plus className="h-4 w-4 text-neon flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 space-y-6">
              <ContentCard title="Camp Summary" accent="neon">
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Name</span>
                    <span className="text-white font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Dates</span>
                    <span className="text-white">
                      {new Date(formData.start_date).toLocaleDateString()} - {new Date(formData.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Ages</span>
                    <span className="text-white">{formData.age_min} - {formData.age_max}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Price</span>
                    <span className="text-neon font-bold">${formData.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Status</span>
                    <span className="text-white capitalize">{formData.status}</span>
                  </div>
                </div>
              </ContentCard>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating Camp...
                    </>
                  ) : (
                    <>
                      Create Camp
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                <Link
                  href="/admin/camps/new"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
