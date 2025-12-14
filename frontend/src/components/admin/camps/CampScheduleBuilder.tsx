'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  getScheduleBlocks,
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  getScheduleTemplates,
  applyScheduleTemplate,
  clearDaySchedule,
  linkCurriculumBlock,
  getAvailableCurriculumBlocks,
  updateCampDay,
  type CampSessionDay,
  type ScheduleBlock,
  type ScheduleTemplate,
  type BlockType,
  BLOCK_TYPES,
} from '@/lib/services/camp-schedule'
import { BLOCK_CATEGORIES } from '@/lib/services/curriculum'
import {
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Clock,
  MapPin,
  Link2,
  Unlink,
  Loader2,
  X,
  Check,
  FileText,
  Download,
  RefreshCw,
  GripVertical,
  BookOpen,
  Coffee,
  Utensils,
  LogIn,
  LogOut,
  Zap,
  Star,
  ArrowRight,
} from 'lucide-react'

interface CampScheduleBuilderProps {
  campId: string
  day: CampSessionDay
  curriculumTemplateId?: string
  defaultStartTime: string
  defaultEndTime: string
  onUpdated: () => void
  canEdit: boolean
}

export function CampScheduleBuilder({
  campId,
  day,
  curriculumTemplateId,
  defaultStartTime,
  defaultEndTime,
  onUpdated,
  canEdit,
}: CampScheduleBuilderProps) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modals
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showCurriculumPicker, setShowCurriculumPicker] = useState<string | null>(null)

  // Day editing
  const [editingDayTitle, setEditingDayTitle] = useState(false)
  const [dayTitle, setDayTitle] = useState(day.title)
  const [dayTheme, setDayTheme] = useState(day.theme || '')

  useEffect(() => {
    loadBlocks()
  }, [day.id])

  useEffect(() => {
    setDayTitle(day.title)
    setDayTheme(day.theme || '')
  }, [day])

  async function loadBlocks() {
    setLoading(true)
    const { data } = await getScheduleBlocks(day.id)
    if (data) {
      setBlocks(data)
    }
    setLoading(false)
  }

  async function handleAddBlock(blockData: Partial<ScheduleBlock>) {
    setSaving(true)
    const { data, error } = await createScheduleBlock({
      camp_session_day_id: day.id,
      start_time: blockData.start_time || defaultStartTime,
      end_time: blockData.end_time || defaultEndTime,
      label: blockData.label || 'New Block',
      description: blockData.description || undefined,
      location: blockData.location || undefined,
      block_type: blockData.block_type,
    })

    if (data) {
      setBlocks([...blocks, data])
      setShowAddBlock(false)
      onUpdated()
    } else if (error) {
      alert(error.message)
    }
    setSaving(false)
  }

  async function handleUpdateBlock(blockId: string, updates: Partial<ScheduleBlock>) {
    setSaving(true)
    const { data, error } = await updateScheduleBlock(blockId, updates)

    if (data) {
      setBlocks(blocks.map((b) => (b.id === blockId ? data : b)))
      setEditingBlock(null)
      onUpdated()
    } else if (error) {
      alert(error.message)
    }
    setSaving(false)
  }

  async function handleDeleteBlock(blockId: string) {
    if (!confirm('Delete this schedule block?')) return

    setSaving(true)
    const { error } = await deleteScheduleBlock(blockId)

    if (!error) {
      setBlocks(blocks.filter((b) => b.id !== blockId))
      onUpdated()
    } else {
      alert(error.message)
    }
    setSaving(false)
  }

  async function handleMoveBlock(blockId: string, direction: 'up' | 'down') {
    const index = blocks.findIndex((b) => b.id === blockId)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === blocks.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const newBlocks = [...blocks]
    const [removed] = newBlocks.splice(index, 1)
    newBlocks.splice(newIndex, 0, removed)

    // Update order_index for both affected blocks
    setSaving(true)
    await updateScheduleBlock(newBlocks[index].id, { order_index: index })
    await updateScheduleBlock(newBlocks[newIndex].id, { order_index: newIndex })

    setBlocks(newBlocks)
    setSaving(false)
  }

  async function handleLinkCurriculum(scheduleBlockId: string, curriculumBlockId: string | null) {
    setSaving(true)
    const { data, error } = await linkCurriculumBlock(scheduleBlockId, curriculumBlockId)

    if (data) {
      setBlocks(blocks.map((b) => (b.id === scheduleBlockId ? data : b)))
      setShowCurriculumPicker(null)
      onUpdated()
    } else if (error) {
      alert(error.message)
    }
    setSaving(false)
  }

  async function handleApplyTemplate(templateId: string) {
    if (!confirm('This will replace the current schedule. Continue?')) return

    setSaving(true)
    // Clear existing blocks first
    await clearDaySchedule(day.id)

    // Apply template
    const { data, error } = await applyScheduleTemplate(day.id, templateId, day.day_number)

    if (data) {
      setBlocks(data)
      setShowTemplates(false)
      onUpdated()
    } else if (error) {
      alert(error.message)
    }
    setSaving(false)
  }

  async function handleSaveDayInfo() {
    setSaving(true)
    const { error } = await updateCampDay(day.id, {
      title: dayTitle,
      theme: dayTheme || undefined,
    })

    if (!error) {
      setEditingDayTitle(false)
      onUpdated()
    } else {
      alert(error.message)
    }
    setSaving(false)
  }

  // Get block type config
  function getBlockTypeConfig(type: BlockType) {
    return BLOCK_TYPES.find((bt) => bt.value === type) || BLOCK_TYPES[0]
  }

  // Get icon for block type
  function getBlockIcon(type: BlockType) {
    switch (type) {
      case 'arrival':
        return <LogIn className="h-4 w-4" />
      case 'departure':
        return <LogOut className="h-4 w-4" />
      case 'break':
        return <Coffee className="h-4 w-4" />
      case 'meal':
        return <Utensils className="h-4 w-4" />
      case 'curriculum':
        return <BookOpen className="h-4 w-4" />
      case 'special':
        return <Star className="h-4 w-4" />
      case 'transition':
        return <ArrowRight className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-8 w-8 text-neon animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Day Header */}
      <div className="flex items-start justify-between gap-4 p-4 bg-white/5 border border-white/10">
        {editingDayTitle ? (
          <div className="flex-1 space-y-3">
            <input
              type="text"
              value={dayTitle}
              onChange={(e) => setDayTitle(e.target.value)}
              placeholder="Day title..."
              className="w-full px-3 py-2 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
            <input
              type="text"
              value={dayTheme}
              onChange={(e) => setDayTheme(e.target.value)}
              placeholder="Theme (optional)..."
              className="w-full px-3 py-2 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveDayInfo}
                disabled={saving}
                className="px-3 py-1.5 bg-neon text-dark-200 text-xs font-bold uppercase hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setDayTitle(day.title)
                  setDayTheme(day.theme || '')
                  setEditingDayTitle(false)
                }}
                className="px-3 py-1.5 border border-white/20 text-white/60 text-xs font-bold uppercase hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <h4 className="font-bold text-white">{day.title}</h4>
            {day.theme && <p className="text-sm text-white/50 italic">Theme: {day.theme}</p>}
            {day.actual_date && (
              <p className="text-xs text-white/40 mt-1">
                {new Date(day.actual_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        )}

        {canEdit && !editingDayTitle && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingDayTitle(true)}
              className="p-1.5 text-white/40 hover:text-white transition-colors"
              title="Edit day info"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="px-3 py-1.5 border border-white/20 text-white/60 text-xs font-bold uppercase hover:text-white transition-colors flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Apply Template
            </button>
          </div>
        )}
      </div>

      {/* Schedule Blocks */}
      {blocks.length === 0 ? (
        <div className="py-8 border border-dashed border-white/20 text-center">
          <Clock className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 mb-4">No schedule blocks yet.</p>
          {canEdit && (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowAddBlock(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neon text-dark-200 text-sm font-bold uppercase hover:bg-neon/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Block
              </button>
              <button
                onClick={() => setShowTemplates(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-white/20 text-white/60 text-sm font-bold uppercase hover:text-white transition-colors"
              >
                <Download className="h-4 w-4" />
                Use Template
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {blocks.map((block, index) => {
            const typeConfig = getBlockTypeConfig(block.block_type)

            return (
              <div
                key={block.id}
                className={cn(
                  'flex items-stretch border transition-colors',
                  typeConfig.color
                )}
              >
                {/* Time Column */}
                <div className="w-24 flex-shrink-0 px-3 py-3 border-r border-white/10 flex flex-col justify-center">
                  <p className="text-sm font-mono font-bold text-white">
                    {formatTime(block.start_time)}
                  </p>
                  <p className="text-xs font-mono text-white/40">
                    {formatTime(block.end_time)}
                  </p>
                </div>

                {/* Content Column */}
                <div className="flex-1 px-4 py-3 flex items-center gap-3">
                  <div className="flex-shrink-0">{getBlockIcon(block.block_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{block.label}</p>
                    {block.curriculum_block && (
                      <p className="text-xs text-purple mt-0.5 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {block.curriculum_block.title} ({block.curriculum_block.duration_minutes}min)
                      </p>
                    )}
                    {block.location && (
                      <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {block.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Column */}
                {canEdit && (
                  <div className="flex items-center gap-1 px-2 border-l border-white/10">
                    <button
                      onClick={() => handleMoveBlock(block.id, 'up')}
                      disabled={index === 0 || saving}
                      className="p-1 text-white/30 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveBlock(block.id, 'down')}
                      disabled={index === blocks.length - 1 || saving}
                      className="p-1 text-white/30 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowCurriculumPicker(block.id)}
                      className={cn(
                        'p-1 transition-colors',
                        block.curriculum_block_id
                          ? 'text-purple hover:text-purple/80'
                          : 'text-white/30 hover:text-white'
                      )}
                      title={block.curriculum_block_id ? 'Change curriculum link' : 'Link curriculum'}
                    >
                      <Link2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingBlock(block)}
                      className="p-1 text-white/30 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      disabled={saving}
                      className="p-1 text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Block Button */}
      {canEdit && blocks.length > 0 && (
        <button
          onClick={() => setShowAddBlock(true)}
          className="w-full py-3 border border-dashed border-white/20 text-white/50 hover:border-neon hover:text-neon transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Time Block
        </button>
      )}

      {/* Add Block Modal */}
      {showAddBlock && (
        <BlockFormModal
          title="Add Schedule Block"
          defaultStartTime={
            blocks.length > 0
              ? blocks[blocks.length - 1].end_time
              : defaultStartTime
          }
          defaultEndTime={defaultEndTime}
          onSave={handleAddBlock}
          onClose={() => setShowAddBlock(false)}
          saving={saving}
        />
      )}

      {/* Edit Block Modal */}
      {editingBlock && (
        <BlockFormModal
          title="Edit Schedule Block"
          block={editingBlock}
          onSave={(updates) => handleUpdateBlock(editingBlock.id, updates)}
          onClose={() => setEditingBlock(null)}
          saving={saving}
        />
      )}

      {/* Schedule Templates Modal */}
      {showTemplates && (
        <ScheduleTemplatesModal
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
          saving={saving}
        />
      )}

      {/* Curriculum Picker Modal */}
      {showCurriculumPicker && (
        <CurriculumPickerModal
          campId={campId}
          dayNumber={day.day_number}
          currentBlockId={
            blocks.find((b) => b.id === showCurriculumPicker)?.curriculum_block_id || null
          }
          onSelect={(curriculumBlockId) =>
            handleLinkCurriculum(showCurriculumPicker, curriculumBlockId)
          }
          onClose={() => setShowCurriculumPicker(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

// Helper to format time
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

// Block Form Modal
function BlockFormModal({
  title,
  block,
  defaultStartTime,
  defaultEndTime,
  onSave,
  onClose,
  saving,
}: {
  title: string
  block?: ScheduleBlock
  defaultStartTime?: string
  defaultEndTime?: string
  onSave: (data: Partial<ScheduleBlock>) => void
  onClose: () => void
  saving: boolean
}) {
  const [label, setLabel] = useState(block?.label || '')
  const [startTime, setStartTime] = useState(block?.start_time || defaultStartTime || '09:00')
  const [endTime, setEndTime] = useState(block?.end_time || defaultEndTime || '10:00')
  const [blockType, setBlockType] = useState<BlockType>(block?.block_type || 'activity')
  const [location, setLocation] = useState(block?.location || '')
  const [description, setDescription] = useState(block?.description || '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      label,
      start_time: startTime,
      end_time: endTime,
      block_type: blockType,
      location: location || undefined,
      description: description || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-dark-100 border border-white/10 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-white uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Label *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="e.g., Dynamic Warmup, Lunch Break..."
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Block Type
            </label>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as BlockType)}
              className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
            >
              {BLOCK_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Court 1, Field A..."
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
              Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional notes for coaches..."
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!label || saving}
              className="flex-1 py-3 bg-neon text-dark-200 font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Schedule Templates Modal
function ScheduleTemplatesModal({
  onSelect,
  onClose,
  saving,
}: {
  onSelect: (templateId: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    const { data } = await getScheduleTemplates()
    if (data) {
      setTemplates(data)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-dark-100 border border-white/10 w-full max-w-lg max-h-[80vh] mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-white uppercase tracking-wider">Schedule Templates</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 text-neon animate-spin mx-auto" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center text-white/40">
              No schedule templates available.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template.id)}
                  disabled={saving}
                  className="w-full p-4 bg-black border border-white/20 hover:border-neon text-left transition-colors disabled:opacity-50"
                >
                  <p className="font-bold text-white">{template.name}</p>
                  {template.description && (
                    <p className="text-sm text-white/50 mt-1">{template.description}</p>
                  )}
                  <p className="text-xs text-white/30 mt-2">
                    {template.default_start_time} - {template.default_end_time} •{' '}
                    {template.blocks?.length || 0} blocks
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Curriculum Picker Modal
function CurriculumPickerModal({
  campId,
  dayNumber,
  currentBlockId,
  onSelect,
  onClose,
  saving,
}: {
  campId: string
  dayNumber: number
  currentBlockId: string | null
  onSelect: (blockId: string | null) => void
  onClose: () => void
  saving: boolean
}) {
  const [blocks, setBlocks] = useState<
    Array<{
      id: string
      title: string
      description: string | null
      duration_minutes: number
      category: string
      sport: string
    }>
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBlocks()
  }, [])

  async function loadBlocks() {
    const { data } = await getAvailableCurriculumBlocks(campId, dayNumber)
    if (data) {
      setBlocks(data)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-dark-100 border border-white/10 w-full max-w-lg max-h-[80vh] mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white uppercase tracking-wider">Link Curriculum Block</h3>
            <p className="text-sm text-white/50 mt-1">Day {dayNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 text-purple animate-spin mx-auto" />
            </div>
          ) : blocks.length === 0 ? (
            <div className="py-8 text-center text-white/40">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No curriculum blocks available.</p>
              <p className="text-sm mt-2">Assign a curriculum template first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Unlink option */}
              {currentBlockId && (
                <button
                  onClick={() => onSelect(null)}
                  disabled={saving}
                  className="w-full p-3 border border-dashed border-white/20 hover:border-red-400 text-white/50 hover:text-red-400 text-left transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Unlink className="h-4 w-4" />
                  Remove curriculum link
                </button>
              )}

              {blocks.map((block) => {
                const catConfig = BLOCK_CATEGORIES.find((c) => c.value === block.category)
                const isSelected = currentBlockId === block.id

                return (
                  <button
                    key={block.id}
                    onClick={() => onSelect(block.id)}
                    disabled={saving}
                    className={cn(
                      'w-full p-4 border text-left transition-colors disabled:opacity-50',
                      isSelected
                        ? 'bg-purple/10 border-purple'
                        : 'bg-black border-white/20 hover:border-purple/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{block.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-bold uppercase border',
                              catConfig?.color || 'bg-white/5 text-white/40 border-white/10'
                            )}
                          >
                            {catConfig?.label || block.category}
                          </span>
                          <span className="text-xs text-white/40">
                            {block.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-purple flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
