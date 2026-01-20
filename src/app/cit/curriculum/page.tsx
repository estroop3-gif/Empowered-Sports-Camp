'use client'

/**
 * CIT Curriculum Library Page
 *
 * Shows curriculum content relevant to CITs including:
 * - Skill Station training materials
 * - Drills and activities
 * - Contribution submission
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Loader2,
  AlertCircle,
  BookOpen,
  Play,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Star,
  Users,
  Lightbulb,
} from 'lucide-react'

interface LibraryItem {
  id: string
  title: string
  description: string | null
  portal_type: string
  level: number
  estimated_minutes: number
  has_quiz: boolean
  contributor?: {
    name: string
    role: string
  } | null
}

export default function CitCurriculumPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<LibraryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'skill_station'>('all')

  useEffect(() => {
    loadLibrary()
  }, [])

  async function loadLibrary() {
    try {
      setLoading(true)
      // Fetch skill station modules as curriculum
      const res = await fetch('/api/empoweru/modules?portalType=SKILL_STATION')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load curriculum')
      }

      setItems(json.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  if (loading) {
    return (
      <LmsGate featureName="curriculum library">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-purple animate-spin" />
        </div>
      </LmsGate>
    )
  }

  if (error) {
    return (
      <LmsGate featureName="curriculum library">
        <PortalPageHeader
          title="Curriculum Library"
          description="Training resources and activities"
        />
        <PortalCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Curriculum</h3>
            <p className="text-white/50 mb-4">{error}</p>
            <button
              onClick={loadLibrary}
              className="px-6 py-3 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </PortalCard>
      </LmsGate>
    )
  }

  return (
    <LmsGate featureName="curriculum library">
      <div>
        <PortalPageHeader
          title="Curriculum Library"
          description="Training resources, drills, and activities"
          actions={
            <Link
              href="/cit/empoweru"
              className="px-4 py-2 bg-purple text-white font-bold uppercase tracking-wider text-sm hover:bg-purple/90 transition-colors"
            >
              Open EmpowerU
            </Link>
          }
        />

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="text"
              placeholder="Search curriculum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <a
            href="https://www.nfhslearn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-orange-400/10 border border-orange-400/30 hover:border-orange-400/50 transition-colors"
          >
            <ExternalLink className="h-8 w-8 text-orange-400" />
            <div>
              <h3 className="font-bold text-white">NFHS Learn</h3>
              <p className="text-sm text-white/50">External certification courses</p>
            </div>
          </a>

          <Link
            href="/cit/empoweru"
            className="flex items-center gap-4 p-4 bg-purple/10 border border-purple/30 hover:border-purple/50 transition-colors"
          >
            <Users className="h-8 w-8 text-purple" />
            <div>
              <h3 className="font-bold text-white">Guest Speaker Curriculum</h3>
              <p className="text-sm text-white/50">Presentation materials</p>
            </div>
          </Link>

          <Link
            href="/cit/curriculum/contribute"
            className="flex items-center gap-4 p-4 bg-neon/10 border border-neon/30 hover:border-neon/50 transition-colors"
          >
            <Lightbulb className="h-8 w-8 text-neon" />
            <div>
              <h3 className="font-bold text-white">Contribute</h3>
              <p className="text-sm text-white/50">Share your training ideas</p>
            </div>
          </Link>
        </div>

        {/* Curriculum Items */}
        {filteredItems.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Curriculum Found</h3>
              <p className="text-white/50">
                {searchQuery
                  ? 'No items match your search. Try different keywords.'
                  : 'No curriculum content available yet.'}
              </p>
            </div>
          </PortalCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <CurriculumCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </LmsGate>
  )
}

function CurriculumCard({ item }: { item: LibraryItem }) {
  return (
    <PortalCard className="hover:border-purple/30 transition-colors">
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-bold text-white line-clamp-2">{item.title}</h3>
          <span className="px-2 py-0.5 text-xs font-bold uppercase bg-purple/20 text-purple flex-shrink-0">
            Level {item.level}
          </span>
        </div>

        {item.description && (
          <p className="text-sm text-white/50 mb-4 line-clamp-2">{item.description}</p>
        )}

        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-white/40">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {item.estimated_minutes} min
              </span>
              {item.has_quiz && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400" />
                  Quiz
                </span>
              )}
            </div>

            <Link
              href={`/cit/empoweru/module/${item.id}`}
              className="flex items-center gap-1 text-sm text-purple hover:text-purple/80 transition-colors"
            >
              <Play className="h-4 w-4" />
              View
            </Link>
          </div>

          {item.contributor && (
            <p className="text-xs text-white/30 mt-2">
              By {item.contributor.name} ({item.contributor.role})
            </p>
          )}
        </div>
      </div>
    </PortalCard>
  )
}
