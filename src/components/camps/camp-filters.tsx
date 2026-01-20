'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AGE_RANGES } from '@/lib/constants'

interface CampFiltersProps {
  locations: string[]
  programTypes: string[]
}

export function CampFilters({ locations, programTypes }: CampFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentLocation = searchParams.get('location') || ''
  const currentAge = searchParams.get('age') || ''
  const currentProgram = searchParams.get('program') || ''
  const currentZip = searchParams.get('zip') || ''

  const hasFilters = currentLocation || currentAge || currentProgram || currentZip

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/camps?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/camps')
  }

  const selectClasses = "h-12 w-full bg-dark-100 border border-white/10 px-4 text-sm text-white uppercase tracking-wider focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/50 appearance-none cursor-pointer"

  return (
    <div className="border border-white/10 bg-dark-100/50 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <Filter className="h-5 w-5 text-neon" />
        <span className="text-xs font-bold uppercase tracking-widest text-neon">
          Filter Camps
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Zip Code Search */}
        <div className="relative lg:col-span-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="ZIP CODE"
            value={currentZip}
            onChange={(e) => updateFilter('zip', e.target.value)}
            className="h-12 w-full bg-dark-100 border border-white/10 pl-11 pr-4 text-sm text-white uppercase tracking-wider placeholder:text-white/30 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/50"
          />
        </div>

        {/* Location Filter */}
        <div className="relative">
          <select
            value={currentLocation}
            onChange={(e) => updateFilter('location', e.target.value)}
            className={selectClasses}
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
            <svg className="h-4 w-4 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Age Filter */}
        <div className="relative">
          <select
            value={currentAge}
            onChange={(e) => updateFilter('age', e.target.value)}
            className={selectClasses}
          >
            <option value="">All Ages</option>
            {AGE_RANGES.map((range) => (
              <option key={range.label} value={`${range.min}-${range.max}`}>
                {range.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
            <svg className="h-4 w-4 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Program Type Filter */}
        <div className="relative">
          <select
            value={currentProgram}
            onChange={(e) => updateFilter('program', e.target.value)}
            className={selectClasses}
          >
            <option value="">All Programs</option>
            {programTypes.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
            <svg className="h-4 w-4 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
