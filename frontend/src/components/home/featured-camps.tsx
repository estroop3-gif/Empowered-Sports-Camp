import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'
import { CampCard } from '@/components/camps/camp-card'
import { Button } from '@/components/ui/button'
import { fetchFeaturedCamps, getProgramTypeLabel, type PublicCampCard } from '@/lib/services/camps'
import type { CampCardData } from '@/types'

/**
 * Transform database camp data to CampCardData for display
 */
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

export async function FeaturedCamps() {
  // Fetch featured camps from database
  const camps = await fetchFeaturedCamps(3)
  const featuredCamps = camps.map(transformToCampCard)

  // If no camps are available, show a message
  if (featuredCamps.length === 0) {
    return (
      <section className="relative py-24 overflow-hidden">
        {/* Rainbow gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon/20 via-purple/15 to-magenta/20" />
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="h-5 w-5 text-neon" />
            <span className="text-xs font-bold uppercase tracking-widest text-neon">
              Coming Soon
            </span>
          </div>
          <h2 className="headline-display headline-md text-white mb-4">
            Camps <span className="text-neon">Opening Soon</span>
          </h2>
          <p className="text-lg text-white/50 mb-8">
            Registration for our upcoming camps will be available shortly.
          </p>
          <Link href="/camps">
            <Button variant="outline-neon" className="gap-2">
              View All Programs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    )
  }
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

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
          {featuredCamps.map((camp) => (
            <CampCard key={camp.id} camp={camp} />
          ))}
        </div>
      </div>
    </section>
  )
}
