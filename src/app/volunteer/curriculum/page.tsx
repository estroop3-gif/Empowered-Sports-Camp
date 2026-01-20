'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import { getBlocks, type CurriculumBlock, SPORTS } from '@/lib/services/curriculum'
import {
  BookOpen,
  Search,
  ChevronDown,
  Clock,
  Loader2,
  Dumbbell,
  Target,
  Zap,
  Users,
  Filter,
} from 'lucide-react'

/**
 * Volunteer Curriculum Page
 *
 * Read-only access to curriculum blocks/activities.
 * Volunteers can browse drills and activities they might help with.
 */

export default function VolunteerCurriculumPage() {
  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<CurriculumBlock[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    loadBlocks()
  }, [])

  async function loadBlocks() {
    const { data } = await getBlocks()
    if (data) setBlocks(data)
    setLoading(false)
  }

  // Get unique categories
  const categories = [...new Set(blocks.map((b) => b.category))].sort()

  // Filter blocks
  const filteredBlocks = blocks.filter((b) => {
    if (searchTerm && !b.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (sportFilter && b.sport !== sportFilter) return false
    if (categoryFilter && b.category !== categoryFilter) return false
    return true
  })

  // Category icons
  const categoryIcons: Record<string, typeof Dumbbell> = {
    warmup: Zap,
    drill: Target,
    skill_station: Dumbbell,
    scrimmage: Users,
    game: Users,
    mindset: BookOpen,
    leadership: Users,
    team_building: Users,
    cooldown: Clock,
    water_break: Clock,
    transition: Clock,
    other: BookOpen,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-orange-400 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <PortalPageHeader
        title="Curriculum Library"
        description="Browse activities, drills, and games used at camp"
      />

      {/* Info Banner */}
      <PortalCard className="mb-8" accent="purple">
        <div className="flex items-start gap-4">
          <BookOpen className="h-8 w-8 text-purple flex-shrink-0" />
          <div>
            <h3 className="font-bold text-white mb-1">Activity Reference</h3>
            <p className="text-white/60 text-sm">
              Use this library to familiarize yourself with camp activities. Directors and coaches
              will guide you on which activities to help with during each session.
            </p>
          </div>
        </div>
      </PortalCard>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search activities..."
            className="w-full pl-10 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
          />
        </div>
        <div className="relative md:w-48">
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none"
          >
            <option value="">All Sports</option>
            {SPORTS.map((sport) => (
              <option key={sport.value} value={sport.value}>
                {sport.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 pointer-events-none" />
        </div>
        <div className="relative md:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-white/40 mb-4">
        Showing {filteredBlocks.length} of {blocks.length} activities
      </p>

      {/* Blocks Grid */}
      {filteredBlocks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBlocks.map((block) => {
            const sportConfig = SPORTS.find((s) => s.value === block.sport)
            const CategoryIcon = categoryIcons[block.category] || BookOpen

            return (
              <PortalCard key={block.id} className="hover:border-white/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-5 w-5 text-orange-400" />
                    <span className="text-xs font-bold uppercase text-white/40 capitalize">
                      {block.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="px-2 py-1 text-xs font-bold uppercase bg-white/10 text-white/60">
                    {block.duration_minutes} min
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{block.title}</h3>

                {block.description && (
                  <p className="text-sm text-white/50 mb-4 line-clamp-3">
                    {block.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs mb-4">
                  <span className="px-2 py-1 bg-purple/10 text-purple border border-purple/30">
                    {sportConfig?.label || block.sport}
                  </span>
                  {block.intensity && (
                    <span className={`px-2 py-1 ${
                      block.intensity === 'high'
                        ? 'bg-magenta/10 text-magenta'
                        : block.intensity === 'moderate'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-neon/10 text-neon'
                    }`}>
                      {block.intensity} intensity
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  {block.equipment_needed && (
                    <div>
                      <p className="text-xs font-bold text-white/40 uppercase mb-1">Equipment</p>
                      <p className="text-sm text-white/60">{block.equipment_needed}</p>
                    </div>
                  )}
                  {block.setup_notes && (
                    <div>
                      <p className="text-xs font-bold text-white/40 uppercase mb-1">Setup</p>
                      <p className="text-sm text-white/60">{block.setup_notes}</p>
                    </div>
                  )}
                  {block.coaching_points && (
                    <div>
                      <p className="text-xs font-bold text-white/40 uppercase mb-1">Tips</p>
                      <p className="text-sm text-white/60 line-clamp-2">{block.coaching_points}</p>
                    </div>
                  )}
                </div>
              </PortalCard>
            )
          })}
        </div>
      ) : (
        <PortalCard>
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Activities Found</h3>
            <p className="text-white/50">
              {searchTerm || sportFilter || categoryFilter
                ? 'Try adjusting your filters'
                : 'No curriculum blocks available'}
            </p>
          </div>
        </PortalCard>
      )}
    </div>
  )
}
