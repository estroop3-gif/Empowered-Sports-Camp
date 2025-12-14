'use client'

/**
 * SharedLibrary
 *
 * Browse all approved training content from the EmpowerU community.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  User,
  ChevronRight,
  Loader2,
  Target,
  Briefcase,
  GraduationCap,
} from 'lucide-react'
import type { EmpowerUModuleWithProgress, PortalType } from '@/lib/services/empoweru'

const PORTAL_FILTERS: { value: PortalType | ''; label: string; icon: React.ElementType }[] = [
  { value: '', label: 'All Portals', icon: BookOpen },
  { value: 'OPERATIONAL', label: 'Operational', icon: Target },
  { value: 'BUSINESS', label: 'Business', icon: Briefcase },
  { value: 'SKILL_STATION', label: 'Skill Station', icon: GraduationCap },
]

interface SharedLibraryProps {
  baseRoute: string
}

export function SharedLibrary({ baseRoute }: SharedLibraryProps) {
  const [modules, setModules] = useState<EmpowerUModuleWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [portalFilter, setPortalFilter] = useState<PortalType | ''>('')

  useEffect(() => {
    loadLibrary()
  }, [portalFilter])

  async function loadLibrary() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (portalFilter) params.set('portalType', portalFilter)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/empoweru/library?${params}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load library')
      }

      setModules(json.data || [])
    } catch (err) {
      console.error('Failed to load library:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadLibrary()
  }

  // Group modules by portal type
  const modulesByPortal = modules.reduce(
    (acc, module) => {
      const portal = module.portal_type
      if (!acc[portal]) acc[portal] = []
      acc[portal].push(module)
      return acc
    },
    {} as Record<PortalType, EmpowerUModuleWithProgress[]>
  )

  // Filter by search query (client-side for immediate feedback)
  const filteredModules = searchQuery
    ? modules.filter(
        (m) =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : modules

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search training content..."
            className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
          />
        </form>

        <div className="flex gap-2">
          {PORTAL_FILTERS.map((filter) => {
            const isActive = portalFilter === filter.value
            const Icon = filter.icon

            return (
              <button
                key={filter.value}
                onClick={() => setPortalFilter(filter.value as PortalType | '')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                  isActive
                    ? 'bg-neon text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{filter.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-neon animate-spin" />
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="p-12 bg-white/5 border border-white/10 text-center">
          <BookOpen className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Content Found</h3>
          <p className="text-white/50">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Check back soon for new training content'}
          </p>
        </div>
      ) : portalFilter ? (
        // Show filtered results in a grid
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((module) => (
            <LibraryCard key={module.id} module={module} baseRoute={baseRoute} />
          ))}
        </div>
      ) : (
        // Group by portal when showing all
        <div className="space-y-8">
          {(['OPERATIONAL', 'BUSINESS', 'SKILL_STATION'] as PortalType[]).map((portal) => {
            const portalModules = modulesByPortal[portal]?.filter(
              (m) =>
                !searchQuery ||
                m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )

            if (!portalModules || portalModules.length === 0) return null

            const portalConfig = PORTAL_FILTERS.find((f) => f.value === portal)
            const Icon = portalConfig?.icon || BookOpen

            return (
              <div key={portal}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="h-5 w-5 text-neon" />
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    {portal.replace('_', ' ')}
                  </h3>
                  <span className="text-white/50 text-sm">({portalModules.length})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {portalModules.slice(0, 6).map((module) => (
                    <LibraryCard key={module.id} module={module} baseRoute={baseRoute} />
                  ))}
                </div>
                {portalModules.length > 6 && (
                  <button
                    onClick={() => setPortalFilter(portal)}
                    className="mt-4 text-neon text-sm font-bold uppercase tracking-wider hover:underline"
                  >
                    View all {portalModules.length} in {portal.replace('_', ' ')} →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LibraryCard({
  module,
  baseRoute,
}: {
  module: EmpowerUModuleWithProgress
  baseRoute: string
}) {
  const portalConfig = PORTAL_FILTERS.find((f) => f.value === module.portal_type)
  const PortalIcon = portalConfig?.icon || BookOpen

  return (
    <Link
      href={`${baseRoute}/module/${module.slug}?portalType=${module.portal_type}`}
      className="block p-4 bg-black border border-white/10 hover:border-neon/50 hover:bg-white/5 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider bg-white/5 text-white/50 border border-white/10">
          <PortalIcon className="h-3 w-3" />
          {module.portal_type.replace('_', ' ')}
        </span>
        <ChevronRight className="h-4 w-4 text-white/30" />
      </div>

      <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">{module.title}</h4>

      {module.description && (
        <p className="text-white/50 text-sm mb-3 line-clamp-2">{module.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>{module.estimated_minutes} min</span>
        </div>
        {module.contributor && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{module.contributor.name}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
