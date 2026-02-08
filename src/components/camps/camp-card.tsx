import Link from 'next/link'
import { MapPin, Calendar, Users, ArrowRight, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice, formatDateRange } from '@/lib/utils'
import type { CampCardData } from '@/types'

/**
 * Camp Card - Empowered Athletes Brand
 *
 * FIERCE ESPORTS AESTHETIC:
 * - Dark card with neon accents
 * - Sharp edges, glow effects
 * - Magenta for urgency states
 * - Bold uppercase typography
 */

interface CampCardProps {
  camp: CampCardData
}

export function CampCard({ camp }: CampCardProps) {
  const isFull = camp.spotsLeft === 0
  const isLowAvailability = camp.spotsLeft > 0 && camp.spotsLeft <= 5

  return (
    <div className="group relative overflow-hidden bg-dark-100 border border-white/10 hover:border-neon/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(147,205,1,0.15)]">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-dark-200 to-black">
        {camp.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={camp.imageUrl}
            alt={camp.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Crown className="h-16 w-16 text-neon/20 mx-auto" />
              <p className="text-xs text-white/30 mt-2 uppercase tracking-wider">Camp Photo</p>
            </div>
          </div>
        )}

        {/* Availability Badge */}
        {isFull && (
          <div className="absolute right-3 top-3">
            <Badge variant="warning">Waitlist Open</Badge>
          </div>
        )}
        {isLowAvailability && (
          <div className="absolute right-3 top-3">
            <Badge variant="magenta">
              {camp.spotsLeft} spots left!
            </Badge>
          </div>
        )}

        {/* Diagonal accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neon via-magenta to-purple" />
      </div>

      <div className="p-6">
        {/* Title */}
        <h3 className="text-lg font-bold uppercase tracking-wide text-white group-hover:text-neon transition-colors">
          {camp.name}
        </h3>

        {/* Meta Info */}
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-3 text-sm text-white/50">
            <MapPin className="h-4 w-4 text-neon flex-shrink-0" />
            <span>{camp.city}, {camp.state}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/50">
            <Calendar className="h-4 w-4 text-neon flex-shrink-0" />
            <span>{formatDateRange(camp.startDate, camp.endDate)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/50">
            <Users className="h-4 w-4 text-neon flex-shrink-0" />
            <span>Ages {camp.minAge}-{camp.maxAge}</span>
          </div>
        </div>

        {/* Price and CTA */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            <span className="text-3xl font-black text-neon">
              {formatPrice(camp.price)}
            </span>
            <span className="text-sm text-white/40 ml-1">/week</span>
          </div>
          <Link href={`/camps/${camp.slug}`}>
            <Button
              variant={isFull ? 'outline-neon' : 'neon'}
              size="sm"
              className="group/btn"
            >
              {isFull ? 'Waitlist' : 'View'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
