'use client'

/**
 * Camp Grouping Tool
 *
 * Shared component for managing camp group assignments.
 * Used by both Director and Licensee/Admin dashboards.
 *
 * Features:
 * - Drag-and-drop camper assignment
 * - Auto-group algorithm
 * - Constraint validation
 * - Print report
 */

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { useBannerOffset } from '@/hooks/useBannerOffset'

// Types
interface GroupingCamper {
  id: string
  camper_session_id: string
  athlete_id: string
  name: string
  first_name: string
  last_name: string
  grade_level: number | null
  friend_group_id: string | null
  friend_group_number: number | null
  current_group_id: string | null
  current_group_number: number | null
  assignment_type: string | null
  photo_url: string | null
  has_medical_notes: boolean
  has_allergies: boolean
  special_considerations: string | null
}

interface GroupingGroup {
  id: string
  group_number: number
  group_name: string
  group_color: string | null
  max_size: number
  campers: GroupingCamper[]
  stats: {
    count: number
    min_grade: number | null
    max_grade: number | null
    grade_spread: number
    is_full: boolean
    has_size_violation: boolean
    has_grade_violation: boolean
    has_friend_violation: boolean
  }
}

interface GroupingWarning {
  type: string
  message: string
  affected_camper_ids: string[]
  friend_group_id?: string
  severity: 'warning' | 'error'
}

interface GroupingState {
  camp_id: string
  camp_name: string
  tenant_id: string
  status: string
  max_group_size: number
  num_groups: number
  max_grade_spread: number
  groups: GroupingGroup[]
  ungrouped_campers: GroupingCamper[]
  total_campers: number
  friend_groups_count: number
  warnings: GroupingWarning[]
  is_finalized: boolean
}

interface CampGroupingToolProps {
  campId: string
  mode: 'director' | 'licensee' | 'admin'
  backUrl?: string
}

