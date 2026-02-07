'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ProgramTypeSectionCard } from '@/components/camps/program-type-section'
import { CampSortBar } from '@/components/camps/camp-sort-bar'
import { Crown, Loader2, MapPin } from 'lucide-react'
import type { ProgramTypeGroupedResult, ProgramTypeSection } from '@/types'

interface ProgramTypeOption {
  slug: string
  name: string
}

function CampsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read initial state from URL
  const urlZip = searchParams.get('zip') || ''
  const urlProgram = searchParams.get('program') || ''
  const urlAge = searchParams.get('age') || ''

  // State: zipInput is the controlled input; zip is the submitted value that triggers fetches
  const [zipInput, setZipInput] = useState(urlZip)
  const [zip, setZip] = useState(urlZip)
  const [programType, setProgramType] = useState(urlProgram)
  const [ageRange, setAgeRange] = useState(urlAge)
  const [programTypes, setProgramTypes] = useState<ProgramTypeOption[]>([])

  // Data state
  const [sections, setSections] = useState<ProgramTypeSection[]>([])
  const [totalCamps, setTotalCamps] = useState(0)
  const [searchedLocation, setSearchedLocation] = useState<ProgramTypeGroupedResult['searchedLocation']>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load available program types
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
      const qs = current.toString()
      router.replace(qs ? `/camps?${qs}` : '/camps', { scroll: false })
    },
    [router, searchParams]
  )

  // Fetch camps grouped by program type
  const fetchGroupedCamps = useCallback(
    async (zipVal: string, program: string, age: string) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ action: 'groupedByType' })
        if (zipVal) params.set('zip', zipVal)
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

        const result: ProgramTypeGroupedResult = json.data
        setSections(result.sections)
        setTotalCamps(result.totalCamps)
        setSearchedLocation(result.searchedLocation)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load camps'
        setError(message)
        setSections([])
        setTotalCamps(0)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchGroupedCamps(zip, programType, ageRange)
  }, [zip, programType, ageRange, fetchGroupedCamps])

  // Handle ZIP submit from sort bar
  function handleZipSubmit() {
    setZip(zipInput)
    updateURL({ zip: zipInput, program: programType, age: ageRange })
  }

  // Handle ZIP clear
  function handleClearZip() {
    setZipInput('')
    setZip('')
    setSearchedLocation(null)
    updateURL({ zip: '', program: programType, age: ageRange })
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

  return (
    <div className="min-h-screen bg-black">
      {/* Filter bar — always visible */}
      <CampSortBar
        totalCamps={totalCamps}
        sectionCount={sections.length}
        zipValue={zipInput}
        onZipChange={setZipInput}
        onZipSubmit={handleZipSubmit}
        hasZip={!!zip}
        searchedCity={searchedLocation?.city || ''}
        searchedState={searchedLocation?.state || ''}
        programType={programType}
        ageRange={ageRange}
        programTypes={programTypes}
        onProgramTypeChange={handleProgramTypeChange}
        onAgeRangeChange={handleAgeRangeChange}
        onClearZip={handleClearZip}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error State */}
        {error && (
          <div className="mt-8 p-8 border border-magenta/30 bg-magenta/5 text-center">
            <MapPin className="h-10 w-10 text-magenta/50 mx-auto mb-4" />
            <p className="text-magenta text-lg font-bold">{error}</p>
            <p className="text-white/40 text-sm mt-2">
              Something went wrong loading camps. Please try again.
            </p>
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

        {/* Results — program-type sections */}
        {!loading && !error && sections.length > 0 && (
          <div className="space-y-8 mt-4">
            {sections.map((section, i) => (
              <ProgramTypeSectionCard key={section.slug} section={section} index={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sections.length === 0 && (
          <div className="mt-16 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center border border-white/10 bg-dark-100">
              <Crown className="h-12 w-12 text-white/20" />
            </div>
            <h3 className="mt-6 text-xl font-bold uppercase tracking-wider text-white">
              No Camps Found
            </h3>
            <p className="mt-3 text-white/50 max-w-md mx-auto">
              No camps match your current filters. Try adjusting your search criteria or check back soon for new sessions.
            </p>
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
