import { Suspense } from 'react'
import { Metadata } from 'next'
import { CampCard } from '@/components/camps/camp-card'
import { CampFilters } from '@/components/camps/camp-filters'
import { Zap, Crown } from 'lucide-react'
import type { CampCardData } from '@/types'

export const metadata: Metadata = {
  title: 'Find Camps',
  description: 'Browse and register for Empowered Sports Camp programs near you.',
}

// Sample data - in production, this would come from Supabase
const SAMPLE_CAMPS: CampCardData[] = [
  {
    id: '1',
    slug: 'summer-week-1-lincoln-park',
    name: 'Summer Week 1 - Lincoln Park',
    programType: 'All Girls Sports Camp',
    location: 'Lincoln Park',
    city: 'Chicago',
    state: 'IL',
    startDate: '2025-06-09',
    endDate: '2025-06-13',
    minAge: 6,
    maxAge: 12,
    price: 29900,
    spotsLeft: 8,
    imageUrl: null,
  },
  {
    id: '2',
    slug: 'summer-week-2-evanston',
    name: 'Summer Week 2 - Evanston',
    programType: 'All Girls Sports Camp',
    location: 'Evanston Recreation Center',
    city: 'Evanston',
    state: 'IL',
    startDate: '2025-06-16',
    endDate: '2025-06-20',
    minAge: 6,
    maxAge: 12,
    price: 29900,
    spotsLeft: 3,
    imageUrl: null,
  },
  {
    id: '3',
    slug: 'cit-program-summer-2025',
    name: 'CIT Program - Summer 2025',
    programType: 'Counselor in Training',
    location: 'Multiple Locations',
    city: 'Chicago',
    state: 'IL',
    startDate: '2025-06-09',
    endDate: '2025-08-08',
    minAge: 14,
    maxAge: 17,
    price: 59900,
    spotsLeft: 12,
    imageUrl: null,
  },
  {
    id: '4',
    slug: 'summer-week-3-naperville',
    name: 'Summer Week 3 - Naperville',
    programType: 'All Girls Sports Camp',
    location: 'Naperville Park District',
    city: 'Naperville',
    state: 'IL',
    startDate: '2025-06-23',
    endDate: '2025-06-27',
    minAge: 6,
    maxAge: 12,
    price: 29900,
    spotsLeft: 15,
    imageUrl: null,
  },
  {
    id: '5',
    slug: 'soccer-strength-week-1',
    name: 'Soccer & Strength - Week 1',
    programType: 'Soccer & Strength',
    location: 'Lincoln Park',
    city: 'Chicago',
    state: 'IL',
    startDate: '2025-07-07',
    endDate: '2025-07-11',
    minAge: 10,
    maxAge: 14,
    price: 34900,
    spotsLeft: 6,
    imageUrl: null,
  },
  {
    id: '6',
    slug: 'basketball-intensive-july',
    name: 'Basketball Intensive - July',
    programType: 'Basketball Intensive',
    location: 'Evanston Recreation Center',
    city: 'Evanston',
    state: 'IL',
    startDate: '2025-07-14',
    endDate: '2025-07-18',
    minAge: 8,
    maxAge: 14,
    price: 34900,
    spotsLeft: 0,
    imageUrl: null,
  },
]

const LOCATIONS = [
  'Chicago',
  'Evanston',
  'Naperville',
  'Oak Park',
  'Schaumburg',
]

const PROGRAM_TYPES = [
  'All Girls Sports Camp',
  'Counselor in Training',
  'Soccer & Strength',
  'Basketball Intensive',
]

interface PageProps {
  searchParams: Promise<{
    location?: string
    age?: string
    program?: string
    zip?: string
  }>
}

async function getCamps(filters: {
  location?: string
  age?: string
  program?: string
  zip?: string
}): Promise<CampCardData[]> {
  let camps = [...SAMPLE_CAMPS]

  if (filters.location) {
    camps = camps.filter(
      (camp) =>
        camp.city.toLowerCase() === filters.location?.toLowerCase() ||
        camp.location.toLowerCase().includes(filters.location?.toLowerCase() || '')
    )
  }

  if (filters.program) {
    camps = camps.filter(
      (camp) => camp.programType.toLowerCase() === filters.program?.toLowerCase()
    )
  }

  if (filters.age) {
    const [minAge, maxAge] = filters.age.split('-').map(Number)
    camps = camps.filter(
      (camp) => camp.minAge <= maxAge && camp.maxAge >= minAge
    )
  }

  return camps
}

export default async function CampsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const camps = await getCamps(params)

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
        <Suspense fallback={<div className="h-20 animate-pulse bg-dark-100 border border-white/10" />}>
          <CampFilters locations={LOCATIONS} programTypes={PROGRAM_TYPES} />
        </Suspense>

        {/* Results Count */}
        <div className="mt-10 flex items-center justify-between border-b border-white/10 pb-4">
          <p className="text-sm text-white/50 uppercase tracking-wider">
            Showing <span className="font-bold text-neon">{camps.length}</span> camps
          </p>
        </div>

        {/* Results Grid */}
        {camps.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {camps.map((camp) => (
              <CampCard key={camp.id} camp={camp} />
            ))}
          </div>
        ) : (
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
          </div>
        )}
      </div>
    </div>
  )
}