// Camper Card Component
function CamperCard({
  camper,
  isDragging = false,
  isOverlay = false,
  onEdit,
  showEditButton = false,
}: {
  camper: GroupingCamper
  isDragging?: boolean
  isOverlay?: boolean
  onEdit?: (camper: GroupingCamper) => void
  showEditButton?: boolean
}) {
  return (
    <div
      className={`bg-dark-100 border p-3 ${
        isDragging ? 'opacity-50 border-dashed border-white/20' : 'border-white/10'
      } ${isOverlay ? 'shadow-lg shadow-black/50' : 'hover:border-white/30'}`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          {camper.photo_url ? (
            <img
              src={camper.photo_url}
              alt={camper.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white/70 font-medium text-sm">
                {camper.first_name[0]}{camper.last_name[0]}
              </span>
            </div>
          )}
          {/* Friend group indicator */}
          {camper.friend_group_number && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-magenta text-white text-xs rounded-full flex items-center justify-center font-bold">
              {camper.friend_group_number}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm truncate">{camper.name}</p>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>Grade {camper.grade_level ?? '?'}</span>
            {camper.has_medical_notes && (
              <span className="text-red-400" title="Medical notes">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            {camper.has_allergies && (
              <span className="text-amber-400" title="Allergies">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Edit button */}
        {showEditButton && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(camper)
            }}
            className="p-1.5 text-white/40 hover:text-neon hover:bg-white/10 transition-colors"
            title="Assign to group"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}

        {/* Drag handle */}
        <div className="text-white/30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// Sortable Camper Card
function SortableCamperCard({
  camper,
  onEdit,
  showEditButton = false,
}: {
  camper: GroupingCamper
  onEdit?: (camper: GroupingCamper) => void
  showEditButton?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: camper.camper_session_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CamperCard
        camper={camper}
        isDragging={isDragging}
        onEdit={onEdit}
        showEditButton={showEditButton}
      />
    </div>
  )
}

// Group Column Component
function GroupColumn({
  group,
  maxGradeSpread,
  isOver,
  onEditCamper,
  isFinalized,
}: {
  group: GroupingGroup
  maxGradeSpread: number
  isOver?: boolean
  onEditCamper?: (camper: GroupingCamper) => void
  isFinalized?: boolean
}) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: group.id,
  })

  const hasViolations = group.stats.has_size_violation || group.stats.has_grade_violation
  const borderColor = group.group_color || '#333'
  const isHighlighted = isOver || isDroppableOver

  return (
    <div
      ref={setNodeRef}
      className={`bg-dark-100 border-2 flex flex-col min-h-[400px] transition-all ${
        isHighlighted ? 'ring-2 ring-neon bg-neon/5' : ''
      }`}
      style={{ borderColor: hasViolations ? '#ef4444' : borderColor }}
    >
      {/* Header */}
      <div
        className="p-4 border-b border-white/10"
        style={{ backgroundColor: `${borderColor}30` }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white">{group.group_name}</h3>
          {hasViolations && (
            <span className="text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className={`font-medium ${group.stats.has_size_violation ? 'text-red-400' : 'text-white/70'}`}>
            {group.stats.count}/{group.max_size}
          </span>
          <span className={`${group.stats.has_grade_violation ? 'text-red-400' : 'text-white/50'}`}>
            Grades:{' '}
            {group.stats.min_grade !== null && group.stats.max_grade !== null
              ? group.stats.min_grade === group.stats.max_grade
                ? group.stats.min_grade
                : `${group.stats.min_grade}-${group.stats.max_grade}`
              : 'N/A'}
          </span>
        </div>

        {/* Constraint indicators */}
        <div className="flex gap-2 mt-2">
          {!group.stats.has_size_violation && !group.stats.is_full ? (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5">
              Size OK
            </span>
          ) : group.stats.has_size_violation ? (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5">
              Over capacity
            </span>
          ) : (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5">
              Full
            </span>
          )}
          {group.stats.grade_spread > maxGradeSpread ? (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5">
              Grade gap: {group.stats.grade_spread}
            </span>
          ) : group.stats.count > 0 ? (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5">
              Grade OK
            </span>
          ) : null}
        </div>
      </div>

      {/* Campers */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <SortableContext
          items={group.campers.map(c => c.camper_session_id)}
          strategy={verticalListSortingStrategy}
        >
          {group.campers.map(camper => (
            <SortableCamperCard
              key={camper.camper_session_id}
              camper={camper}
              onEdit={onEditCamper}
              showEditButton={!isFinalized}
            />
          ))}
        </SortableContext>

        {group.campers.length === 0 && (
          <div className="text-center py-8 text-white/30 text-sm">
            Drop campers here
          </div>
        )}
      </div>
    </div>
  )
}

// Ungrouped Column Component
function UngroupedColumn({
  campers,
  isOver,
  onEditCamper,
  isFinalized,
}: {
  campers: GroupingCamper[]
  isOver?: boolean
  onEditCamper?: (camper: GroupingCamper) => void
  isFinalized?: boolean
}) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: 'ungrouped',
  })

  const isHighlighted = isOver || isDroppableOver

  return (
    <div
      ref={setNodeRef}
      className={`bg-dark-100 border-2 border-dashed flex flex-col min-h-[400px] transition-all ${
        isHighlighted ? 'border-neon bg-neon/5' : 'border-white/20'
      }`}
    >
      <div className="p-4 border-b border-white/10">
        <h3 className="font-bold text-white">Ungrouped</h3>
        <p className="text-sm text-white/50">{campers.length} campers</p>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <SortableContext
          items={campers.map(c => c.camper_session_id)}
          strategy={verticalListSortingStrategy}
        >
          {campers.map(camper => (
            <SortableCamperCard
              key={camper.camper_session_id}
              camper={camper}
              onEdit={onEditCamper}
              showEditButton={!isFinalized}
            />
          ))}
        </SortableContext>

        {campers.length === 0 && (
          <div className="text-center py-8 text-white/30 text-sm">
            All campers assigned!
          </div>
        )}
      </div>
    </div>
  )
}

// Main Component
export default function CampGroupingTool({
  campId,
  mode,
  backUrl = '/director/camps',
}: CampGroupingToolProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [state, setState] = useState<GroupingState | null>(null)
  const [activeCamper, setActiveCamper] = useState<GroupingCamper | null>(null)
  const [overGroupId, setOverGroupId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [editingCamper, setEditingCamper] = useState<GroupingCamper | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const { topWithNavbar } = useBannerOffset()

  // Group management state
  const [showGroupManager, setShowGroupManager] = useState(false)
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; color: string } | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('#FF6B6B')

  // Available colors for groups
  const GROUP_COLORS = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
    '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
    '#C9B1FF', '#F9F9F9', '#FF9F43', '#54A0FF',
  ]

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Fetch grouping state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/grouping/${campId}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load grouping')
      }

      setState(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [campId])

  useEffect(() => {
    fetchState()
  }, [fetchState])

  // Show toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Handle auto-group
  const handleAutoGroup = async () => {
    if (!confirm('This will reassign all campers based on the algorithm. Continue?')) return

    setActionLoading('auto')
    try {
      const res = await fetch(`/api/grouping/${campId}/auto`, {
        method: 'POST',
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to auto-group')
      }

      await fetchState()
      showToast(
        `Auto-grouped ${json.data.stats.placed_count} campers. ${json.data.warnings.length} warnings.`,
        json.data.warnings.length > 0 ? 'error' : 'success'
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Auto-group failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle finalize
  const handleFinalize = async () => {
    if (!confirm('Finalize grouping? This will lock all assignments.')) return

    setActionLoading('finalize')
    try {
      const res = await fetch(`/api/grouping/${campId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize' }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to finalize')
      }

      await fetchState()
      showToast('Grouping finalized!', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Finalize failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle unfinalize
  const handleUnfinalize = async () => {
    setActionLoading('unfinalize')
    try {
      const res = await fetch(`/api/grouping/${campId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unfinalize' }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to unfinalize')
      }

      await fetchState()
      showToast('Grouping unlocked for editing', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unfinalize failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle download PDF
  const handleDownloadPDF = () => {
    const basePath = mode === 'admin' ? '/admin' : mode === 'licensee' ? '/licensee' : '/director'
    window.open(`${basePath}/camps/${campId}/grouping/report`, '_blank')
  }

  // Group management handlers
  const handleAddGroup = async () => {
    setActionLoading('addGroup')
    try {
      const res = await fetch(`/api/grouping/${campId}/group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: newGroupName || undefined,
          groupColor: newGroupColor,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to add group')
      }

      await fetchState()
      setNewGroupName('')
      setNewGroupColor('#FF6B6B')
      showToast(`Added ${json.data.group.groupName}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add group', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateGroup = async () => {
    if (!editingGroup) return

    setActionLoading('updateGroup')
    try {
      const res = await fetch(`/api/grouping/${campId}/group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: editingGroup.id,
          groupName: editingGroup.name,
          groupColor: editingGroup.color,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update group')
      }

      await fetchState()
      setEditingGroup(null)
      showToast('Group updated', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update group', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Delete "${groupName}"? Campers will be moved to ungrouped.`)) return

    setActionLoading('deleteGroup')
    try {
      const res = await fetch(`/api/grouping/${campId}/group?groupId=${groupId}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete group')
      }

      await fetchState()
      showToast(`Deleted ${groupName}. ${json.data.movedCampers} campers moved to ungrouped.`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete group', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const camperId = event.active.id as string

    // Find camper in groups or ungrouped
    let camper: GroupingCamper | undefined

    for (const group of state?.groups || []) {
      camper = group.campers.find(c => c.camper_session_id === camperId)
      if (camper) break
    }

    if (!camper) {
      camper = state?.ungrouped_campers.find(c => c.camper_session_id === camperId)
    }

    if (camper) {
      setActiveCamper(camper)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over) {
      // Check if over a group
      const isOverGroup = state?.groups.some(g => g.id === over.id)
      if (isOverGroup) {
        setOverGroupId(over.id as string)
      } else {
        // Check if over a camper in a group
        for (const group of state?.groups || []) {
          if (group.campers.some(c => c.camper_session_id === over.id)) {
            setOverGroupId(group.id)
            break
          }
        }
      }
    } else {
      setOverGroupId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCamper(null)
    setOverGroupId(null)

    if (!over || !state) return

    const camperId = active.id as string

    // Determine target group
    let targetGroupId: string | null = null

    // Check if dropped on a group
    const isDroppedOnGroup = state.groups.some(g => g.id === over.id)
    if (isDroppedOnGroup) {
      targetGroupId = over.id as string
    } else {
      // Check if dropped on a camper in a group
      for (const group of state.groups) {
        if (group.campers.some(c => c.camper_session_id === over.id)) {
          targetGroupId = group.id
          break
        }
      }
    }

    // Check if dropped on ungrouped section
    if (over.id === 'ungrouped') {
      targetGroupId = null
    }

    // Find current group
    let currentGroupId: string | null = null
    for (const group of state.groups) {
      if (group.campers.some(c => c.camper_session_id === camperId)) {
        currentGroupId = group.id
        break
      }
    }

    // No change
    if (targetGroupId === currentGroupId) return

    // Update via API
    setActionLoading('update')
    try {
      const res = await fetch(`/api/grouping/${campId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{
            camper_session_id: camperId,
            new_group_id: targetGroupId,
          }],
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update')
      }

      setState(json.data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Move failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Open edit modal for a camper
  const handleOpenEditModal = (camper: GroupingCamper) => {
    setEditingCamper(camper)
    // Set the current group as default selection
    setSelectedGroupId(camper.current_group_id)
  }

  // Assign camper to selected group via edit modal
  const handleAssignCamper = async () => {
    if (!editingCamper || !state) return

    // If same group, just close
    const currentGroupId = editingCamper.current_group_id
    if (selectedGroupId === currentGroupId) {
      setEditingCamper(null)
      setSelectedGroupId(null)
      return
    }

    setActionLoading('assign')
    try {
      const res = await fetch(`/api/grouping/${campId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{
            camper_session_id: editingCamper.camper_session_id,
            new_group_id: selectedGroupId,
          }],
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to assign camper')
      }

      setState(json.data)
      showToast(`${editingCamper.name} assigned successfully`, 'success')
      setEditingCamper(null)
      setSelectedGroupId(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Assignment failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen bg-black flex items-center justify-center"
        style={{ paddingTop: `${topWithNavbar}px` }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon mx-auto"></div>
          <p className="mt-4 text-white/50">Loading grouping tool...</p>
        </div>
      </div>
    )
  }

  if (error || !state) {
    return (
      <div
        className="min-h-screen bg-black flex items-center justify-center p-4"
        style={{ paddingTop: `${topWithNavbar}px` }}
      >
        <div className="bg-dark-100 border border-white/10 p-6 max-w-md w-full text-center">
          <div className="text-red-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Error</h1>
          <p className="text-white/50 mb-6">{error || 'Failed to load grouping'}</p>
          <Link
            href={backUrl}
            className="inline-block bg-neon text-black px-6 py-2 hover:bg-neon/90 font-bold uppercase tracking-wider"
          >
            Go Back
          </Link>
        </div>
      </div>
    )
  }

  const groupedCount = state.groups.reduce((sum, g) => sum + g.stats.count, 0)
  const violationCount = state.warnings.filter(w => w.severity === 'error').length
  const allValid = violationCount === 0 && state.ungrouped_campers.length === 0

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-black" style={{ paddingTop: `${topWithNavbar}px` }}>
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`} style={{ top: `${topWithNavbar + 16}px` }}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="bg-dark-100 border-b border-white/10 text-white py-4 px-6">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex items-center justify-between gap-4">
              {/* Left - Back and title */}
              <div className="flex items-center gap-4">
                <Link
                  href={backUrl}
                  className="p-2 hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-lg font-bold uppercase tracking-wide">{state.camp_name}</h1>
                  <p className="text-white/50 text-sm">
                    Grouping Tool • {state.total_campers} campers • {state.friend_groups_count} friend groups
                  </p>
                </div>
              </div>

              {/* Center - Status */}
              <div className="flex items-center gap-4">
                {state.is_finalized ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium">
                    Finalized
                  </span>
                ) : allValid ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium">
                    All groups valid
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm font-medium">
                    {violationCount} issue{violationCount !== 1 ? 's' : ''} •{' '}
                    {state.ungrouped_campers.length} ungrouped
                  </span>
                )}
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-2">
                {!state.is_finalized && (
                  <>
                    <button
                      onClick={handleAutoGroup}
                      disabled={actionLoading !== null}
                      className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'auto' ? 'Processing...' : 'Auto-Group'}
                    </button>
                    <button
                      onClick={handleFinalize}
                      disabled={actionLoading !== null || !allValid}
                      className="px-4 py-2 border border-white/20 text-white font-bold uppercase tracking-wider hover:bg-white/10 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === 'finalize' ? 'Processing...' : 'Finalize'}
                    </button>
                  </>
                )}
                {state.is_finalized && (
                  <button
                    onClick={handleUnfinalize}
                    disabled={actionLoading !== null}
                    className="px-4 py-2 border border-white/20 text-white font-bold uppercase tracking-wider hover:bg-white/10 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === 'unfinalize' ? 'Processing...' : 'Unlock'}
                  </button>
                )}
                {!state.is_finalized && (
                  <button
                    onClick={() => setShowGroupManager(true)}
                    disabled={actionLoading !== null}
                    className="px-4 py-2 border border-purple/50 text-purple font-bold uppercase tracking-wider hover:bg-purple/10 disabled:opacity-50 transition-colors"
                  >
                    Manage Groups
                  </button>
                )}
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 border border-white/20 text-white font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {state.warnings.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 py-2 px-6">
            <div className="max-w-[1800px] mx-auto flex items-center gap-4 overflow-x-auto">
              <span className="text-amber-400 text-sm font-medium shrink-0">Warnings:</span>
              {state.warnings.slice(0, 5).map((warning, i) => (
                <span
                  key={i}
                  className={`text-sm px-2 py-1 shrink-0 ${
                    warning.severity === 'error'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {warning.message}
                </span>
              ))}
              {state.warnings.length > 5 && (
                <span className="text-sm text-amber-400/70 shrink-0">
                  +{state.warnings.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="max-w-[1800px] mx-auto p-6">
          <div className="grid gap-4" style={{
            gridTemplateColumns: `repeat(${state.num_groups}, minmax(240px, 1fr)) minmax(240px, 1fr)`,
          }}>
            {/* Groups */}
            {state.groups.map(group => (
              <GroupColumn
                key={group.id}
                group={group}
                maxGradeSpread={state.max_grade_spread}
                isOver={overGroupId === group.id}
                onEditCamper={handleOpenEditModal}
                isFinalized={state.is_finalized}
              />
            ))}

            {/* Ungrouped */}
            <UngroupedColumn
              campers={state.ungrouped_campers}
              isOver={overGroupId === 'ungrouped'}
              onEditCamper={handleOpenEditModal}
              isFinalized={state.is_finalized}
            />
          </div>

          {/* Summary Stats */}
          <div className="mt-6 bg-dark-100 border border-white/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-white/50">
                <strong className="text-white">{groupedCount}</strong> grouped
              </span>
              <span className="text-white/50">
                <strong className="text-white">{state.ungrouped_campers.length}</strong> ungrouped
              </span>
              <span className="text-white/50">
                Max group size: <strong className="text-white">{state.max_group_size}</strong>
              </span>
              <span className="text-white/50">
                Max grade spread: <strong className="text-white">{state.max_grade_spread}</strong>
              </span>
            </div>
            <div className="text-sm text-white/50">
              Status: <span className="font-medium text-white capitalize">{state.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Camper Modal */}
      {editingCamper && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => {
              setEditingCamper(null)
              setSelectedGroupId(null)
            }}
          />
          <div className="relative w-full max-w-md bg-dark-100 border border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Assign Camper</h2>
              <button
                onClick={() => {
                  setEditingCamper(null)
                  setSelectedGroupId(null)
                }}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Camper Info */}
              <div className="p-4 bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  {editingCamper.photo_url ? (
                    <img
                      src={editingCamper.photo_url}
                      alt={editingCamper.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-white/70 font-medium">
                        {editingCamper.first_name[0]}{editingCamper.last_name[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-white">{editingCamper.name}</p>
                    <p className="text-sm text-white/50">
                      Grade {editingCamper.grade_level ?? '?'}
                      {editingCamper.friend_group_number && (
                        <span className="ml-2 px-2 py-0.5 bg-magenta/20 text-magenta text-xs">
                          Friend Group {editingCamper.friend_group_number}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Group Selection */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Assign to Group
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {/* Ungrouped Option */}
                  <button
                    onClick={() => setSelectedGroupId(null)}
                    className={`w-full text-left p-3 border transition-colors ${
                      selectedGroupId === null
                        ? 'border-neon bg-neon/10 text-white'
                        : 'border-white/10 text-white/70 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Ungrouped</span>
                      {selectedGroupId === null && (
                        <svg className="w-5 h-5 text-neon" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Group Options */}
                  {state.groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full text-left p-3 border transition-colors ${
                        selectedGroupId === group.id
                          ? 'border-neon bg-neon/10 text-white'
                          : 'border-white/10 text-white/70 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{group.group_name}</span>
                          <span className="ml-2 text-sm text-white/50">
                            ({group.stats.count}/{group.max_size})
                          </span>
                        </div>
                        {selectedGroupId === group.id && (
                          <svg className="w-5 h-5 text-neon" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {group.stats.is_full && (
                        <span className="text-xs text-amber-400">Full</span>
                      )}
                      {group.stats.has_size_violation && (
                        <span className="text-xs text-red-400">Over capacity</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setEditingCamper(null)
                    setSelectedGroupId(null)
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCamper}
                  disabled={actionLoading === 'assign'}
                  className="flex items-center gap-2 px-6 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'assign' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      Assigning...
                    </>
                  ) : (
                    'Assign'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Manager Modal */}
      {showGroupManager && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => {
              setShowGroupManager(false)
              setEditingGroup(null)
            }}
          />
          <div className="relative w-full max-w-2xl bg-dark-100 border border-white/20 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Manage Groups</h2>
              <button
                onClick={() => {
                  setShowGroupManager(false)
                  setEditingGroup(null)
                }}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Add New Group */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3">Add New Group</h3>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-1">
                      Group Name (optional)
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Auto-generated if empty"
                      className="w-full bg-black/30 border border-white/20 text-white p-2 text-sm focus:border-neon focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-1">Color</label>
                    <div className="flex gap-1">
                      {GROUP_COLORS.slice(0, 6).map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewGroupColor(color)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            newGroupColor === color ? 'border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAddGroup}
                    disabled={actionLoading === 'addGroup'}
                    className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === 'addGroup' ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Existing Groups */}
              <div>
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3">
                  Existing Groups ({state.groups.length})
                </h3>
                <div className="space-y-2">
                  {state.groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                    >
                      {editingGroup?.id === group.id ? (
                        // Edit mode
                        <>
                          <input
                            type="text"
                            value={editingGroup.name}
                            onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                            className="flex-1 bg-black/30 border border-white/20 text-white p-2 text-sm focus:border-neon focus:outline-none"
                          />
                          <div className="flex gap-1">
                            {GROUP_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => setEditingGroup({ ...editingGroup, color })}
                                className={`w-5 h-5 rounded-full border-2 ${
                                  editingGroup.color === color ? 'border-white' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <button
                            onClick={handleUpdateGroup}
                            disabled={actionLoading === 'updateGroup'}
                            className="px-3 py-1 bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingGroup(null)}
                            className="px-3 py-1 text-white/50 hover:text-white text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        // View mode
                        <>
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: group.group_color || '#333' }}
                          />
                          <div className="flex-1">
                            <span className="text-white font-medium">{group.group_name}</span>
                            <span className="text-white/50 ml-2 text-sm">
                              ({group.stats.count} campers)
                            </span>
                          </div>
                          <button
                            onClick={() => setEditingGroup({
                              id: group.id,
                              name: group.group_name,
                              color: group.group_color || '#333',
                            })}
                            className="p-2 text-white/40 hover:text-white transition-colors"
                            title="Edit group"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.id, group.group_name)}
                            disabled={actionLoading === 'deleteGroup' || state.groups.length <= 1}
                            className="p-2 text-red-400/70 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title={state.groups.length <= 1 ? 'Cannot delete last group' : 'Delete group'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowGroupManager(false)
                  setEditingGroup(null)
                }}
                className="w-full py-2 border border-white/20 text-white font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCamper && <CamperCard camper={activeCamper} isOverlay />}
      </DragOverlay>
    </DndContext>
  )
}
