'use client'

import { useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'

const AGE_RANGES = [
  { label: 'All Ages', min: undefined, max: undefined },
  { label: 'Ages 5-7', min: 5, max: 7 },
  { label: 'Ages 8-10', min: 8, max: 10 },
  { label: 'Ages 11-14', min: 11, max: 14 },
]

interface ProgramTypeOption {
  slug: string
  name: string
}

interface CampSortBarProps {
  totalCamps: number
  sectionCount: number
  zipValue: string
  onZipChange: (zip: string) => void
  onZipSubmit: () => void
  hasZip: boolean
  searchedCity: string
  searchedState: string
  programType: string
  ageRange: string
  programTypes: ProgramTypeOption[]
  onProgramTypeChange: (type: string) => void
  onAgeRangeChange: (range: string) => void
  onClearZip: () => void
}

export function CampSortBar({
  totalCamps,
  sectionCount,
  zipValue,
  onZipChange,
  onZipSubmit,
  hasZip,
  searchedCity,
  searchedState,
  programType,
  ageRange,
  programTypes,
  onProgramTypeChange,
  onAgeRangeChange,
  onClearZip,
}: CampSortBarProps) {
  const [localZip, setLocalZip] = useState(zipValue)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onZipChange(localZip)
    onZipSubmit()
  }

  function handleClear() {
    setLocalZip('')
    onClearZip()
  }

  return (
    <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-sm border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left: ZIP input + location display */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Inline ZIP input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-neon shrink-0" />
              <input
                type="text"
                value={localZip}
                onChange={(e) => setLocalZip(e.target.value)}
                placeholder="ZIP code"
                className="w-20 h-8 px-2 text-xs bg-dark-100 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-neon/50"
              />
              <button
                type="submit"
                className="h-8 px-2 text-xs bg-neon/10 border border-neon/30 text-neon hover:bg-neon/20 transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>

            {/* Location display when ZIP is active */}
            {hasZip && searchedCity && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-white/50">
                  Near <span className="text-white font-medium">{searchedCity}, {searchedState}</span>
                </span>
                <button
                  onClick={handleClear}
                  className="p-0.5 text-white/30 hover:text-magenta transition-colors"
                  title="Clear location"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Separator */}
            <div className="hidden sm:block w-px h-5 bg-white/10" />

            {/* Program type filter */}
            <select
              value={programType}
              onChange={(e) => onProgramTypeChange(e.target.value)}
              className="h-8 px-3 text-xs bg-dark-100 border border-white/10 text-white/60 focus:outline-none focus:border-neon/50 appearance-none cursor-pointer"
            >
              <option value="">All Programs</option>
              {programTypes.map((pt) => (
                <option key={pt.slug} value={pt.slug}>
                  {pt.name}
                </option>
              ))}
            </select>

            {/* Age range filter */}
            <select
              value={ageRange}
              onChange={(e) => onAgeRangeChange(e.target.value)}
              className="h-8 px-3 text-xs bg-dark-100 border border-white/10 text-white/60 focus:outline-none focus:border-neon/50 appearance-none cursor-pointer"
            >
              {AGE_RANGES.map((range) => (
                <option key={range.label} value={range.min !== undefined ? `${range.min}-${range.max}` : ''}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Results count */}
          <div className="text-xs text-white/40 whitespace-nowrap">
            <span className="font-bold text-neon">{totalCamps}</span>{' '}
            {totalCamps === 1 ? 'camp' : 'camps'} in{' '}
            <span className="font-bold text-white/60">{sectionCount}</span>{' '}
            {sectionCount === 1 ? 'program' : 'programs'}
          </div>
        </div>
      </div>
    </div>
  )
}
