import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'
import { CampCard } from '@/components/camps/camp-card'
import { Button } from '@/components/ui/button'
import type { CampCardData } from '@/types'

// Sample data - in production, this would come from Supabase
const FEATURED_CAMPS: CampCardData[] = [
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
]

export function FeaturedCamps() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Rainbow gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon/20 via-purple/15 to-magenta/20" />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Background effects - color variety */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-neon/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-magenta/8 rounded-full blur-[100px]" />
      </div>

      {/* Top fade from hero */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black via-black/80 to-transparent z-10" />

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-purple/15 to-purple/30 z-10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="h-5 w-5 text-neon" />
              <span className="text-xs font-bold uppercase tracking-widest text-neon">
                Signature Programs
              </span>
            </div>
            <h2 className="headline-display headline-md text-white">
              Our <span className="text-neon">Camps</span>
            </h2>
            <p className="mt-4 text-lg text-white/50">
              Find the perfect program for your athlete
            </p>
          </div>
          <Link href="/camps">
            <Button variant="outline-neon" className="gap-2">
              View All Camps
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Camp Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_CAMPS.map((camp) => (
            <CampCard key={camp.id} camp={camp} />
          ))}
        </div>
      </div>
    </section>
  )
}
