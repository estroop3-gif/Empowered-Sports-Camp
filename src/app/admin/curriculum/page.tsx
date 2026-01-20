'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  CurriculumTemplate,
  CurriculumBlock,
  TemplateFilters,
  BlockFilters,
  SPORTS,
  DIFFICULTIES,
  BLOCK_CATEGORIES,
  SportType,
  DifficultyLevel,
  BlockCategory,
} from '@/lib/services/curriculum'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Blocks,
  Link2,
  Plus,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  ChevronRight,
  Clock,
  Users,
  Calendar,
  Globe,
  Building2,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  MapPin,
  FileText,
} from 'lucide-react'

/**
 * Curriculum Builder Page
 *
 * Central hub for managing curriculum templates, blocks, and assignments.
 * Accessible to HQ admins and licensee owners (with scoped access).
 *
 * Tabs:
 * - Templates: Reusable curriculum templates per sport/age
 * - Blocks: Individual activity blocks (warmups, drills, etc.)
 * - Assignments: Link templates to camp sessions
 */

type TabType = 'templates' | 'blocks' | 'assignments'

export default function CurriculumPage() {
  const { user, role, isHqAdmin, tenant } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('templates')

  // Templates state
  const [templates, setTemplates] = useState<CurriculumTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templateFilters, setTemplateFilters] = useState<TemplateFilters>({
    sport: '',
    scope: 'all',
    difficulty: '',
    search: '',
  })

  // Blocks state
  const [blocks, setBlocks] = useState<CurriculumBlock[]>([])
  const [blocksLoading, setBlocksLoading] = useState(false)
  const [blockFilters, setBlockFilters] = useState<BlockFilters>({
    sport: '',
    category: '',
    scope: 'all',
    search: '',
  })

  // Assignments state
  const [camps, setCamps] = useState<Array<{
    id: string
    name: string
    sport: string
    start_date: string
    end_date: string
    tenant_id: string | null
    assigned_template_id?: string
    assigned_template_name?: string
  }>>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates()
    } else if (activeTab === 'blocks') {
      fetchBlocks()
    } else if (activeTab === 'assignments') {
      fetchAssignments()
    }
  }, [activeTab])

  // Re-fetch when filters change
  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates()
    }
  }, [templateFilters])

  useEffect(() => {
    if (activeTab === 'blocks') {
      fetchBlocks()
    }
  }, [blockFilters])

  const fetchTemplates = async () => {
    setTemplatesLoading(true)
    try {
      const params = new URLSearchParams({ action: 'templates' })
      if (templateFilters.sport) params.set('sport', templateFilters.sport)
      if (templateFilters.scope) params.set('scope', templateFilters.scope)
      if (templateFilters.difficulty) params.set('difficulty', templateFilters.difficulty)
      if (templateFilters.search) params.set('search', templateFilters.search)
      if (templateFilters.ageMin) params.set('ageMin', templateFilters.ageMin.toString())
      if (templateFilters.ageMax) params.set('ageMax', templateFilters.ageMax.toString())

      const response = await fetch(`/api/curriculum?${params}`, { credentials: 'include' })
      const result = await response.json()
      if (result.data) {
        setTemplates(result.data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
    setTemplatesLoading(false)
  }

  const fetchBlocks = async () => {
    setBlocksLoading(true)
    try {
      const params = new URLSearchParams({ action: 'blocks' })
      if (blockFilters.sport) params.set('sport', blockFilters.sport)
      if (blockFilters.category) params.set('category', blockFilters.category)
      if (blockFilters.scope) params.set('scope', blockFilters.scope)
      if (blockFilters.search) params.set('search', blockFilters.search)

      const response = await fetch(`/api/curriculum?${params}`, { credentials: 'include' })
      const result = await response.json()
      if (result.data) {
        setBlocks(result.data)
      }
    } catch (error) {
      console.error('Error fetching blocks:', error)
    }
    setBlocksLoading(false)
  }

  const fetchAssignments = async () => {
    setAssignmentsLoading(true)
    try {
      const response = await fetch('/api/curriculum?action=campsForAssignment', { credentials: 'include' })
      const result = await response.json()
      if (result.data) {
        setCamps(result.data)
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
    setAssignmentsLoading(false)
  }

  // Stats for display
  const templateStats = useMemo(() => ({
    total: templates.length,
    global: templates.filter(t => t.is_global).length,
    licensee: templates.filter(t => !t.is_global).length,
  }), [templates])

  const blockStats = useMemo(() => ({
    total: blocks.length,
    byCategory: BLOCK_CATEGORIES.reduce((acc, cat) => {
      acc[cat.value] = blocks.filter(b => b.category === cat.value).length
      return acc
    }, {} as Record<string, number>)
  }), [blocks])

  // Role-based checks
  const canCreate = isHqAdmin || role === 'licensee_owner' || role === 'director'
  const canEdit = isHqAdmin || role === 'licensee_owner' || role === 'director'
  const isReadOnly = role === 'coach'

  return (
    <AdminLayout userRole={role || 'hq_admin'} userName={userName}>
      <PageHeader
        title="Curriculum Builder"
        description="Design, manage, and assign sport-specific camp curriculum."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Curriculum' },
        ]}
      >
        {canCreate && activeTab === 'templates' && (
          <Link
            href="/admin/curriculum/templates/new"
            className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Template
          </Link>
        )}
        {canCreate && activeTab === 'blocks' && (
          <Link
            href="/admin/curriculum/blocks/new"
            className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Block
          </Link>
        )}
        {canEdit && activeTab === 'assignments' && (
          <Link
            href="/admin/curriculum/assign"
            className="flex items-center gap-2 px-6 py-3 bg-purple text-white text-sm font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors"
          >
            <Link2 className="h-5 w-5" />
            Manage Assignments
          </Link>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="mb-8 border-b border-white/10">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              'flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px',
              activeTab === 'templates'
                ? 'text-neon border-neon'
                : 'text-white/50 border-transparent hover:text-white/70'
            )}
          >
            <BookOpen className="h-4 w-4" />
            Templates
            <span className={cn(
              'ml-2 px-2 py-0.5 text-xs rounded-sm',
              activeTab === 'templates'
                ? 'bg-neon/20 text-neon'
                : 'bg-white/10 text-white/50'
            )}>
              {templateStats.total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={cn(
              'flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px',
              activeTab === 'blocks'
                ? 'text-magenta border-magenta'
                : 'text-white/50 border-transparent hover:text-white/70'
            )}
          >
            <Blocks className="h-4 w-4" />
            Blocks
            <span className={cn(
              'ml-2 px-2 py-0.5 text-xs rounded-sm',
              activeTab === 'blocks'
                ? 'bg-magenta/20 text-magenta'
                : 'bg-white/10 text-white/50'
            )}>
              {blockStats.total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={cn(
              'flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px',
              activeTab === 'assignments'
                ? 'text-purple border-purple'
                : 'text-white/50 border-transparent hover:text-white/70'
            )}
          >
            <Link2 className="h-4 w-4" />
            Assignments
            <span className={cn(
              'ml-2 px-2 py-0.5 text-xs rounded-sm',
              activeTab === 'assignments'
                ? 'bg-purple/20 text-purple'
                : 'bg-white/10 text-white/50'
            )}>
              {camps.filter(c => c.assigned_template_id).length}/{camps.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' && (
        <TemplatesTab
          templates={templates}
          loading={templatesLoading}
          filters={templateFilters}
          setFilters={setTemplateFilters}
          canCreate={canCreate}
          canEdit={canEdit}
          isHqAdmin={isHqAdmin}
        />
      )}

      {activeTab === 'blocks' && (
        <BlocksTab
          blocks={blocks}
          loading={blocksLoading}
          filters={blockFilters}
          setFilters={setBlockFilters}
          canCreate={canCreate}
          canEdit={canEdit}
          isHqAdmin={isHqAdmin}
        />
      )}

      {activeTab === 'assignments' && (
        <AssignmentsTab
          camps={camps}
          loading={assignmentsLoading}
          canEdit={canEdit}
          onRefresh={fetchAssignments}
        />
      )}
    </AdminLayout>
  )
}

// ============================================
// TEMPLATES TAB
// ============================================

function TemplatesTab({
  templates,
  loading,
  filters,
  setFilters,
  canCreate,
  canEdit,
  isHqAdmin,
}: {
  templates: CurriculumTemplate[]
  loading: boolean
  filters: TemplateFilters
  setFilters: (filters: TemplateFilters) => void
  canCreate: boolean
  canEdit: boolean
  isHqAdmin: boolean
}) {
  // Filter bar
  return (
    <>
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search templates..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
          />
        </div>
        <select
          value={filters.sport}
          onChange={(e) => setFilters({ ...filters, sport: e.target.value as SportType | '' })}
          className="px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[160px]"
        >
          <option value="">All Sports</option>
          {SPORTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filters.difficulty}
          onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as DifficultyLevel | '' })}
          className="px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[140px]"
        >
          <option value="">All Levels</option>
          {DIFFICULTIES.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <select
          value={filters.scope}
          onChange={(e) => setFilters({ ...filters, scope: e.target.value as 'all' | 'global' | 'licensee' })}
          className="px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[160px]"
        >
          <option value="all">All Templates</option>
          <option value="global">Global (HQ)</option>
          <option value="licensee">Licensee Only</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <ContentCard>
          <div className="py-16 text-center">
            <Loader2 className="h-12 w-12 text-neon animate-spin mx-auto mb-4" />
            <p className="text-white/50">Loading templates...</p>
          </div>
        </ContentCard>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <ContentCard>
          <div className="py-16 text-center">
            <BookOpen className="h-16 w-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Templates Found</h3>
            <p className="text-white/40 max-w-md mx-auto mb-6">
              {filters.search || filters.sport || filters.difficulty
                ? 'No templates match your current filters.'
                : 'Create your first curriculum template to get started.'}
            </p>
            {canCreate && (
              <Link
                href="/admin/curriculum/templates/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Template
              </Link>
            )}
          </div>
        </ContentCard>
      )}

      {/* Templates Grid */}
      {!loading && templates.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              canEdit={canEdit && (isHqAdmin || !template.is_global)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function TemplateCard({ template, canEdit }: { template: CurriculumTemplate; canEdit: boolean }) {
  const sportLabel = SPORTS.find(s => s.value === template.sport)?.label || template.sport
  const difficultyLabel = DIFFICULTIES.find(d => d.value === template.difficulty)?.label || template.difficulty

  return (
    <div className="bg-dark-100 border border-white/10 hover:border-neon/30 transition-colors">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider',
              template.is_global
                ? 'bg-neon/10 text-neon border border-neon/30'
                : 'bg-magenta/10 text-magenta border border-magenta/30'
            )}>
              {template.is_global ? <Globe className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
              {template.is_global ? 'Global' : 'Licensee'}
            </div>
            {/* PDF indicator badges */}
            {template.is_pdf_only ? (
              <div className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider bg-purple/10 text-purple border border-purple/30">
                <FileText className="h-3 w-3" />
                PDF Only
              </div>
            ) : template.pdf_url && (
              <div className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider bg-purple/10 text-purple border border-purple/30">
                <FileText className="h-3 w-3" />
                Has PDF
              </div>
            )}
          </div>
          <span className="text-xs text-white/40 uppercase">{sportLabel}</span>
        </div>
        <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">{template.name}</h3>
        {template.description && (
          <p className="text-sm text-white/50 line-clamp-2">{template.description}</p>
        )}
      </div>

      {/* Meta */}
      <div className="px-6 py-4 flex items-center gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {template.total_days} {template.total_days === 1 ? 'Day' : 'Days'}
        </span>
        {template.age_min && template.age_max && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Ages {template.age_min}-{template.age_max}
          </span>
        )}
        <span className={cn(
          'px-2 py-0.5 uppercase font-bold',
          template.difficulty === 'intro' && 'bg-green-500/20 text-green-400',
          template.difficulty === 'beginner' && 'bg-blue-500/20 text-blue-400',
          template.difficulty === 'intermediate' && 'bg-yellow-500/20 text-yellow-400',
          template.difficulty === 'advanced' && 'bg-red-500/20 text-red-400',
        )}>
          {difficultyLabel}
        </span>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-white/10 flex items-center gap-2">
        <Link
          href={`/admin/curriculum/templates/${template.id}`}
          className="flex items-center gap-2 flex-1 justify-center py-2 text-sm font-bold uppercase tracking-wider text-white/70 hover:text-neon transition-colors"
        >
          <Eye className="h-4 w-4" />
          View / Edit
        </Link>
        {template.is_pdf_only ? (
          // PDF-only templates show View PDF button
          <Link
            href={`/admin/curriculum/templates/${template.id}?tab=pdf`}
            className="flex items-center gap-2 flex-1 justify-center py-2 text-sm font-bold uppercase tracking-wider text-purple hover:text-purple/80 transition-colors border-l border-white/10"
          >
            <FileText className="h-4 w-4" />
            View PDF
          </Link>
        ) : canEdit && (
          // Structured templates show Plan Days button
          <Link
            href={`/admin/curriculum/templates/${template.id}?tab=planner`}
            className="flex items-center gap-2 flex-1 justify-center py-2 text-sm font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors border-l border-white/10"
          >
            <Blocks className="h-4 w-4" />
            Plan Days
          </Link>
        )}
      </div>
    </div>
  )
}

// ============================================
// BLOCKS TAB
// ============================================

function BlocksTab({
  blocks,
  loading,
  filters,
  setFilters,
  canCreate,
  canEdit,
  isHqAdmin,
}: {
  blocks: CurriculumBlock[]
  loading: boolean
  filters: BlockFilters
  setFilters: (filters: BlockFilters) => void
  canCreate: boolean
  canEdit: boolean
  isHqAdmin: boolean
}) {
  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    const grouped: Record<string, CurriculumBlock[]> = {}
    BLOCK_CATEGORIES.forEach(cat => {
      const catBlocks = blocks.filter(b => b.category === cat.value)
      if (catBlocks.length > 0) {
        grouped[cat.value] = catBlocks
      }
    })
    return grouped
  }, [blocks])

  return (
    <>
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-magenta focus:outline-none"
          />
        </div>
        <select
          value={filters.sport}
          onChange={(e) => setFilters({ ...filters, sport: e.target.value as SportType | '' })}
          className="px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none appearance-none min-w-[160px]"
        >
          <option value="">All Sports</option>
          {SPORTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value as BlockCategory | '' })}
          className="px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none appearance-none min-w-[160px]"
        >
          <option value="">All Categories</option>
          {BLOCK_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={filters.scope}
          onChange={(e) => setFilters({ ...filters, scope: e.target.value as 'all' | 'global' | 'licensee' })}
          className="px-4 py-3 bg-black border border-white/20 text-white focus:border-magenta focus:outline-none appearance-none min-w-[160px]"
        >
          <option value="all">All Blocks</option>
          <option value="global">Global (HQ)</option>
          <option value="licensee">Licensee Only</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <ContentCard>
          <div className="py-16 text-center">
            <Loader2 className="h-12 w-12 text-magenta animate-spin mx-auto mb-4" />
            <p className="text-white/50">Loading blocks...</p>
          </div>
        </ContentCard>
      )}

      {/* Empty State */}
      {!loading && blocks.length === 0 && (
        <ContentCard>
          <div className="py-16 text-center">
            <Blocks className="h-16 w-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Blocks Found</h3>
            <p className="text-white/40 max-w-md mx-auto mb-6">
              {filters.search || filters.sport || filters.category
                ? 'No blocks match your current filters.'
                : 'Create reusable activity blocks to build your curriculum.'}
            </p>
            {canCreate && (
              <Link
                href="/admin/curriculum/blocks/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Block
              </Link>
            )}
          </div>
        </ContentCard>
      )}

      {/* Blocks by Category */}
      {!loading && blocks.length > 0 && (
        <div className="space-y-8">
          {Object.entries(blocksByCategory).map(([category, categoryBlocks]) => {
            const catConfig = BLOCK_CATEGORIES.find(c => c.value === category)
            return (
              <div key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={cn(
                    'px-3 py-1 text-xs font-bold uppercase tracking-wider border',
                    catConfig?.color
                  )}>
                    {catConfig?.label}
                  </span>
                  <span className="text-sm text-white/40">{categoryBlocks.length} blocks</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoryBlocks.map(block => (
                    <BlockCard
                      key={block.id}
                      block={block}
                      canEdit={canEdit && (isHqAdmin || !block.is_global)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function BlockCard({ block, canEdit }: { block: CurriculumBlock; canEdit: boolean }) {
  const catConfig = BLOCK_CATEGORIES.find(c => c.value === block.category)
  const sportLabel = SPORTS.find(s => s.value === block.sport)?.label || block.sport

  return (
    <div className="bg-dark-100 border border-white/10 hover:border-magenta/30 transition-colors p-4">
      <div className="flex items-start justify-between mb-2">
        <span className={cn(
          'px-2 py-0.5 text-xs font-bold uppercase tracking-wider border',
          catConfig?.color
        )}>
          {catConfig?.label}
        </span>
        <span className="flex items-center gap-1 text-xs text-white/40">
          <Clock className="h-3 w-3" />
          {block.duration_minutes}m
        </span>
      </div>
      <h4 className="font-bold text-white mb-1">{block.title}</h4>
      {block.description && (
        <p className="text-xs text-white/50 line-clamp-2 mb-3">{block.description}</p>
      )}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/10">
        <span className="text-xs text-white/30 uppercase">{sportLabel}</span>
        <div className="flex items-center gap-1">
          {block.is_global ? (
            <Globe className="h-3 w-3 text-neon" />
          ) : (
            <Building2 className="h-3 w-3 text-magenta" />
          )}
          {canEdit && (
            <Link
              href={`/admin/curriculum/blocks/${block.id}`}
              className="p-1 text-white/40 hover:text-white transition-colors"
            >
              <Edit className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// ASSIGNMENTS TAB
// ============================================

function AssignmentsTab({
  camps,
  loading,
  canEdit,
  onRefresh,
}: {
  camps: Array<{
    id: string
    name: string
    sport: string
    start_date: string
    end_date: string
    tenant_id: string | null
    assigned_template_id?: string
    assigned_template_name?: string
  }>
  loading: boolean
  canEdit: boolean
  onRefresh: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCamps = useMemo(() => {
    if (!searchQuery) return camps
    const search = searchQuery.toLowerCase()
    return camps.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.assigned_template_name?.toLowerCase().includes(search)
    )
  }, [camps, searchQuery])

  const assignedCount = camps.filter(c => c.assigned_template_id).length
  const unassignedCount = camps.length - assignedCount

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="bg-dark-100 border border-white/10 p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Camps</p>
          <p className="text-2xl font-black text-white">{camps.length}</p>
        </div>
        <div className="bg-dark-100 border border-neon/30 p-4">
          <p className="text-xs text-neon uppercase tracking-wider mb-1">Assigned</p>
          <p className="text-2xl font-black text-neon">{assignedCount}</p>
        </div>
        <div className="bg-dark-100 border border-yellow-400/30 p-4">
          <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">Needs Curriculum</p>
          <p className="text-2xl font-black text-yellow-400">{unassignedCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search camps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-purple focus:outline-none"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <ContentCard>
          <div className="py-16 text-center">
            <Loader2 className="h-12 w-12 text-purple animate-spin mx-auto mb-4" />
            <p className="text-white/50">Loading camps...</p>
          </div>
        </ContentCard>
      )}

      {/* Empty State */}
      {!loading && filteredCamps.length === 0 && (
        <ContentCard>
          <div className="py-16 text-center">
            <Link2 className="h-16 w-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Camps Found</h3>
            <p className="text-white/40 max-w-md mx-auto">
              {searchQuery
                ? 'No camps match your search.'
                : 'Create some camps to assign curriculum to them.'}
            </p>
          </div>
        </ContentCard>
      )}

      {/* Camps Table */}
      {!loading && filteredCamps.length > 0 && (
        <ContentCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Camp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Sport
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Dates
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
                    Assigned Curriculum
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white/40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCamps.map(camp => {
                  const sportLabel = SPORTS.find(s => s.value === camp.sport)?.label || camp.sport
                  return (
                    <tr key={camp.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{camp.name}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-white/60">{sportLabel}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-white/60 text-sm">
                          {new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {camp.assigned_template_name ? (
                          <Link
                            href={`/admin/curriculum/templates/${camp.assigned_template_id}`}
                            className="text-neon hover:underline"
                          >
                            {camp.assigned_template_name}
                          </Link>
                        ) : (
                          <span className="text-yellow-400 text-sm">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {canEdit && (
                          <Link
                            href="/admin/curriculum/assign"
                            className="text-sm font-bold uppercase tracking-wider text-purple hover:text-purple/80 transition-colors"
                          >
                            {camp.assigned_template_id ? 'Change' : 'Assign'}
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}
    </>
  )
}
