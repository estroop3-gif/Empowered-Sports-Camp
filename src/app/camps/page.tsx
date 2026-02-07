'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ZipSearchHero } from '@/components/camps/zip-search-hero'
import { VenueCampCard } from '@/components/camps/venue-camp-card'
import { CampSortBar } from '@/components/camps/camp-sort-bar'
import { Crown, Loader2, MapPin, Globe } from 'lucide-react'
import type { VenueGroupData, NearZipSearchResult } from '@/types'

interface ProgramTypeOption {
  slug: string
  name: string
}

function CampsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read initial state from URL
  const urlZip = searchParams.get('zip') || ''
  const urlSort = (searchParams.get('sort') as 'distance' | 'startDate') || 'distance'
  const urlProgram = searchParams.get('program') || ''
  const urlAge = searchParams.get('age') || ''
  const urlAll = searchParams.get('all') === '1'

  // State
  const [zip, setZip] = useState(urlZip)
  const [hasSearched, setHasSearched] = useState(!!urlZip || urlAll)
  const [venues, setVenues] = useState<VenueGroupData[]>([])
  const [total, setTotal] = useState(0)
  const [searchedLocation, setSearchedLocation] = useState<NearZipSearchResult['searchedLocation'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'distance' | 'startDate'>(urlSort)
  const [programType, setProgramType] = useState(urlProgram)
  const [ageRange, setAgeRange] = useState(urlAge)
  const [programTypes, setProgramTypes] = useState<ProgramTypeOption[]>([])
  const [showAll, setShowAll] = useState(urlAll)

  // Load available program types (now returns {slug, name}[])
  useEffect(() => {
    fetch('/api/camps?action=programTypes')
      .then((r) => r.json())
      .then((json) => setProgramTypes(json.data || []))
      .catch(() => {})
  }, [])

  // Update URL params without navigation
  const updateURL = useCallback(
    (params: Record<string, string>) => {
      const current = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          current.set(key, value)
        } else {
          current.delete(key)
        }
      }
      router.replace(`/camps?${current.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  // Fetch camps near zip
  const fetchCamps = useCallback(
    async (zipCode: string, sort: string, program: string, age: string) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          action: 'nearZip',
          zip: zipCode,
          sortBy: sort,
        })
        if (program) params.set('programType', program)
        if (age) {
          const [minAge, maxAge] = age.split('-').map(Number)
          if (!isNaN(minAge)) params.set('minAge', String(minAge))
          if (!isNaN(maxAge)) params.set('maxAge', String(maxAge))
        }

        const res = await fetch(`/api/camps?${params.toString()}`)
        const json = await res.json()

        if (json.error) {
          throw new Error(json.error)
        }

        const result: NearZipSearchResult = json.data
        setVenues(result.venues)
        setTotal(result.total)
        setSearchedLocation(result.searchedLocation)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search camps'
        setError(message === 'Invalid zip code' ? 'We couldn\'t find that zip code. Please try another.' : message)
        setVenues([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Fetch all camps (no zip required)
  const fetchAllCamps = useCallback(
    async (program: string, age: string) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ action: 'allCamps' })
        if (program) params.set('programType', program)
        if (age) {
          const [minAge, maxAge] = age.split('-').map(Number)
          if (!isNaN(minAge)) params.set('minAge', String(minAge))
          if (!isNaN(maxAge)) params.set('maxAge', String(maxAge))
        }

        const res = await fetch(`/api/camps?${params.toString()}`)
        const json = await res.json()

        if (json.error) {
          throw new Error(json.error)
        }

        const result = json.data as { venues: VenueGroupData[]; total: number }
        setVenues(result.venues)
        setTotal(result.total)
        setSearchedLocation(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load camps'
        setError(message)
        setVenues([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Search when zip is entered or showAll changes
  useEffect(() => {
    if (showAll) {
      fetchAllCamps(programType, ageRange)
    } else if (zip && zip.trim().length >= 3) {
      fetchCamps(zip, sortBy, programType, ageRange)
    }
  }, [zip, sortBy, programType, ageRange, showAll, fetchCamps, fetchAllCamps])

  // Handle zip search
  function handleSearch(newZip: string) {
    setShowAll(false)
    setZip(newZip)
    setHasSearched(true)
    updateURL({ zip: newZip, sort: sortBy, program: programType, age: ageRange, all: '' })
  }

  // Handle sort change
  function handleSortChange(newSort: 'distance' | 'startDate') {
    setSortBy(newSort)
    updateURL({ sort: newSort })
  }

  // Handle program type filter
  function handleProgramTypeChange(newType: string) {
    setProgramType(newType)
    updateURL({ program: newType })
  }

  // Handle age range filter
  function handleAgeRangeChange(newRange: string) {
    setAgeRange(newRange)
    updateURL({ age: newRange })
  }

  // Handle "Change" zip — go back to hero
  function handleChangeZip() {
    setShowAll(false)
    setHasSearched(false)
    setVenues([])
    setTotal(0)
    setSearchedLocation(null)
    setError(null)
    router.replace('/camps', { scroll: false })
  }

  // Handle "Show All" toggle
  function handleShowAllChange(val: boolean) {
    setShowAll(val)
    if (val) {
      setHasSearched(true)
      updateURL({ all: '1', zip: '', sort: '' })
    } else {
      // Toggling off: if we have a zip, search by zip; otherwise go to hero
      if (zip && zip.trim().length >= 3) {
        updateURL({ all: '', sort: sortBy })
      } else {
        setHasSearched(false)
        setVenues([])
        setTotal(0)
        setSearchedLocation(null)
        router.replace('/camps', { scroll: false })
      }
    }
  }

  // Handle "Browse all camps" from hero
  function handleBrowseAll() {
    setShowAll(true)
    setHasSearched(true)
    updateURL({ all: '1', zip: '', sort: '' })
  }

  // =========================================================================
  // STATE A: No zip entered and not showing all — show hero gate
  // =========================================================================
  if (!hasSearched) {
    return (
      <div className="min-h-screen bg-black">
        <ZipSearchHero onSearch={handleSearch} isLoading={loading} initialZip={zip} />
        {/* "Or browse all camps" link below hero */}
        <div className="text-center -mt-8 pb-12">
          <button
            onClick={handleBrowseAll}
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-neon transition-colors"
          >
            <Globe className="h-4 w-4" />
            Or browse all camps
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // STATE B: Zip entered or showing all — show results
  // =========================================================================
  return (
    <div className="min-h-screen bg-black">
      {/* Sort/filter bar */}
      {(searchedLocation || showAll) && (
        <CampSortBar
          total={total}
          searchedCity={searchedLocation?.city || ''}
          searchedState={searchedLocation?.state || ''}
          searchedZip={searchedLocation?.zip || ''}
          sortBy={sortBy}
          programType={programType}
          ageRange={ageRange}
          programTypes={programTypes}
          showAll={showAll}
          onSortChange={handleSortChange}
          onProgramTypeChange={handleProgramTypeChange}
          onAgeRangeChange={handleAgeRangeChange}
          onChangeZip={handleChangeZip}
          onShowAllChange={handleShowAllChange}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error State */}
        {error && (
          <div className="mt-8 p-8 border border-magenta/30 bg-magenta/5 text-center">
            <MapPin className="h-10 w-10 text-magenta/50 mx-auto mb-4" />
            <p className="text-magenta text-lg font-bold">{error}</p>
            <p className="text-white/40 text-sm mt-2">
              Try a different zip code or check your entry.
            </p>
            <button
              onClick={handleChangeZip}
              className="mt-6 px-8 py-3 bg-magenta/20 border border-magenta/30 text-magenta hover:bg-magenta/30 transition-colors text-sm font-bold uppercase tracking-wider"
            >
              Try Another Zip
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6 mt-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse bg-dark-100 border border-white/10"
              />
            ))}
          </div>
        )}

        {/* Results — venue-grouped cards */}
        {!loading && !error && venues.length > 0 && (
          <div className="space-y-6 mt-4">
            {venues.map((venue) => (
              <VenueCampCard key={venue.venueId || venue.venueName} venue={venue} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && venues.length === 0 && hasSearched && (
          <div className="mt-16 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center border border-white/10 bg-dark-100">
              <Crown className="h-12 w-12 text-white/20" />
            </div>
            <h3 className="mt-6 text-xl font-bold uppercase tracking-wider text-white">
              No Camps Found
            </h3>
            <p className="mt-3 text-white/50 max-w-md mx-auto">
              {showAll
                ? 'No camps are currently available. Check back soon for new sessions.'
                : (
                  <>
                    We couldn&apos;t find any camps near{' '}
                    {searchedLocation
                      ? `${searchedLocation.city}, ${searchedLocation.state}`
                      : `zip code ${zip}`}
                    . Try a different zip code or browse all camps.
                  </>
                )
              }
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              {!showAll && (
                <button
                  onClick={handleChangeZip}
                  className="px-8 py-3 bg-neon/20 border border-neon/30 text-neon hover:bg-neon/30 transition-colors text-sm font-bold uppercase tracking-wider"
                >
                  Search Another Zip
                </button>
              )}
              {!showAll && (
                <button
                  onClick={handleBrowseAll}
                  className="px-8 py-3 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold uppercase tracking-wider"
                >
                  Browse All Camps
                </button>
              )}
            </div>
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
