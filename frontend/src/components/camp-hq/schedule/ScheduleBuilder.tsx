'use client'

/**
 * Schedule Builder Component
 *
 * Main container for the schedule builder in Camp HQ.
 * Manages state for days, blocks, and provides editing functionality.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Plus,
  Loader2,
  BookOpen,
  Copy,
  AlertCircle,
  Save,
  FileStack,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScheduleDayView } from './ScheduleDayView'
import { DayNavigator } from './DayNavigator'
import { CurriculumBrowser } from './CurriculumBrowser'
import { BlockEditModal } from './BlockEditModal'
import { ApplyCurriculumModal } from './ApplyCurriculumModal'
import type { CampScheduleDay, CampScheduleBlock, CreateBlockInput, ScheduleTemplate } from '@/lib/services/campSchedule'

interface ScheduleBuilderProps {
  campId: string
  canEdit?: boolean
}

export function ScheduleBuilder({ campId, canEdit = true }: ScheduleBuilderProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<CampScheduleDay[]>([])
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [showCurriculumBrowser, setShowCurriculumBrowser] = useState(false)
  const [showApplyCurriculumModal, setShowApplyCurriculumModal] = useState(false)
  const [showBlockEditModal, setShowBlockEditModal] = useState(false)
  const [editingBlock, setEditingBlock] = useState<CampScheduleBlock | null>(null)
  const [assignedCurriculum, setAssignedCurriculum] = useState<{
    templateId: string
    templateName: string
    templateSport: string | null
    totalDays: number
  } | null>(null)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false)
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false)
  const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')

  // Load schedule days
  const loadSchedule = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/camps/${campId}/hq/schedule`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load schedule')
      setDays(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [campId])

  // Load assigned curriculum
  const loadAssignedCurriculum = useCallback(async () => {
    try {
      const res = await fetch(`/api/camps/${campId}/hq/schedule/apply-curriculum`)
      const json = await res.json()
      if (res.ok && json.data) {
        setAssignedCurriculum(json.data)
      }
    } catch (err) {
      console.error('Failed to load curriculum assignment:', err)
    }
  }, [campId])

  // Load schedule templates
  const loadScheduleTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule-templates')
      const json = await res.json()
      if (res.ok && json.data) {
        setScheduleTemplates(json.data)
      }
    } catch (err) {
      console.error('Failed to load schedule templates:', err)
    }
  }, [])

  useEffect(() => {
    loadSchedule()
    loadAssignedCurriculum()
    loadScheduleTemplates()
  }, [loadSchedule, loadAssignedCurriculum, loadScheduleTemplates])

  const selectedDay = days[selectedDayIndex] || null

  // Create a new schedule day
  const handleCreateDay = async () => {
    setSaving(true)
    try {
      const nextDayNumber = days.length + 1
      const res = await fetch(`/api/camps/${campId}/hq/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayNumber: nextDayNumber,
          title: `Day ${nextDayNumber}`,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create day')
      setDays([...days, json.data])
      setSelectedDayIndex(days.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create day')
    } finally {
      setSaving(false)
    }
  }

  // Create a new block
  const handleCreateBlock = async (input: CreateBlockInput) => {
    if (!selectedDay) return
    setSaving(true)
    try {
      const res = await fetch(`/api/camps/${campId}/hq/schedule/${selectedDay.id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create block')

      // Update local state
      setDays(days.map(d =>
        d.id === selectedDay.id
          ? { ...d, scheduleBlocks: [...d.scheduleBlocks, json.data] }
          : d
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create block')
    } finally {
      setSaving(false)
    }
  }

  // Update a block
  const handleUpdateBlock = async (blockId: string, updates: Partial<CampScheduleBlock>) => {
    if (!selectedDay) return
    setSaving(true)
    try {
      const res = await fetch(`/api/camps/${campId}/hq/schedule/${selectedDay.id}/blocks/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update block')

      // Update local state
      setDays(days.map(d =>
        d.id === selectedDay.id
          ? { ...d, scheduleBlocks: d.scheduleBlocks.map(b => b.id === blockId ? json.data : b) }
          : d
      ))
      setShowBlockEditModal(false)
      setEditingBlock(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update block')
    } finally {
      setSaving(false)
    }
  }

  // Delete a block
  const handleDeleteBlock = async (blockId: string) => {
    if (!selectedDay) return
    setSaving(true)
    try {
      const res = await fetch(`/api/camps/${campId}/hq/schedule/${selectedDay.id}/blocks/${blockId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to delete block')
      }

      // Update local state
      setDays(days.map(d =>
        d.id === selectedDay.id
          ? { ...d, scheduleBlocks: d.scheduleBlocks.filter(b => b.id !== blockId) }
          : d
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete block')
    } finally {
      setSaving(false)
    }
  }

  // Reorder blocks
  const handleReorderBlocks = async (newOrder: { id: string; orderIndex: number }[]) => {
    if (!selectedDay) return

    // Optimistic update
    const reorderedBlocks = [...selectedDay.scheduleBlocks].sort((a, b) => {
      const aOrder = newOrder.find(o => o.id === a.id)?.orderIndex ?? a.orderIndex
      const bOrder = newOrder.find(o => o.id === b.id)?.orderIndex ?? b.orderIndex
      return aOrder - bOrder
    })
    setDays(days.map(d =>
      d.id === selectedDay.id
        ? { ...d, scheduleBlocks: reorderedBlocks }
        : d
    ))

    try {
      const res = await fetch(`/api/camps/${campId}/hq/schedule/${selectedDay.id}/blocks/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockOrder: newOrder }),
      })
      if (!res.ok) {
        // Revert on error
        await loadSchedule()
      }
    } catch (err) {
      console.error('Failed to reorder blocks:', err)
      await loadSchedule()
    }
  }

  // Apply curriculum template
  const handleApplyCurriculum = async (startTime: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/camps/${campId}/hq/schedule/apply-curriculum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campStartTime: startTime }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to apply curriculum')

      await loadSchedule()
      setShowApplyCurriculumModal(false)
      setSelectedDayIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply curriculum')
    } finally {
      setSaving(false)
    }
  }

  // Insert curriculum block
  const handleInsertCurriculumBlock = async (curriculumBlock: {
    id: string
    title: string
    durationMinutes: number
    category: string | null
  }) => {
    if (!selectedDay) return

    // Calculate next time slot
    const lastBlock = selectedDay.scheduleBlocks[selectedDay.scheduleBlocks.length - 1]
    let startTime = '09:00'
    if (lastBlock) {
      startTime = lastBlock.endTime
    }

    // Calculate end time based on duration
    const [hours, mins] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + mins + curriculumBlock.durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMins = totalMinutes % 60
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`

    await handleCreateBlock({
      startTime,
      endTime,
      label: curriculumBlock.title,
      curriculumBlockId: curriculumBlock.id,
      blockType: 'curriculum',
    })

    setShowCurriculumBrowser(false)
  }

  // Edit block
  const handleEditBlock = (block: CampScheduleBlock) => {
    setEditingBlock(block)
    setShowBlockEditModal(true)
  }

  // Save schedule as template
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/camps/${campId}/hq/schedule/save-as-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save template')

      // Reset and close modal
      setTemplateName('')
      setTemplateDescription('')
      setShowSaveTemplateModal(false)
      await loadScheduleTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Apply schedule template
  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return
    setSaving(true)
    try {
      const res = await fetch(`/api/camps/${campId}/hq/schedule/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to apply template')

      await loadSchedule()
      setSelectedTemplate(null)
      setShowApplyTemplateModal(false)
      setSelectedDayIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template')
    } finally {
      setSaving(false)
    }
  }

  // Open apply template modal
  const handleSelectTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template)
    setShowApplyTemplateModal(true)
    setShowTemplatesDropdown(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  // Empty state - no days yet
  if (days.length === 0) {
    return (
      <div className="bg-dark-100 border border-white/10 p-8">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Schedule Yet</h3>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            Build your camp schedule from scratch or apply a curriculum template to get started.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-md mx-auto">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {assignedCurriculum && (
              <button
                onClick={() => setShowApplyCurriculumModal(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                <BookOpen className="h-4 w-4" />
                Apply Curriculum
              </button>
            )}
            {scheduleTemplates.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-purple/30 bg-purple/10 text-purple font-bold uppercase tracking-wider hover:bg-purple/20 transition-colors disabled:opacity-50"
                >
                  <FileStack className="h-4 w-4" />
                  Use Template
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showTemplatesDropdown && (
                  <div className="absolute top-full mt-2 left-0 w-64 bg-dark-100 border border-white/20 shadow-xl z-50">
                    <div className="p-2 border-b border-white/10">
                      <p className="text-xs text-white/40 uppercase tracking-wider">Schedule Templates</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {scheduleTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                        >
                          <p className="text-sm font-medium text-white">{template.name}</p>
                          <p className="text-xs text-white/50">
                            {template.totalDays} day{template.totalDays !== 1 ? 's' : ''} • {template.blocks.length} blocks
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleCreateDay}
              disabled={saving}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-wider transition-colors disabled:opacity-50",
                (assignedCurriculum || scheduleTemplates.length > 0)
                  ? "border border-white/20 text-white hover:bg-white/5"
                  : "bg-neon text-black hover:bg-neon/90"
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Manual Schedule
            </button>
          </div>

          {assignedCurriculum && (
            <p className="mt-4 text-sm text-white/40">
              Curriculum assigned: <span className="text-neon">{assignedCurriculum.templateName}</span>
            </p>
          )}
        </div>

        {/* Apply Curriculum Modal */}
        {showApplyCurriculumModal && assignedCurriculum && (
          <ApplyCurriculumModal
            templateName={assignedCurriculum.templateName}
            templateSport={assignedCurriculum.templateSport}
            totalDays={assignedCurriculum.totalDays}
            onApply={handleApplyCurriculum}
            onClose={() => setShowApplyCurriculumModal(false)}
            saving={saving}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Header with Day Navigator */}
      <div className="bg-dark-100 border border-white/10 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <DayNavigator
            days={days}
            selectedIndex={selectedDayIndex}
            onSelectDay={setSelectedDayIndex}
            onCreateDay={canEdit ? handleCreateDay : undefined}
          />

          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaveTemplateModal(true)}
                disabled={days.length === 0 || saving}
                className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold uppercase tracking-wider disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save as Template
              </button>
              <button
                onClick={() => setShowCurriculumBrowser(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple/10 border border-purple/30 text-purple hover:bg-purple/20 transition-colors text-sm font-bold uppercase tracking-wider"
              >
                <BookOpen className="h-4 w-4" />
                Add from Curriculum
              </button>
              <button
                onClick={() => handleCreateBlock({
                  startTime: selectedDay?.scheduleBlocks.length
                    ? selectedDay.scheduleBlocks[selectedDay.scheduleBlocks.length - 1].endTime
                    : '09:00',
                  endTime: '09:30',
                  label: 'New Block',
                  blockType: 'activity',
                })}
                disabled={!selectedDay || saving}
                className="flex items-center gap-2 px-4 py-2 bg-neon text-black hover:bg-neon/90 transition-colors text-sm font-bold uppercase tracking-wider disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Block
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Day View */}
      {selectedDay && (
        <ScheduleDayView
          day={selectedDay}
          canEdit={canEdit}
          onEditBlock={handleEditBlock}
          onDeleteBlock={handleDeleteBlock}
          onReorderBlocks={handleReorderBlocks}
        />
      )}

      {/* Curriculum Browser Slide-out */}
      {showCurriculumBrowser && (
        <CurriculumBrowser
          onInsertBlock={handleInsertCurriculumBlock}
          onClose={() => setShowCurriculumBrowser(false)}
        />
      )}

      {/* Block Edit Modal */}
      {showBlockEditModal && editingBlock && (
        <BlockEditModal
          block={editingBlock}
          onSave={(updates) => handleUpdateBlock(editingBlock.id, updates)}
          onClose={() => {
            setShowBlockEditModal(false)
            setEditingBlock(null)
          }}
          saving={saving}
        />
      )}

      {/* Apply Curriculum Modal */}
      {showApplyCurriculumModal && assignedCurriculum && (
        <ApplyCurriculumModal
          templateName={assignedCurriculum.templateName}
          templateSport={assignedCurriculum.templateSport}
          totalDays={assignedCurriculum.totalDays}
          onApply={handleApplyCurriculum}
          onClose={() => setShowApplyCurriculumModal(false)}
          saving={saving}
        />
      )}

      {/* Save as Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowSaveTemplateModal(false)} />
          <div className="relative w-full max-w-md bg-dark-100 border border-white/20">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-neon" />
                <h2 className="text-lg font-bold text-white">Save as Template</h2>
              </div>
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-white/50">
                Save this schedule as a reusable template for future camps.
              </p>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Standard 5-Day Camp"
                  className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe this schedule template..."
                  rows={3}
                  className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                />
              </div>
              <div className="p-3 bg-white/5 border border-white/10 text-sm text-white/50">
                This will save {days.length} day{days.length !== 1 ? 's' : ''} with all schedule blocks.
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={saving || !templateName.trim()}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider transition-all',
                    saving || !templateName.trim()
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-neon text-black hover:bg-neon/90'
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Template
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Schedule Template Modal */}
      {showApplyTemplateModal && selectedTemplate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowApplyTemplateModal(false)} />
          <div className="relative w-full max-w-md bg-dark-100 border border-white/20">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileStack className="h-5 w-5 text-purple" />
                <h2 className="text-lg font-bold text-white">Apply Template</h2>
              </div>
              <button
                onClick={() => setShowApplyTemplateModal(false)}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-purple/5 border border-purple/20">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                  Schedule Template
                </p>
                <h3 className="text-lg font-bold text-white">{selectedTemplate.name}</h3>
                {selectedTemplate.description && (
                  <p className="text-sm text-white/50 mt-1">{selectedTemplate.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                  <span>{selectedTemplate.totalDays} day{selectedTemplate.totalDays !== 1 ? 's' : ''}</span>
                  <span>{selectedTemplate.blocks.length} blocks</span>
                </div>
              </div>
              <div className="p-4 bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-amber-500 font-medium">This will replace existing schedule</p>
                    <p className="text-white/50 mt-1">
                      Applying this template will delete any existing schedule days and blocks for this camp.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowApplyTemplateModal(false)}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyTemplate}
                  disabled={saving}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider transition-all',
                    saving
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-purple text-white hover:bg-purple/90'
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <FileStack className="h-4 w-4" />
                      Apply Template
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
