'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  FileQuestion,
  Eye,
  EyeOff,
  Loader2,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleItem {
  id: string
  title: string
  slug: string
  description: string | null
  portal_type: string
  level: number
  video_provider: string
  video_url: string | null
  estimated_minutes: number
  is_published: boolean
  has_quiz: boolean
  quiz_title: string | null
  created_at: string
}

const PORTAL_OPTIONS = [
  { value: '', label: 'All Portals' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'SKILL_STATION', label: 'Skill Station' },
]

const PORTAL_COLORS: Record<string, string> = {
  OPERATIONAL: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  BUSINESS: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  SKILL_STATION: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
}

export default function ManageModulesPage() {
  const router = useRouter()
  const [modules, setModules] = useState<ModuleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalFilter, setPortalFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    loadModules()
  }, [portalFilter])

  async function loadModules() {
    setLoading(true)
    setError(null)

    try {
      const url = portalFilter
        ? `/api/empoweru/admin/modules?portalType=${portalFilter}`
        : '/api/empoweru/admin/modules'
      const res = await fetch(url)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to load modules')
        setModules([])
      } else {
        setModules(json.data || [])
      }
    } catch (err) {
      setError('Failed to load modules')
      setModules([])
    }

    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this module? This will also delete any associated quiz.')) {
      return
    }

    setDeleting(id)

    try {
      const res = await fetch(`/api/empoweru/admin/modules/${id}`, { method: 'DELETE' })
      const json = await res.json()

      if (!res.ok) {
        alert(json.error || 'Failed to delete module')
      } else {
        setModules((prev) => prev.filter((m) => m.id !== id))
      }
    } catch (err) {
      alert('Failed to delete module')
    }

    setDeleting(null)
  }

  async function handleTogglePublish(module: ModuleItem) {
    setToggling(module.id)

    try {
      const res = await fetch(`/api/empoweru/admin/modules/${module.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !module.is_published }),
      })
      const json = await res.json()

      if (!res.ok) {
        alert(json.error || 'Failed to update module')
      } else {
        setModules((prev) =>
          prev.map((m) =>
            m.id === module.id ? { ...m, is_published: !m.is_published } : m
          )
        )
      }
    } catch (err) {
      alert('Failed to update module')
    }

    setToggling(null)
  }

  const filteredModules = modules.filter((m) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      m.title.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.slug.toLowerCase().includes(q)
    )
  })

  const stats = {
    total: modules.length,
    published: modules.filter((m) => m.is_published).length,
    withQuiz: modules.filter((m) => m.has_quiz).length,
    operational: modules.filter((m) => m.portal_type === 'OPERATIONAL').length,
    business: modules.filter((m) => m.portal_type === 'BUSINESS').length,
    skillStation: modules.filter((m) => m.portal_type === 'SKILL_STATION').length,
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="mb-4">
        <Link
          href="/admin/empoweru"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to EmpowerU
        </Link>
      </div>

      <PageHeader
        title="Manage Modules"
        description="Create, edit, and manage training modules across all portals"
      >
        <Link
          href="/admin/empoweru/modules/new"
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Module
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <ContentCard>
          <div className="text-center">
            <p className="text-2xl font-black text-white">{stats.total}</p>
            <p className="text-xs text-white/50 uppercase tracking-wider">Total</p>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="text-center">
            <p className="text-2xl font-black text-neon">{stats.published}</p>
            <p className="text-xs text-white/50 uppercase tracking-wider">Published</p>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="text-center">
            <p className="text-2xl font-black text-purple">{stats.withQuiz}</p>
            <p className="text-xs text-white/50 uppercase tracking-wider">With Quiz</p>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="text-center">
            <p className="text-2xl font-black text-blue-400">{stats.operational}</p>
            <p className="text-xs text-white/50 uppercase tracking-wider">Operational</p>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="text-center">
            <p className="text-2xl font-black text-purple-400">{stats.business}</p>
            <p className="text-xs text-white/50 uppercase tracking-wider">Business</p>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="text-center">
            <p className="text-2xl font-black text-orange-400">{stats.skillStation}</p>
            <p className="text-xs text-white/50 uppercase tracking-wider">Skill Station</p>
          </div>
        </ContentCard>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <select
            value={portalFilter}
            onChange={(e) => setPortalFilter(e.target.value)}
            className="pl-12 pr-8 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[180px]"
          >
            {PORTAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <ContentCard>
          <div className="py-16 text-center">
            <Loader2 className="h-12 w-12 text-neon animate-spin mx-auto mb-4" />
            <p className="text-white/50">Loading modules...</p>
          </div>
        </ContentCard>
      )}

      {/* Error */}
      {!loading && error && (
        <ContentCard>
          <div className="py-16 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-white mb-4">{error}</p>
            <button
              onClick={loadModules}
              className="px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </ContentCard>
      )}

      {/* Empty State */}
      {!loading && !error && modules.length === 0 && (
        <ContentCard>
          <div className="py-16 text-center">
            <GraduationCap className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Modules Yet</h3>
            <p className="text-white/50 mb-6">Create your first training module to get started</p>
            <Link
              href="/admin/empoweru/modules/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Module
            </Link>
          </div>
        </ContentCard>
      )}

      {/* Module Table */}
      {!loading && !error && filteredModules.length > 0 && (
        <ContentCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Module
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Portal
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Level
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Duration
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Quiz
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Status
                  </th>
                  <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredModules.map((module) => (
                  <tr
                    key={module.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-bold text-white">{module.title}</div>
                        <div className="text-sm text-white/40 truncate max-w-xs">
                          {module.description || 'No description'}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-bold uppercase border',
                          PORTAL_COLORS[module.portal_type] || 'bg-white/10 text-white/60'
                        )}
                      >
                        {module.portal_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-white">{module.level}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-white/70">{module.estimated_minutes} min</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {module.has_quiz ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-purple/10 text-purple border border-purple/30">
                          <FileQuestion className="h-3 w-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {module.is_published ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-neon/10 text-neon border border-neon/30">
                          <CheckCircle className="h-3 w-3" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-white/10 text-white/40 border border-white/20">
                          <EyeOff className="h-3 w-3" />
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleTogglePublish(module)}
                          disabled={toggling === module.id}
                          className={cn(
                            'p-2 transition-colors',
                            module.is_published
                              ? 'text-neon hover:bg-neon/10'
                              : 'text-white/50 hover:text-white hover:bg-white/10'
                          )}
                          title={module.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {toggling === module.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : module.is_published ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <Link
                          href={`/admin/empoweru/modules/${module.id}/edit`}
                          className="p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                          title="Edit Module"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/empoweru/modules/${module.id}/quiz`}
                          className="p-2 text-purple/70 hover:text-purple hover:bg-purple/10 transition-colors"
                          title={module.has_quiz ? 'Edit Quiz' : 'Add Quiz'}
                        >
                          <FileQuestion className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(module.id)}
                          disabled={deleting === module.id}
                          className="p-2 text-white/50 hover:text-magenta hover:bg-magenta/10 transition-colors"
                          title="Delete Module"
                        >
                          {deleting === module.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-white/10">
            <p className="text-sm text-white/40">
              Showing {filteredModules.length} of {modules.length} module
              {modules.length !== 1 ? 's' : ''}
            </p>
          </div>
        </ContentCard>
      )}
    </AdminLayout>
  )
}
