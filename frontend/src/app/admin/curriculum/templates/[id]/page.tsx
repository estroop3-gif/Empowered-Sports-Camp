'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  getTemplateById,
  getBlocks,
  updateTemplate,
  duplicateTemplate,
  addTemplateDay,
  updateTemplateDay,
  deleteTemplateDay,
  addBlockToDay,
  removeBlockFromDay,
  reorderDayBlocks,
  CurriculumTemplate,
  CurriculumBlock,
  CurriculumTemplateDay,
  CurriculumDayBlock,
  SPORTS,
  DIFFICULTIES,
  BLOCK_CATEGORIES,
} from '@/lib/services/curriculum'
import { PdfViewer } from '@/components/ui/pdf-viewer'
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
  Calendar,
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  X,
  Blocks,
  Eye,
  Copy,
  Printer,
  FileText,
} from 'lucide-react'

/**
 * Template Detail / Edit / Planner Page
 *
 * Modes:
 * - Details tab: View/edit template metadata
 * - Planner tab: Day-by-day block editor (for structured templates)
 * - PDF tab: View attached PDF document
 */

type TabType = 'details' | 'planner' | 'pdf'

export default function TemplateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const templateId = params.id as string

  const { user, role, isHqAdmin, tenant } = useAuth()

  const [template, setTemplate] = useState<CurriculumTemplate | null>(null)
  const [allBlocks, setAllBlocks] = useState<CurriculumBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tab state - default to 'pdf' for PDF-only templates
  const tabFromUrl = searchParams.get('tab') as TabType
  const getInitialTab = (): TabType => {
    if (tabFromUrl) return tabFromUrl
    // Will be updated once template loads
    return 'details'
  }
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab())

  // Update tab when template loads for PDF-only templates
  useEffect(() => {
    if (template?.is_pdf_only && !tabFromUrl && activeTab !== 'pdf') {
      setActiveTab('pdf')
    }
  }, [template?.is_pdf_only, tabFromUrl, activeTab])

  // Modal states
  const [showAddDay, setShowAddDay] = useState(false)
  const [showAddBlock, setShowAddBlock] = useState<string | null>(null) // day_id or null
  const [editingDay, setEditingDay] = useState<CurriculumTemplateDay | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)

  // PDF viewer state
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)

  // Drag and drop state
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'
  const canEdit = !!(isHqAdmin || (template && !template.is_global && role === 'licensee_owner'))
  const canDuplicate = !!(role === 'licensee_owner' || isHqAdmin)

  useEffect(() => {
    fetchData()
  }, [templateId])

  const fetchData = async () => {
    setLoading(true)
    const [templateResult, blocksResult] = await Promise.all([
      getTemplateById(templateId),
      getBlocks(),
    ])

    if (templateResult.data) {
      setTemplate(templateResult.data)
    } else {
      setError(templateResult.error?.message || 'Template not found')
    }

    if (blocksResult.data) {
      setAllBlocks(blocksResult.data)
    }

    setLoading(false)
  }

  // ============================================
  // Day Management
  // ============================================

  const handleAddDay = async (title: string, theme?: string) => {
    if (!template) return

    const nextDayNumber = (template.days?.length || 0) + 1

    const { data, error } = await addTemplateDay({
      template_id: template.id,
      day_number: nextDayNumber,
      title: title || `Day ${nextDayNumber}`,
      theme,
    })

    if (data) {
      setTemplate(prev => prev ? {
        ...prev,
        days: [...(prev.days || []), { ...data, blocks: [] }],
        total_days: nextDayNumber,
      } : null)
      setShowAddDay(false)
    } else {
      alert(error?.message || 'Failed to add day')
    }
  }

  const handleUpdateDay = async (dayId: string, updates: { title?: string; theme?: string; notes?: string }) => {
    const { data, error } = await updateTemplateDay(dayId, updates)

    if (data) {
      setTemplate(prev => prev ? {
        ...prev,
        days: prev.days?.map(d => d.id === dayId ? { ...d, ...updates } : d),
      } : null)
      setEditingDay(null)
    } else {
      alert(error?.message || 'Failed to update day')
    }
  }

  const handleDeleteDay = async (dayId: string) => {
    if (!confirm('Delete this day and all its blocks?')) return

    const { success, error } = await deleteTemplateDay(dayId)

    if (success) {
      setTemplate(prev => prev ? {
        ...prev,
        days: prev.days?.filter(d => d.id !== dayId),
        total_days: Math.max(0, (prev.total_days || 1) - 1),
      } : null)
    } else {
      alert(error?.message || 'Failed to delete day')
    }
  }

  // ============================================
  // Block Management
  // ============================================

  const handleAddBlockToDay = async (dayId: string, blockId: string) => {
    const day = template?.days?.find(d => d.id === dayId)
    const nextOrder = (day?.blocks?.length || 0) + 1

    const { data, error } = await addBlockToDay({
      day_id: dayId,
      block_id: blockId,
      order_index: nextOrder,
    })

    if (data) {
      setTemplate(prev => prev ? {
        ...prev,
        days: prev.days?.map(d => d.id === dayId ? {
          ...d,
          blocks: [...(d.blocks || []), data],
        } : d),
      } : null)
      setShowAddBlock(null)
    } else {
      alert(error?.message || 'Failed to add block')
    }
  }

  const handleRemoveBlockFromDay = async (dayBlockId: string, dayId: string) => {
    if (!confirm('Remove this block from the day?')) return

    const { success, error } = await removeBlockFromDay(dayBlockId)

    if (success) {
      setTemplate(prev => prev ? {
        ...prev,
        days: prev.days?.map(d => d.id === dayId ? {
          ...d,
          blocks: d.blocks?.filter(b => b.id !== dayBlockId),
        } : d),
      } : null)
    } else {
      alert(error?.message || 'Failed to remove block')
    }
  }

  const handleMoveBlock = async (dayId: string, blockId: string, direction: 'up' | 'down') => {
    const day = template?.days?.find(d => d.id === dayId)
    if (!day?.blocks) return

    const blocks = [...day.blocks]
    const index = blocks.findIndex(b => b.id === blockId)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= blocks.length) return

    // Swap
    [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]]

    // Update order indices
    const newOrder = blocks.map((b, i) => ({ id: b.id, order_index: i + 1 }))

    const { success, error } = await reorderDayBlocks(dayId, newOrder)

    if (success) {
      setTemplate(prev => prev ? {
        ...prev,
        days: prev.days?.map(d => d.id === dayId ? {
          ...d,
          blocks: blocks.map((b, i) => ({ ...b, order_index: i + 1 })),
        } : d),
      } : null)
    } else {
      alert(error?.message || 'Failed to reorder blocks')
    }
  }

  // ============================================
  // Duplicate & Print
  // ============================================

  const handleDuplicate = async (newName: string) => {
    if (!template) return

    setDuplicating(true)
    const { data, error } = await duplicateTemplate(
      template.id,
      tenant?.id || null,
      newName
    )

    setDuplicating(false)

    if (data) {
      setShowDuplicateModal(false)
      router.push(`/admin/curriculum/templates/${data.id}`)
    } else {
      alert(error?.message || 'Failed to duplicate template')
    }
  }

  const handleDragStart = (blockId: string) => {
    setDraggedBlockId(blockId)
  }

  const handleDragOver = (e: React.DragEvent, targetBlockId: string, dayId: string) => {
    e.preventDefault()
    if (!draggedBlockId || draggedBlockId === targetBlockId) return

    const day = template?.days?.find(d => d.id === dayId)
    if (!day?.blocks) return

    const draggedIndex = day.blocks.findIndex(b => b.id === draggedBlockId)
    const targetIndex = day.blocks.findIndex(b => b.id === targetBlockId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Reorder blocks locally for visual feedback
    const blocks = [...day.blocks]
    const [draggedBlock] = blocks.splice(draggedIndex, 1)
    blocks.splice(targetIndex, 0, draggedBlock)

    setTemplate(prev => prev ? {
      ...prev,
      days: prev.days?.map(d => d.id === dayId ? {
        ...d,
        blocks: blocks.map((b, i) => ({ ...b, order_index: i + 1 })),
      } : d),
    } : null)
  }

  const handleDragEnd = async (dayId: string) => {
    if (!draggedBlockId) return

    const day = template?.days?.find(d => d.id === dayId)
    if (!day?.blocks) return

    // Save the new order to the database
    const newOrder = day.blocks.map((b, i) => ({ id: b.id, order_index: i + 1 }))
    await reorderDayBlocks(dayId, newOrder)

    setDraggedBlockId(null)
  }

  if (loading) {
    return (
      <AdminLayout userRole={role || 'hq_admin'} userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (!template) {
    return (
      <AdminLayout userRole={role || 'hq_admin'} userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black uppercase tracking-wider text-white mb-2">
              Template Not Found
            </h2>
            <p className="text-white/50 mb-6">{error}</p>
            <Link
              href="/admin/curriculum"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Curriculum
            </Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const sportLabel = SPORTS.find(s => s.value === template.sport)?.label || template.sport

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

      <div className="flex items-start justify-between mb-6">
        <PageHeader
          title={template.name}
          description={template.description || `${sportLabel} curriculum template`}
        >
          <div className={cn(
            'inline-flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-wider',
            template.is_global
              ? 'bg-neon/10 text-neon border border-neon/30'
              : 'bg-magenta/10 text-magenta border border-magenta/30'
          )}>
            {template.is_global ? <Globe className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
            {template.is_global ? 'Global' : 'Licensee'}
          </div>
        </PageHeader>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setShowPrintView(true)}
            className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white/70 text-sm font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          {canDuplicate && (
            <button
              onClick={() => setShowDuplicateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple/20 border border-purple/30 text-purple text-sm font-bold uppercase tracking-wider hover:bg-purple/30 transition-colors"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-white/10">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px',
              activeTab === 'details'
                ? 'text-neon border-neon'
                : 'text-white/50 border-transparent hover:text-white/70'
            )}
          >
            <Eye className="h-4 w-4" />
            Details
          </button>
          {/* Only show Day Planner for structured templates */}
          {!template.is_pdf_only && (
            <button
              onClick={() => setActiveTab('planner')}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px',
                activeTab === 'planner'
                  ? 'text-magenta border-magenta'
                  : 'text-white/50 border-transparent hover:text-white/70'
              )}
            >
              <Blocks className="h-4 w-4" />
              Day Planner
              <span className={cn(
                'ml-2 px-2 py-0.5 text-xs rounded-sm',
                activeTab === 'planner'
                  ? 'bg-magenta/20 text-magenta'
                  : 'bg-white/10 text-white/50'
              )}>
                {template.days?.length || 0} days
              </span>
            </button>
          )}
          {/* Show PDF tab if template has a PDF */}
          {template.pdf_url && (
            <button
              onClick={() => {
                setActiveTab('pdf')
                // Fetch presigned URL when tab is clicked
                if (!pdfViewerUrl && !loadingPdf) {
                  setLoadingPdf(true)
                  fetch(`/api/curriculum/document?type=template&id=${template.id}`)
                    .then(res => res.json())
                    .then(data => {
                      if (data.url) {
                        setPdfViewerUrl(data.url)
                      }
                    })
                    .finally(() => setLoadingPdf(false))
                }
              }}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px',
                activeTab === 'pdf'
                  ? 'text-purple border-purple'
                  : 'text-white/50 border-transparent hover:text-white/70'
              )}
            >
              <FileText className="h-4 w-4" />
              PDF Document
            </button>
          )}
        </div>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <TemplateDetailsTab template={template} canEdit={canEdit} />
      )}

      {/* Planner Tab */}
      {activeTab === 'planner' && !template.is_pdf_only && (
        <DayPlannerTab
          template={template}
          allBlocks={allBlocks}
          canEdit={canEdit}
          onAddDay={() => setShowAddDay(true)}
          onEditDay={setEditingDay}
          onDeleteDay={handleDeleteDay}
          onAddBlock={(dayId) => setShowAddBlock(dayId)}
          onRemoveBlock={handleRemoveBlockFromDay}
          onMoveBlock={handleMoveBlock}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          draggedBlockId={draggedBlockId}
        />
      )}

      {/* PDF Tab */}
      {activeTab === 'pdf' && template.pdf_url && (
        <div className="h-[calc(100vh-320px)] min-h-[600px]">
          {loadingPdf ? (
            <div className="flex items-center justify-center h-full bg-gray-900">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-neon" />
                <p className="text-white/60">Loading PDF...</p>
              </div>
            </div>
          ) : pdfViewerUrl ? (
            <PdfViewer
              url={pdfViewerUrl}
              filename={template.pdf_name || 'curriculum.pdf'}
              className="h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-900">
              <div className="text-center">
                <FileText className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 mb-2">Unable to load PDF</p>
                <button
                  onClick={() => {
                    setLoadingPdf(true)
                    fetch(`/api/curriculum/document?type=template&id=${template.id}`)
                      .then(res => res.json())
                      .then(data => {
                        if (data.url) {
                          setPdfViewerUrl(data.url)
                        }
                      })
                      .finally(() => setLoadingPdf(false))
                  }}
                  className="px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Day Modal */}
      {showAddDay && (
        <AddDayModal
          onClose={() => setShowAddDay(false)}
          onAdd={handleAddDay}
          dayNumber={(template.days?.length || 0) + 1}
        />
      )}

      {/* Add Block Modal */}
      {showAddBlock && (
        <AddBlockModal
          dayId={showAddBlock}
          blocks={allBlocks}
          existingBlockIds={(template.days?.find(d => d.id === showAddBlock)?.blocks || []).map(b => b.block_id)}
          onClose={() => setShowAddBlock(null)}
          onAdd={(blockId) => handleAddBlockToDay(showAddBlock, blockId)}
        />
      )}

      {/* Edit Day Modal */}
      {editingDay && (
        <EditDayModal
          day={editingDay}
          onClose={() => setEditingDay(null)}
          onSave={(updates) => handleUpdateDay(editingDay.id, updates)}
        />
      )}

      {/* Duplicate Template Modal */}
      {showDuplicateModal && (
        <DuplicateModal
          templateName={template.name}
          isGlobal={template.is_global}
          duplicating={duplicating}
          onClose={() => setShowDuplicateModal(false)}
          onDuplicate={handleDuplicate}
        />
      )}

      {/* Print View Modal */}
      {showPrintView && (
        <PrintViewModal
          template={template}
          onClose={() => setShowPrintView(false)}
        />
      )}
    </AdminLayout>
  )
}

// ============================================
// DETAILS TAB
// ============================================

function TemplateDetailsTab({ template, canEdit }: { template: CurriculumTemplate; canEdit: boolean }) {
  const sportLabel = SPORTS.find(s => s.value === template.sport)?.label || template.sport
  const difficultyLabel = DIFFICULTIES.find(d => d.value === template.difficulty)?.label || template.difficulty

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ContentCard title="Template Information">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Sport</p>
            <p className="text-white font-semibold">{sportLabel}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Difficulty</p>
            <p className="text-white font-semibold capitalize">{difficultyLabel}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Age Range</p>
            <p className="text-white font-semibold">
              {template.age_min && template.age_max
                ? `Ages ${template.age_min} - ${template.age_max}`
                : 'All ages'}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Days</p>
            <p className="text-white font-semibold">{template.total_days} days</p>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Description">
        <p className="text-white/70">
          {template.description || 'No description provided.'}
        </p>
      </ContentCard>

      <ContentCard title="Metadata" className="lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Created</p>
            <p className="text-white/70">{new Date(template.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Last Updated</p>
            <p className="text-white/70">{new Date(template.updated_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Template ID</p>
            <p className="text-white/50 font-mono text-xs truncate">{template.id}</p>
          </div>
        </div>
      </ContentCard>
    </div>
  )
}

// ============================================
// DAY PLANNER TAB
// ============================================

function DayPlannerTab({
  template,
  allBlocks,
  canEdit,
  onAddDay,
  onEditDay,
  onDeleteDay,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onDragStart,
  onDragOver,
  onDragEnd,
  draggedBlockId,
}: {
  template: CurriculumTemplate
  allBlocks: CurriculumBlock[]
  canEdit: boolean
  onAddDay: () => void
  onEditDay: (day: CurriculumTemplateDay) => void
  onDeleteDay: (dayId: string) => void
  onAddBlock: (dayId: string) => void
  onRemoveBlock: (dayBlockId: string, dayId: string) => void
  onMoveBlock: (dayId: string, blockId: string, direction: 'up' | 'down') => void
  onDragStart: (blockId: string) => void
  onDragOver: (e: React.DragEvent, targetBlockId: string, dayId: string) => void
  onDragEnd: (dayId: string) => void
  draggedBlockId: string | null
}) {
  const days = template.days || []

  return (
    <div className="space-y-6">
      {/* Empty State */}
      {days.length === 0 && (
        <ContentCard>
          <div className="py-12 text-center">
            <Calendar className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Days Added Yet</h3>
            <p className="text-white/50 mb-6">Start building your curriculum by adding days.</p>
            {canEdit && (
              <button
                onClick={onAddDay}
                className="inline-flex items-center gap-2 px-6 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add Day 1
              </button>
            )}
          </div>
        </ContentCard>
      )}

      {/* Days */}
      {days.map((day, index) => (
        <DayCard
          key={day.id}
          day={day}
          allBlocks={allBlocks}
          canEdit={canEdit}
          onEdit={() => onEditDay(day)}
          onDelete={() => onDeleteDay(day.id)}
          onAddBlock={() => onAddBlock(day.id)}
          onRemoveBlock={(blockId) => onRemoveBlock(blockId, day.id)}
          onMoveBlock={(blockId, dir) => onMoveBlock(day.id, blockId, dir)}
          onDragStart={onDragStart}
          onDragOver={(e, targetBlockId) => onDragOver(e, targetBlockId, day.id)}
          onDragEnd={() => onDragEnd(day.id)}
          draggedBlockId={draggedBlockId}
        />
      ))}

      {/* Add Day Button */}
      {canEdit && days.length > 0 && (
        <button
          onClick={onAddDay}
          className="w-full py-4 border-2 border-dashed border-white/20 text-white/50 font-bold uppercase tracking-wider hover:border-magenta hover:text-magenta transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Day {days.length + 1}
        </button>
      )}
    </div>
  )
}

function DayCard({
  day,
  allBlocks,
  canEdit,
  onEdit,
  onDelete,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onDragStart,
  onDragOver,
  onDragEnd,
  draggedBlockId,
}: {
  day: CurriculumTemplateDay
  allBlocks: CurriculumBlock[]
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onAddBlock: () => void
  onRemoveBlock: (blockId: string) => void
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void
  onDragStart: (blockId: string) => void
  onDragOver: (e: React.DragEvent, targetBlockId: string) => void
  onDragEnd: () => void
  draggedBlockId: string | null
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const blocks = day.blocks || []

  const totalDuration = blocks.reduce((sum, db) => {
    const block = db.block
    const duration = db.custom_duration_minutes || block?.duration_minutes || 0
    return sum + duration
  }, 0)

  return (
    <div className="bg-dark-100 border border-white/10">
      {/* Day Header */}
      <div
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-magenta/10 border border-magenta/30 flex items-center justify-center">
            <span className="text-magenta font-black">{day.day_number}</span>
          </div>
          <div>
            <h3 className="font-bold text-white">{day.title}</h3>
            {day.theme && (
              <p className="text-sm text-white/50">{day.theme}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Blocks className="h-4 w-4" />
            {blocks.length} blocks
          </div>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Clock className="h-4 w-4" />
            {totalDuration} min
          </div>
          {canEdit && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="p-2 text-white/40 hover:text-neon transition-colors"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-2 text-white/40 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-white/40" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/40" />
          )}
        </div>
      </div>

      {/* Day Content */}
      {isExpanded && (
        <div className="border-t border-white/10">
          {/* Blocks List */}
          {blocks.length > 0 ? (
            <div className="divide-y divide-white/5">
              {blocks.map((dayBlock, index) => {
                const block = dayBlock.block
                if (!block) return null

                const catConfig = BLOCK_CATEGORIES.find(c => c.value === block.category)
                const isDragging = draggedBlockId === dayBlock.id

                return (
                  <div
                    key={dayBlock.id}
                    draggable={canEdit}
                    onDragStart={() => canEdit && onDragStart(dayBlock.id)}
                    onDragOver={(e) => canEdit && onDragOver(e, dayBlock.id)}
                    onDragEnd={onDragEnd}
                    className={cn(
                      'px-6 py-3 flex items-center gap-4 hover:bg-white/5 transition-all',
                      canEdit && 'cursor-grab active:cursor-grabbing',
                      isDragging && 'opacity-50 bg-magenta/10 border-l-2 border-magenta'
                    )}
                  >
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-white/20" />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => onMoveBlock(dayBlock.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onMoveBlock(dayBlock.id, 'down')}
                            disabled={index === blocks.length - 1}
                            className="p-1 text-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    <span className="text-white/30 text-sm w-6">{index + 1}.</span>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-bold uppercase tracking-wider border',
                      catConfig?.color
                    )}>
                      {catConfig?.label}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium">{dayBlock.custom_title || block.title}</p>
                      {dayBlock.custom_notes && (
                        <p className="text-xs text-white/40 mt-1">{dayBlock.custom_notes}</p>
                      )}
                    </div>
                    <span className="text-white/40 text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dayBlock.custom_duration_minutes || block.duration_minutes}m
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => onRemoveBlock(dayBlock.id)}
                        className="p-2 text-white/30 hover:text-red-400 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-white/40">
              No blocks added to this day yet.
            </div>
          )}

          {/* Add Block Button */}
          {canEdit && (
            <div className="px-6 py-4 border-t border-white/10">
              <button
                onClick={onAddBlock}
                className="w-full py-3 border border-dashed border-white/20 text-white/50 text-sm font-bold uppercase tracking-wider hover:border-neon hover:text-neon transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Block
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// MODALS
// ============================================

function AddDayModal({
  onClose,
  onAdd,
  dayNumber,
}: {
  onClose: () => void
  onAdd: (title: string, theme?: string) => void
  dayNumber: number
}) {
  const [title, setTitle] = useState(`Day ${dayNumber}`)
  const [theme, setTheme] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-dark-100 border border-white/10 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-bold text-white uppercase tracking-wider">Add Day {dayNumber}</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Day Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Day 1 - Foundations"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Theme (Optional)
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., Building Confidence"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-magenta focus:outline-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onAdd(title, theme || undefined)}
            disabled={!title.trim()}
            className="flex-1 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors disabled:opacity-50"
          >
            Add Day
          </button>
        </div>
      </div>
    </div>
  )
}

function AddBlockModal({
  dayId,
  blocks,
  existingBlockIds,
  onClose,
  onAdd,
}: {
  dayId: string
  blocks: CurriculumBlock[]
  existingBlockIds: string[]
  onClose: () => void
  onAdd: (blockId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const filteredBlocks = blocks.filter(b => {
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && b.category !== categoryFilter) return false
    return true
  })

  // Group by category
  const groupedBlocks: Record<string, CurriculumBlock[]> = {}
  filteredBlocks.forEach(b => {
    if (!groupedBlocks[b.category]) groupedBlocks[b.category] = []
    groupedBlocks[b.category].push(b)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-dark-100 border border-white/10 w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-white uppercase tracking-wider">Add Block</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-white/10 flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks..."
            className="flex-1 px-4 py-2 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none text-sm"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none text-sm"
          >
            <option value="">All Categories</option>
            {BLOCK_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Blocks List */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(groupedBlocks).map(([category, catBlocks]) => {
            const catConfig = BLOCK_CATEGORIES.find(c => c.value === category)
            return (
              <div key={category} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-bold uppercase tracking-wider border',
                    catConfig?.color
                  )}>
                    {catConfig?.label}
                  </span>
                  <span className="text-xs text-white/40">{catBlocks.length} blocks</span>
                </div>
                <div className="grid gap-2">
                  {catBlocks.map(block => {
                    const isAdded = existingBlockIds.includes(block.id)
                    return (
                      <button
                        key={block.id}
                        onClick={() => !isAdded && onAdd(block.id)}
                        disabled={isAdded}
                        className={cn(
                          'p-3 border text-left transition-colors',
                          isAdded
                            ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                            : 'bg-black border-white/20 hover:border-neon'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{block.title}</span>
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {block.duration_minutes}m
                          </span>
                        </div>
                        {block.description && (
                          <p className="text-xs text-white/40 mt-1 line-clamp-1">{block.description}</p>
                        )}
                        {isAdded && (
                          <span className="text-xs text-neon mt-2 inline-block">Already added</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EditDayModal({
  day,
  onClose,
  onSave,
}: {
  day: CurriculumTemplateDay
  onClose: () => void
  onSave: (updates: { title?: string; theme?: string; notes?: string }) => void
}) {
  const [title, setTitle] = useState(day.title)
  const [theme, setTheme] = useState(day.theme || '')
  const [notes, setNotes] = useState(day.notes || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-dark-100 border border-white/10 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-bold text-white uppercase tracking-wider">Edit Day {day.day_number}</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Day Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Theme
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Coach Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none resize-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ title, theme: theme || undefined, notes: notes || undefined })}
            className="flex-1 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function DuplicateModal({
  templateName,
  isGlobal,
  duplicating,
  onClose,
  onDuplicate,
}: {
  templateName: string
  isGlobal: boolean
  duplicating: boolean
  onClose: () => void
  onDuplicate: (newName: string) => void
}) {
  const [name, setName] = useState(`${templateName} (Copy)`)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-dark-100 border border-white/10 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
          <Copy className="h-5 w-5 text-purple" />
          <h3 className="font-bold text-white uppercase tracking-wider">Duplicate Template</h3>
        </div>
        <div className="p-6 space-y-4">
          {isGlobal && (
            <div className="p-4 bg-neon/10 border border-neon/30 text-sm text-neon">
              <p className="font-bold mb-1">Creating Local Copy</p>
              <p className="text-neon/70">
                This will create a copy of the global template under your licensee account.
                You&apos;ll be able to customize it for your programs.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              New Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-purple focus:outline-none"
              autoFocus
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            disabled={duplicating}
            className="flex-1 py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onDuplicate(name)}
            disabled={!name.trim() || duplicating}
            className="flex-1 py-3 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {duplicating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Duplicate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function PrintViewModal({
  template,
  onClose,
}: {
  template: CurriculumTemplate
  onClose: () => void
}) {
  const days = template.days || []
  const sportLabel = SPORTS.find(s => s.value === template.sport)?.label || template.sport

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-white text-black overflow-auto print:relative print:overflow-visible">
      {/* Print Controls - Hidden when printing */}
      <div className="fixed top-0 left-0 right-0 bg-dark-100 border-b border-white/10 px-6 py-4 flex items-center justify-between print:hidden z-10">
        <div className="flex items-center gap-3">
          <Printer className="h-5 w-5 text-neon" />
          <span className="text-white font-bold uppercase tracking-wider">Print Preview</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-neon text-dark-200 font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="pt-20 pb-12 px-8 max-w-4xl mx-auto print:pt-0 print:px-0 print:max-w-none">
        {/* Header */}
        <div className="mb-8 pb-4 border-b-2 border-black">
          <h1 className="text-3xl font-black uppercase tracking-wider mb-2">{template.name}</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-bold">{sportLabel}</span>
            <span className="text-gray-500">|</span>
            <span>Ages {template.age_min}-{template.age_max}</span>
            <span className="text-gray-500">|</span>
            <span>{template.total_days} Days</span>
          </div>
          {template.description && (
            <p className="mt-3 text-gray-600">{template.description}</p>
          )}
        </div>

        {/* Days */}
        {days.map((day, dayIndex) => {
          const blocks = day.blocks || []
          const totalDuration = blocks.reduce((sum, db) => {
            return sum + (db.custom_duration_minutes || db.block?.duration_minutes || 0)
          }, 0)

          return (
            <div key={day.id} className="mb-8 page-break-inside-avoid">
              {/* Day Header */}
              <div className="bg-gray-100 px-4 py-3 flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider">
                    Day {day.day_number}: {day.title}
                  </h2>
                  {day.theme && (
                    <p className="text-sm text-gray-600 italic">Theme: {day.theme}</p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold">{blocks.length} Activities</p>
                  <p className="text-gray-500">{totalDuration} minutes total</p>
                </div>
              </div>

              {/* Blocks Table */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 px-3 w-12">#</th>
                    <th className="text-left py-2 px-3">Activity</th>
                    <th className="text-left py-2 px-3 w-32">Category</th>
                    <th className="text-right py-2 px-3 w-20">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((dayBlock, blockIndex) => {
                    const block = dayBlock.block
                    if (!block) return null
                    const catConfig = BLOCK_CATEGORIES.find(c => c.value === block.category)
                    return (
                      <tr key={dayBlock.id} className="border-b border-gray-200">
                        <td className="py-3 px-3 text-gray-500">{blockIndex + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-semibold">{dayBlock.custom_title || block.title}</p>
                          {(dayBlock.custom_notes || block.description) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {dayBlock.custom_notes || block.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-1 bg-gray-100 text-xs font-bold uppercase">
                            {catConfig?.label || block.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {dayBlock.custom_duration_minutes || block.duration_minutes} min
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Day Notes */}
              {day.notes && (
                <div className="mt-4 p-3 bg-gray-50 border-l-4 border-gray-400">
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">Coach Notes</p>
                  <p className="text-sm">{day.notes}</p>
                </div>
              )}
            </div>
          )
        })}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
          <span>Empowered Sports Camp - Curriculum Template</span>
          <span>Generated {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}
