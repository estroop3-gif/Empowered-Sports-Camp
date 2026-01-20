'use client'

/**
 * Curriculum Browser Component
 *
 * Slide-out panel for browsing and inserting curriculum blocks.
 */

import { useState, useEffect } from 'react'
import {
  X,
  Search,
  BookOpen,
  Clock,
  Loader2,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CurriculumBlock {
  id: string
  title: string
  description: string | null
  sport: string | null
  category: string | null
  durationMinutes: number
  intensity: string | null
  equipmentNeeded: string | null
  coachingPoints: string | null
}

interface CurriculumBrowserProps {
  onInsertBlock: (block: CurriculumBlock) => void
  onClose: () => void
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'warmup', label: 'Warmup' },
  { value: 'drill', label: 'Drill' },
  { value: 'skill_station', label: 'Skill Station' },
  { value: 'scrimmage', label: 'Scrimmage' },
  { value: 'game', label: 'Game' },
  { value: 'mindset', label: 'Mindset' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'team_building', label: 'Team Building' },
  { value: 'cooldown', label: 'Cooldown' },
  { value: 'water_break', label: 'Water Break' },
]

const SPORTS = [
  { value: '', label: 'All Sports' },
  { value: 'multi_sport', label: 'Multi-Sport' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'soccer', label: 'Soccer' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'softball', label: 'Softball' },
  { value: 'flag_football', label: 'Flag Football' },
  { value: 'lacrosse', label: 'Lacrosse' },
]

const CATEGORY_COLORS: Record<string, string> = {
  warmup: 'bg-emerald-500/10 text-emerald-500',
  drill: 'bg-blue-500/10 text-blue-500',
  skill_station: 'bg-violet-500/10 text-violet-500',
  scrimmage: 'bg-amber-500/10 text-amber-500',
  game: 'bg-red-500/10 text-red-500',
  mindset: 'bg-pink-500/10 text-pink-500',
  leadership: 'bg-indigo-500/10 text-indigo-500',
  team_building: 'bg-teal-500/10 text-teal-500',
  cooldown: 'bg-gray-500/10 text-gray-400',
  water_break: 'bg-cyan-500/10 text-cyan-500',
}

export function CurriculumBrowser({ onInsertBlock, onClose }: CurriculumBrowserProps) {
  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<CurriculumBlock[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadBlocks()
  }, [])

  const loadBlocks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'blocks' })
      const res = await fetch(`/api/curriculum?${params}`)
      const json = await res.json()
      if (res.ok && json.data) {
        setBlocks(json.data)
      }
    } catch (err) {
      console.error('Failed to load curriculum blocks:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter blocks
  const filteredBlocks = blocks.filter(block => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !block.title.toLowerCase().includes(query) &&
        !block.description?.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    if (categoryFilter && block.category !== categoryFilter) return false
    if (sportFilter && block.sport !== sportFilter) return false
    return true
  })

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-dark-100 border-l border-white/10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple" />
            <h2 className="text-lg font-bold text-white">Curriculum Library</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-white/10 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocks..."
              className="w-full bg-black border border-white/20 pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:border-neon focus:outline-none text-sm"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronRight className={cn(
              'h-4 w-4 transition-transform',
              showFilters && 'rotate-90'
            )} />
          </button>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-black border border-white/20 text-white text-sm px-3 py-2 focus:border-neon focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="bg-black border border-white/20 text-white text-sm px-3 py-2 focus:border-neon focus:outline-none"
              >
                {SPORTS.map(sport => (
                  <option key={sport.value} value={sport.value}>{sport.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Blocks List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neon" />
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              No blocks found matching your criteria
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredBlocks.map(block => (
                <button
                  key={block.id}
                  onClick={() => onInsertBlock(block)}
                  className="w-full text-left p-4 bg-black/30 border border-white/10 hover:border-purple/50 hover:bg-purple/5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Category & Duration */}
                      <div className="flex items-center gap-2 mb-1">
                        {block.category && (
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
                            CATEGORY_COLORS[block.category] || 'bg-white/10 text-white/50'
                          )}>
                            {block.category.replace('_', ' ')}
                          </span>
                        )}
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {block.durationMinutes} min
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-white group-hover:text-purple transition-colors">
                        {block.title}
                      </h4>

                      {/* Description */}
                      {block.description && (
                        <p className="text-sm text-white/50 mt-1 line-clamp-2">
                          {block.description}
                        </p>
                      )}

                      {/* Sport & Intensity */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                        {block.sport && (
                          <span className="capitalize">{block.sport.replace('_', ' ')}</span>
                        )}
                        {block.intensity && (
                          <span>Intensity: {block.intensity}</span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-purple transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 text-center text-sm text-white/40">
          {filteredBlocks.length} block{filteredBlocks.length !== 1 ? 's' : ''} available
        </div>
      </div>
    </div>
  )
}
