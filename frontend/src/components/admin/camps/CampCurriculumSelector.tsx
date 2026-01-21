'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { type CampCurriculumAssignment } from '@/lib/services/camp-schedule'
import { type CurriculumTemplate, SPORTS } from '@/lib/services/curriculum'
import {
  BookOpen,
  Search,
  Check,
  X,
  ChevronDown,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  Calendar,
  Users,
} from 'lucide-react'

interface CampCurriculumSelectorProps {
  campId: string
  campSport: string | null
  currentAssignment: CampCurriculumAssignment | null
  onAssigned: (assignment: CampCurriculumAssignment) => void
  canEdit: boolean
}

export function CampCurriculumSelector({
  campId,
  campSport,
  currentAssignment,
  onAssigned,
  canEdit,
}: CampCurriculumSelectorProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [templates, setTemplates] = useState<CurriculumTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sportFilter, setSportFilter] = useState(campSport || '')

  useEffect(() => {
    if (showPicker) {
      loadTemplates()
    }
  }, [showPicker])

  async function loadTemplates() {
    setLoading(true)
    try {
      const response = await fetch('/api/curriculum?action=templates', { credentials: 'include' })
      const result = await response.json()
      if (result.data) {
        setTemplates(result.data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
    setLoading(false)
  }

  async function handleSelectTemplate(templateId: string) {
    setAssigning(true)
    try {
      const response = await fetch('/api/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'assignTemplateToCamp', campId, templateId }),
      })
      const result = await response.json()

      if (!response.ok || result.error) {
        alert(result.error || 'Failed to assign template')
      } else if (result.data) {
        onAssigned(result.data)
        setShowPicker(false)
      }
    } catch (error) {
      console.error('Error assigning template:', error)
      alert('Failed to assign template')
    }
    setAssigning(false)
  }

  async function handleRemoveAssignment() {
    if (!confirm('Remove curriculum assignment from this camp?')) return

    setAssigning(true)
    try {
      const response = await fetch('/api/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'unassignTemplateFromCamp', campId }),
      })
      const result = await response.json()

      if (!response.ok || result.error) {
        alert(result.error || 'Failed to remove assignment')
      } else {
        onAssigned(null as any)
      }
    } catch (error) {
      console.error('Error removing assignment:', error)
      alert('Failed to remove assignment')
    }
    setAssigning(false)
  }

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (sportFilter && t.sport !== sportFilter) return false
    return true
  })

  // Sort: matching sport first
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (campSport) {
      const aMatch = a.sport === campSport ? 0 : 1
      const bMatch = b.sport === campSport ? 0 : 1
      if (aMatch !== bMatch) return aMatch - bMatch
    }
    return a.name.localeCompare(b.name)
  })

  // If template is assigned, show summary view
  if (currentAssignment?.template) {
    const template = currentAssignment.template
    const sportLabel = SPORTS.find((s) => s.value === template.sport)?.label || template.sport

    return (
      <div className="space-y-4">
        {/* Assigned Template Card */}
        <div className="p-4 bg-purple/10 border border-purple/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-purple" />
                <span className="text-sm text-purple font-bold uppercase tracking-wider">
                  Assigned Template
                </span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{template.name}</h4>
              <div className="flex flex-wrap gap-3 text-sm text-white/60">
                <span className="px-2 py-0.5 bg-purple/20 border border-purple/30 text-purple text-xs font-bold uppercase">
                  {sportLabel}
                </span>
                {template.age_min && template.age_max && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Ages {template.age_min}-{template.age_max}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {template.total_days} days
                </span>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPicker(true)}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/60 border border-white/20 hover:text-white hover:border-white/40 transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={handleRemoveAssignment}
                  disabled={assigning}
                  className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                  title="Remove assignment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Template Days Preview */}
        {template.days && template.days.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">Template Days</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {template.days
                .sort((a, b) => a.day_number - b.day_number)
                .map((day) => (
                  <div
                    key={day.id}
                    className="p-3 bg-white/5 border border-white/10"
                  >
                    <p className="text-sm font-bold text-white">Day {day.day_number}</p>
                    <p className="text-xs text-white/50 truncate">{day.title}</p>
                    {day.blocks && (
                      <p className="text-xs text-white/30 mt-1">
                        {day.blocks.length} activities
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        <Link
          href={`/admin/curriculum/templates/${currentAssignment.template_id}`}
          className="inline-flex items-center gap-1 text-sm text-purple hover:underline"
        >
          View full template
          <ExternalLink className="h-3 w-3" />
        </Link>

        {/* Template Picker Modal */}
        {showPicker && (
          <TemplatePicker
            templates={sortedTemplates}
            loading={loading}
            assigning={assigning}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sportFilter={sportFilter}
            setSportFilter={setSportFilter}
            campSport={campSport}
            selectedId={currentAssignment.template_id}
            onSelect={handleSelectTemplate}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    )
  }

  // No assignment - show buttons to assign
  return (
    <div className="space-y-4">
      <div className="p-6 border border-dashed border-white/20 text-center">
        <BookOpen className="h-10 w-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/50 mb-4">No curriculum template assigned to this camp yet.</p>

        {canEdit && (
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple text-white text-sm font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Choose Existing Template
            </button>
            <Link
              href="/admin/curriculum/templates/new"
              className="inline-flex items-center gap-2 px-4 py-2 border border-white/20 text-white/60 text-sm font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create New Template
            </Link>
          </div>
        )}
      </div>

      {/* Template Picker Modal */}
      {showPicker && (
        <TemplatePicker
          templates={sortedTemplates}
          loading={loading}
          assigning={assigning}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sportFilter={sportFilter}
          setSportFilter={setSportFilter}
          campSport={campSport}
          selectedId={null}
          onSelect={handleSelectTemplate}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

// Template Picker Modal
function TemplatePicker({
  templates,
  loading,
  assigning,
  searchTerm,
  setSearchTerm,
  sportFilter,
  setSportFilter,
  campSport,
  selectedId,
  onSelect,
  onClose,
}: {
  templates: CurriculumTemplate[]
  loading: boolean
  assigning: boolean
  searchTerm: string
  setSearchTerm: (s: string) => void
  sportFilter: string
  setSportFilter: (s: string) => void
  campSport: string | null
  selectedId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-dark-100 border border-white/10 w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white uppercase tracking-wider">
              Choose Curriculum Template
            </h3>
            <p className="text-sm text-white/50 mt-1">
              Select a template to assign to this camp
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-white/10 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none text-sm"
            />
          </div>
          <div className="relative">
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="pl-4 pr-10 py-2 bg-black border border-white/20 text-white focus:border-purple focus:outline-none appearance-none text-sm"
            >
              <option value="">All Sports</option>
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 text-purple animate-spin mx-auto" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center text-white/40">
              No templates found matching your criteria.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => {
                const sportConfig = SPORTS.find((s) => s.value === template.sport)
                const isSelected = selectedId === template.id
                const isMatchingSport = template.sport === campSport

                return (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template.id)}
                    disabled={assigning}
                    className={cn(
                      'w-full p-4 border text-left transition-all disabled:opacity-50',
                      isSelected
                        ? 'bg-purple/10 border-purple'
                        : 'bg-black border-white/20 hover:border-white/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white">{template.name}</span>
                          {isMatchingSport && (
                            <span className="px-2 py-0.5 text-xs bg-neon/20 text-neon border border-neon/30">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span
                            className={cn(
                              'px-2 py-0.5 font-bold uppercase tracking-wider border',
                              isMatchingSport
                                ? 'bg-purple/10 text-purple border-purple/30'
                                : 'bg-white/5 text-white/40 border-white/10'
                            )}
                          >
                            {sportConfig?.label || template.sport}
                          </span>
                          {template.age_min && template.age_max && (
                            <span>Ages {template.age_min}-{template.age_max}</span>
                          )}
                          <span>{template.total_days} days</span>
                        </div>
                        {template.description && (
                          <p className="text-xs text-white/40 mt-2 line-clamp-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          'h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          isSelected ? 'border-purple bg-purple' : 'border-white/30'
                        )}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            Click a template to assign it to this camp
          </p>
        </div>
      </div>
    </div>
  )
}
