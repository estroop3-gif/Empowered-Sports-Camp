'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { type CurriculumTemplate, type CurriculumBlock, SPORTS } from '@/lib/services/curriculum'
import {
  BookOpen,
  Search,
  Filter,
  Clock,
  Users,
  Calendar,
  ChevronDown,
  ExternalLink,
  Loader2,
  Dumbbell,
  Target,
  Zap,
} from 'lucide-react'

/**
 * Director Curriculum Page
 *
 * Provides read access to curriculum library with:
 * - Browse templates
 * - Browse blocks/activities
 * - View details
 *
 * Directors can view but have limited contribution abilities.
 */

type Tab = 'templates' | 'blocks'

export default function DirectorCurriculumPage() {
  const { tenant } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('templates')
  const [templates, setTemplates] = useState<CurriculumTemplate[]>([])
  const [blocks, setBlocks] = useState<CurriculumBlock[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sportFilter, setSportFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [activeTab])

  async function loadData() {
    setLoading(true)

    try {
      if (activeTab === 'templates') {
        const response = await fetch('/api/curriculum?action=templates', { credentials: 'include' })
        const result = await response.json()
        if (result.data) setTemplates(result.data)
      } else {
        const response = await fetch('/api/curriculum?action=blocks', { credentials: 'include' })
        const result = await response.json()
        if (result.data) setBlocks(result.data)
      }
    } catch (error) {
      console.error('Error loading curriculum data:', error)
    }

    setLoading(false)
  }

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (sportFilter && t.sport !== sportFilter) return false
    return true
  })

  // Filter blocks
  const filteredBlocks = blocks.filter((b) => {
    if (searchTerm && !b.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (sportFilter && b.sport !== sportFilter) return false
    return true
  })

  // Category icons for blocks
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

  return (
    <div>
      <PortalPageHeader
        title="Curriculum Library"
        description="Browse templates, drills, and activities for your camps"
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['templates', 'blocks'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'bg-neon text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab === 'templates' ? 'Templates' : 'Activities & Drills'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab}...`}
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
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      ) : activeTab === 'templates' ? (
        /* Templates Grid */
        filteredTemplates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => {
              const sportConfig = SPORTS.find((s) => s.value === template.sport)
              return (
                <PortalCard key={template.id} className="hover:border-white/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-1 text-xs font-bold uppercase bg-purple/10 text-purple border border-purple/30">
                      {sportConfig?.label || template.sport}
                    </span>
                    {template.is_global && (
                      <span className="px-2 py-1 text-xs font-bold uppercase bg-neon/10 text-neon">
                        Global
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>

                  {template.description && (
                    <p className="text-sm text-white/50 mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {template.total_days} days
                    </span>
                    {template.age_min && template.age_max && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Ages {template.age_min}-{template.age_max}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Link
                      href={`/admin/curriculum/templates/${template.id}`}
                      className="text-sm text-neon hover:text-neon/80 font-semibold flex items-center gap-1"
                    >
                      View Template
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </PortalCard>
              )
            })}
          </div>
        ) : (
          <PortalCard>
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Templates Found</h3>
              <p className="text-white/50">
                {searchTerm || sportFilter
                  ? 'Try adjusting your filters'
                  : 'No curriculum templates available'}
              </p>
            </div>
          </PortalCard>
        )
      ) : (
        /* Blocks Grid */
        filteredBlocks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBlocks.map((block) => {
              const sportConfig = SPORTS.find((s) => s.value === block.sport)
              const CategoryIcon = categoryIcons[block.category] || BookOpen

              return (
                <PortalCard key={block.id} className="hover:border-white/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-5 w-5 text-purple" />
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

                  <div className="flex items-center gap-3 text-xs">
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
                        {block.intensity}
                      </span>
                    )}
                  </div>

                  {(block.equipment_needed || block.coaching_points) && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      {block.equipment_needed && (
                        <p className="text-xs text-white/40">
                          <span className="font-bold">Equipment:</span> {block.equipment_needed}
                        </p>
                      )}
                      {block.coaching_points && (
                        <p className="text-xs text-white/40 line-clamp-2">
                          <span className="font-bold">Tips:</span> {block.coaching_points}
                        </p>
                      )}
                    </div>
                  )}
                </PortalCard>
              )
            })}
          </div>
        ) : (
          <PortalCard>
            <div className="text-center py-12">
              <Dumbbell className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Activities Found</h3>
              <p className="text-white/50">
                {searchTerm || sportFilter
                  ? 'Try adjusting your filters'
                  : 'No curriculum blocks available'}
              </p>
            </div>
          </PortalCard>
        )
      )}
    </div>
  )
}
