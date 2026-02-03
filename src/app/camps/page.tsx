'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CampCard } from '@/components/camps/camp-card'
import { CampFilters } from '@/components/camps/camp-filters'
import { Zap, Crown, Loader2 } from 'lucide-react'
import type { CampCardData } from '@/types'

// Program type labels for UI display
const PROGRAM_TYPE_LABELS: Record<string, string> = {
  all_girls_sports_camp: 'All-Girls Sports Camp',
  cit_program: 'CIT Program',
  soccer_strength: 'Soccer & Strength',
  basketball_intensive: 'Basketball Intensive',
  volleyball_clinic: 'Volleyball Clinic',
  specialty_camp: 'Specialty Camp',
}

function getProgramTypeLabel(programType: string): string {
  return PROGRAM_TYPE_LABELS[programType] || programType
}

interface PublicCampCard {
  id: string
  slug: string
  name: string
  program_type: string
  start_date: string
  end_date: string
  min_age: number
  max_age: number
  current_price: number
  spots_remaining: number
  image_url: string | null
  location_name: string | null
  city: string | null
  state: string | null
}

interface CampFilterParams {
  city?: string
  program_type?: string
  search?: string
  min_age?: number
  max_age?: number
}

// Transform PublicCampCard to CampCardData for the UI
function transformToCampCard(camp: PublicCampCard): CampCardData {
  return {
    id: camp.id,
    slug: camp.slug,
    name: camp.name,
    programType: getProgramTypeLabel(camp.program_type),
    location: camp.location_name || 'TBD',
    city: camp.city || '',
    state: camp.state || '',
    startDate: camp.start_date.split('T')[0],
    endDate: camp.end_date.split('T')[0],
    minAge: camp.min_age,
    maxAge: camp.max_age,
    price: camp.current_price,
    spotsLeft: camp.spots_remaining,
    imageUrl: camp.image_url,
  }
}

function CampsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [camps, setCamps] = useState<CampCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCamps, setTotalCamps] = useState(0)
  const [locations, setLocations] = useState<string[]>([])
  const [programTypes, setProgramTypes] = useState<string[]>([])

  // Extract filters from URL
  const filters: CampFilterParams = {
    city: searchParams.get('location') || undefined,
    program_type: searchParams.get('program') || undefined,
    search: searchParams.get('search') || undefined,
  }

  // Parse age filter
  const ageParam = searchParams.get('age')
  if (ageParam) {
    const [minAge, maxAge] = ageParam.split('-').map(Number)
    if (!isNaN(minAge)) filters.min_age = minAge
    if (!isNaN(maxAge)) filters.max_age = maxAge
  }

  // Load filter options on mount via API
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [citiesRes, typesRes] = await Promise.all([
          fetch('/api/camps?action=cities'),
          fetch('/api/camps?action=programTypes'),
        ])
        const [citiesJson, typesJson] = await Promise.all([
          citiesRes.json(),
          typesRes.json(),
        ])
        setLocations(citiesJson.data || [])
        setProgramTypes((typesJson.data || []).map((t: string) => getProgramTypeLabel(t)))
      } catch (err) {
        console.error('Failed to load filter options:', err)
        // Use fallback values
        setLocations(['Chicago', 'Tampa', 'Evanston'])
        setProgramTypes(['All Girls Sports Camp', 'CIT Program'])
      }
    }
    loadFilterOptions()
  }, [])

  // Load camps when filters change via API
  const loadCamps = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ action: 'list', perPage: '50' })
      if (filters.city) params.set('city', filters.city)
      if (filters.program_type) params.set('programType', filters.program_type)
      if (filters.min_age) params.set('minAge', String(filters.min_age))
      if (filters.max_age) params.set('maxAge', String(filters.max_age))
      if (filters.search) params.set('search', filters.search)

      const res = await fetch(`/api/camps?${params.toString()}`)
      const json = await res.json()

      if (json.error) {
        throw new Error(json.error)
      }

      const result = json.data
      setCamps((result.camps || []).map(transformToCampCard))
      setTotalCamps(result.total || 0)
    } catch (err) {
      console.error('Failed to load camps:', err)
      setError('Failed to load camps. Please try again.')
      setCamps([])
      setTotalCamps(0)
    } finally {
      setLoading(false)
    }
  }, [
    filters.city,
    filters.program_type,
    filters.min_age,
    filters.max_age,
    filters.search,
  ])

  useEffect(() => {
    loadCamps()
  }, [loadCamps])

  return (
    <div className="min-h-screen bg-black">
      {/* Page Header - Dark esports style */}
      <div className="relative overflow-hidden border-b border-white/10">
        {/* Background effects - color variety */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-neon/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-magenta/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 pt-32">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-6 w-6 text-neon" />
            <span className="text-xs font-bold uppercase tracking-widest text-neon">
              Available Sessions
            </span>
          </div>
          <h1 className="headline-display headline-lg text-white">
            Find Your <span className="text-neon">Camp</span>
          </h1>
          <p className="mt-6 text-xl text-white/60 max-w-2xl">
            Browse available sessions and register your athlete today.
            Spots fill fast - secure your place now.
          </p>
        </div>
      </div>

      {/* Filters and Results */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Filters */}
        <CampFilters locations={locations} programTypes={programTypes} />

        {/* Results Count */}
        <div className="mt-10 flex items-center justify-between border-b border-white/10 pb-4">
          <p className="text-sm text-white/50 uppercase tracking-wider">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading camps...
              </span>
            ) : (
              <>
                Showing <span className="font-bold text-neon">{camps.length}</span> of{' '}
                <span className="font-bold text-neon">{totalCamps}</span> camps
              </>
            )}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-8 p-6 border border-magenta/30 bg-magenta/5 text-center">
            <p className="text-magenta">{error}</p>
            <button
              onClick={() => loadCamps()}
              className="mt-4 px-6 py-2 bg-magenta/20 border border-magenta/30 text-magenta hover:bg-magenta/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-[400px] animate-pulse bg-dark-100 border border-white/10"
              />
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && camps.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {camps.map((camp) => (
              <CampCard key={camp.id} camp={camp} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && camps.length === 0 && (
          <div className="mt-16 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center border border-white/10 bg-dark-100">
              <Crown className="h-12 w-12 text-white/20" />
            </div>
            <h3 className="mt-6 text-xl font-bold uppercase tracking-wider text-white">
              No Camps Found
            </h3>
            <p className="mt-3 text-white/50">
              Try adjusting your filters or check back soon for new sessions.
            </p>
            <button
              onClick={() => router.push('/camps')}
              className="mt-6 px-8 py-3 bg-neon/20 border border-neon/30 text-neon hover:bg-neon/30 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CampsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-neon mx-auto" />
            <p className="mt-4 text-white/60">Loading camps...</p>
          </div>
        </div>
      }
    >
      <CampsContent />
    </Suspense>
  )
}
