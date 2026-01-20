'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  CurriculumTemplate,
  SPORTS,
} from '@/lib/services/curriculum'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  Link2,
  Unlink,
  BookOpen,
  Users,
  Filter,
  ChevronDown,
  X,
} from 'lucide-react'

interface CampWithAssignment {
  id: string
  name: string
  sport: string
  start_date: string
  end_date: string
  tenant_id: string | null
  assigned_template_id?: string
  assigned_template_name?: string
}

export default function CurriculumAssignmentPage() {
  const { user, role, isHqAdmin } = useAuth()

  const [camps, setCamps] = useState<CampWithAssignment[]>([])
  const [templates, setTemplates] = useState<CurriculumTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [showAssigned, setShowAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all')

  // Modal states
  const [assigningCamp, setAssigningCamp] = useState<CampWithAssignment | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [campsRes, templatesRes] = await Promise.all([
        fetch('/api/curriculum?action=campsForAssignment', { credentials: 'include' }),
        fetch('/api/curriculum?action=templates', { credentials: 'include' }),
      ])

      const campsResult = await campsRes.json()
      const templatesResult = await templatesRes.json()

      if (campsResult.data) {
        setCamps(campsResult.data)
      } else {
        setError(campsResult.error || 'Failed to load camps')
      }

      if (templatesResult.data) {
        setTemplates(templatesResult.data)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    }

    setLoading(false)
  }

  const handleAssign = async () => {
    if (!assigningCamp || !selectedTemplateId) return

    setSaving(true)
    try {
      const response = await fetch('/api/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'assignTemplateToCamp',
          camp_id: assigningCamp.id,
          template_id: selectedTemplateId,
        }),
      })
      const result = await response.json()

      if (!response.ok || result.error) {
        alert(result.error || 'Failed to assign template')
      } else {
        // Update local state
        const template = templates.find(t => t.id === selectedTemplateId)
        setCamps(prev => prev.map(c =>
          c.id === assigningCamp.id
            ? { ...c, assigned_template_id: selectedTemplateId, assigned_template_name: template?.name }
            : c
        ))
        setSuccess(`Template assigned to ${assigningCamp.name}`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      console.error('Error assigning template:', err)
      alert('Failed to assign template')
    }

    setAssigningCamp(null)
    setSelectedTemplateId(null)
    setSaving(false)
  }

  const handleUnassign = async (camp: CampWithAssignment) => {
    if (!confirm(`Remove curriculum from "${camp.name}"?`)) return

    setSaving(true)
    try {
      const response = await fetch('/api/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'unassignTemplateFromCamp', campId: camp.id }),
      })
      const result = await response.json()

      if (!response.ok || result.error) {
        alert(result.error || 'Failed to remove assignment')
      } else {
        setCamps(prev => prev.map(c =>
          c.id === camp.id
            ? { ...c, assigned_template_id: undefined, assigned_template_name: undefined }
            : c
        ))
        setSuccess(`Curriculum removed from ${camp.name}`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      console.error('Error removing assignment:', err)
      alert('Failed to remove assignment')
    }

    setSaving(false)
  }

  // Filter camps
  const filteredCamps = camps.filter(camp => {
    if (searchTerm && !camp.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (sportFilter && camp.sport !== sportFilter) return false
    if (showAssigned === 'assigned' && !camp.assigned_template_id) return false
    if (showAssigned === 'unassigned' && camp.assigned_template_id) return false
    return true
  })

  // Get unique sports from camps
  const campSports = [...new Set(camps.map(c => c.sport))]

  if (loading) {
    return (
      <AdminLayout userRole={role || 'hq_admin'} userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
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
        title="Curriculum Assignment"
        description="Assign curriculum templates to your camps"
      >
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Calendar className="h-4 w-4" />
          {filteredCamps.length} upcoming camps
        </div>
      </PageHeader>

      {/* Success Banner */}
      {success && (
        <div className="mb-6 p-4 bg-neon/10 border border-neon/30 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="h-5 w-5 text-neon flex-shrink-0" />
          <p className="text-neon font-medium">{success}</p>
        </div>
      )}

      {/* Filters */}
      <ContentCard className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search camps..."
              className="w-full pl-10 pr-4 py-2 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none text-sm"
            />
          </div>

          {/* Sport Filter */}
          <div className="relative">
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="pl-4 pr-10 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none text-sm min-w-[150px]"
            >
              <option value="">All Sports</option>
              {campSports.map(sport => {
                const sportConfig = SPORTS.find(s => s.value === sport)
                return (
                  <option key={sport} value={sport}>{sportConfig?.label || sport}</option>
                )
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          </div>

          {/* Assignment Filter */}
          <div className="flex items-center gap-1 bg-black border border-white/20">
            {(['all', 'assigned', 'unassigned'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setShowAssigned(option)}
                className={cn(
                  'px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                  showAssigned === option
                    ? 'bg-neon text-dark-200'
                    : 'text-white/50 hover:text-white'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </ContentCard>

      {/* Empty State */}
      {filteredCamps.length === 0 && (
        <ContentCard>
          <div className="py-12 text-center">
            <Calendar className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Camps Found</h3>
            <p className="text-white/50">
              {camps.length === 0
                ? 'No upcoming camps available for curriculum assignment.'
                : 'No camps match your current filters.'}
            </p>
          </div>
        </ContentCard>
      )}

      {/* Camp List */}
      <div className="space-y-4">
        {filteredCamps.map((camp) => {
          const sportConfig = SPORTS.find(s => s.value === camp.sport)
          const startDate = new Date(camp.start_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
          const endDate = new Date(camp.end_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          return (
            <div
              key={camp.id}
              className={cn(
                'bg-dark-100 border transition-colors',
                camp.assigned_template_id
                  ? 'border-neon/30 hover:border-neon/50'
                  : 'border-white/10 hover:border-white/20'
              )}
            >
              <div className="p-6 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                  {/* Camp Icon */}
                  <div className={cn(
                    'h-12 w-12 flex items-center justify-center flex-shrink-0',
                    camp.assigned_template_id
                      ? 'bg-neon/10 border border-neon/30'
                      : 'bg-white/5 border border-white/10'
                  )}>
                    {camp.assigned_template_id ? (
                      <CheckCircle className="h-6 w-6 text-neon" />
                    ) : (
                      <Calendar className="h-6 w-6 text-white/30" />
                    )}
                  </div>

                  {/* Camp Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white mb-1">{camp.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-white/50">
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-bold uppercase tracking-wider border',
                        'bg-purple/10 text-purple border-purple/30'
                      )}>
                        {sportConfig?.label || camp.sport}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {startDate} - {endDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assignment Info & Actions */}
                <div className="flex items-center gap-4">
                  {camp.assigned_template_id ? (
                    <>
                      <div className="text-right">
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Assigned Curriculum</p>
                        <Link
                          href={`/admin/curriculum/templates/${camp.assigned_template_id}`}
                          className="text-neon font-medium hover:underline"
                        >
                          {camp.assigned_template_name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setAssigningCamp(camp)
                            setSelectedTemplateId(camp.assigned_template_id || null)
                          }}
                          className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/60 border border-white/20 hover:text-white hover:border-white/40 transition-colors"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => handleUnassign(camp)}
                          disabled={saving}
                          className="p-2 text-white/40 hover:text-red-400 transition-colors"
                          title="Remove assignment"
                        >
                          <Unlink className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setAssigningCamp(camp)
                        setSelectedTemplateId(null)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-magenta text-white text-sm font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors"
                    >
                      <Link2 className="h-4 w-4" />
                      Assign Curriculum
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Assign Modal */}
      {assigningCamp && (
        <AssignTemplateModal
          camp={assigningCamp}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelect={setSelectedTemplateId}
          onClose={() => {
            setAssigningCamp(null)
            setSelectedTemplateId(null)
          }}
          onAssign={handleAssign}
          saving={saving}
        />
      )}
    </AdminLayout>
  )
}

function AssignTemplateModal({
  camp,
  templates,
  selectedTemplateId,
  onSelect,
  onClose,
  onAssign,
  saving,
}: {
  camp: CampWithAssignment
  templates: CurriculumTemplate[]
  selectedTemplateId: string | null
  onSelect: (id: string) => void
  onClose: () => void
  onAssign: () => void
  saving: boolean
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sportFilter, setSportFilter] = useState(camp.sport || '')

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (sportFilter && t.sport !== sportFilter) return false
    return true
  })

  // Get matching templates (same sport as camp) first
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    const aMatches = a.sport === camp.sport ? 0 : 1
    const bMatches = b.sport === camp.sport ? 0 : 1
    return aMatches - bMatches
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-dark-100 border border-white/10 w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white uppercase tracking-wider">Assign Curriculum</h3>
            <p className="text-sm text-white/50 mt-1">{camp.name}</p>
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
              className="w-full pl-10 pr-4 py-2 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none text-sm"
            />
          </div>
          <div className="relative">
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="pl-4 pr-10 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none text-sm"
            >
              <option value="">All Sports</option>
              {SPORTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedTemplates.length === 0 ? (
            <div className="py-8 text-center text-white/40">
              No templates found matching your criteria.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTemplates.map(template => {
                const sportConfig = SPORTS.find(s => s.value === template.sport)
                const isSelected = selectedTemplateId === template.id
                const isMatchingSport = template.sport === camp.sport

                return (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template.id)}
                    className={cn(
                      'w-full p-4 border text-left transition-all',
                      isSelected
                        ? 'bg-neon/10 border-neon'
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
                          <span className={cn(
                            'px-2 py-0.5 font-bold uppercase tracking-wider border',
                            isMatchingSport
                              ? 'bg-purple/10 text-purple border-purple/30'
                              : 'bg-white/5 text-white/40 border-white/10'
                          )}>
                            {sportConfig?.label || template.sport}
                          </span>
                          {template.age_min && template.age_max && (
                            <span>Ages {template.age_min}-{template.age_max}</span>
                          )}
                          <span>{template.total_days} days</span>
                          <span className="capitalize">{template.difficulty}</span>
                        </div>
                        {template.description && (
                          <p className="text-xs text-white/40 mt-2 line-clamp-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <div className={cn(
                        'h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        isSelected
                          ? 'border-neon bg-neon'
                          : 'border-white/30'
                      )}>
                        {isSelected && <CheckCircle className="h-4 w-4 text-dark-200" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onAssign}
            disabled={!selectedTemplateId || saving}
            className="flex-1 py-3 bg-neon text-dark-200 font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Assign Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
