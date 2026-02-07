'use client'

import { MapPin, ArrowUpDown, Globe } from 'lucide-react'

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
  total: number
  searchedCity: string
  searchedState: string
  searchedZip: string
  sortBy: 'distance' | 'startDate'
  programType: string
  ageRange: string
  programTypes: ProgramTypeOption[]
  showAll: boolean
  onSortChange: (sort: 'distance' | 'startDate') => void
  onProgramTypeChange: (type: string) => void
  onAgeRangeChange: (range: string) => void
  onChangeZip: () => void
  onShowAllChange: (val: boolean) => void
}

export function CampSortBar({
  total,
  searchedCity,
  searchedState,
  searchedZip,
  sortBy,
  programType,
  ageRange,
  programTypes,
  showAll,
  onSortChange,
  onProgramTypeChange,
  onAgeRangeChange,
  onChangeZip,
  onShowAllChange,
}: CampSortBarProps) {
  return (
    <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-sm border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: Results summary */}
          <div className="flex items-center gap-2 text-sm">
            {showAll ? (
              <>
                <Globe className="h-4 w-4 text-neon shrink-0" />
                <span className="text-white/50">
                  Showing <span className="font-bold text-neon">{total}</span>{' '}
                  {total === 1 ? 'result' : 'results'}{' '}
                  <span className="text-white font-medium">(all locations)</span>
                </span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-neon shrink-0" />
                <span className="text-white/50">
                  Showing <span className="font-bold text-neon">{total}</span>{' '}
                  {total === 1 ? 'result' : 'results'} near{' '}
                  <span className="text-white font-medium">
                    {searchedCity}, {searchedState}
                  </span>{' '}
                  <span className="text-white/30">({searchedZip})</span>
                </span>
                <button
                  onClick={onChangeZip}
                  className="text-neon/70 hover:text-neon underline underline-offset-2 text-xs font-medium transition-colors ml-1"
                >
                  Change
                </button>
              </>
            )}
          </div>

          {/* Right: Sort + filters + Show All toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Show All toggle */}
            <button
              onClick={() => onShowAllChange(!showAll)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                showAll
                  ? 'border-neon/50 bg-neon/10 text-neon'
                  : 'border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              <Globe className="h-3 w-3" />
              Show All
            </button>

            {/* Sort toggle — hide distance when showing all */}
            {!showAll && (
              <div className="flex items-center gap-1.5 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 text-white/30" />
                <button
                  onClick={() => onSortChange('distance')}
                  className={`px-3 py-1.5 border transition-colors ${
                    sortBy === 'distance'
                      ? 'border-neon/50 bg-neon/10 text-neon'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  Distance
                </button>
                <button
                  onClick={() => onSortChange('startDate')}
                  className={`px-3 py-1.5 border transition-colors ${
                    sortBy === 'startDate'
                      ? 'border-neon/50 bg-neon/10 text-neon'
                      : 'border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  Start Date
                </button>
              </div>
            )}

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
        </div>
      </div>
    </div>
  )
}
