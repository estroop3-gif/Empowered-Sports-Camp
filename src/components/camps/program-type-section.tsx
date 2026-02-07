'use client'

import Link from 'next/link'
import { Calendar, Users, Clock, MapPin, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProgramTypeSection, CampListingItem } from '@/types'

const SECTION_GRADIENTS = [
  'from-neon/80 to-neon/40',
  'from-magenta/80 to-magenta/40',
  'from-purple/80 to-purple/40',
]

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}, ${start.getFullYear()}`
}

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return m === '00' ? `${h}${ampm}` : `${h}:${m}${ampm}`
}

function BadgePill({ badge }: { badge: CampListingItem['badge'] }) {
  if (!badge) return null
  const variant = badge === 'MOST POPULAR' ? 'magenta' : badge === 'NEW!' ? 'neon' : 'warning'
  return <Badge variant={variant} size="sm">{badge}</Badge>
}

interface ProgramTypeSectionCardProps {
  section: ProgramTypeSection
  index: number
}

export function ProgramTypeSectionCard({ section, index }: ProgramTypeSectionCardProps) {
  const gradient = SECTION_GRADIENTS[index % SECTION_GRADIENTS.length]

  return (
    <div className="border border-white/10 bg-dark-100/50 overflow-hidden">
      {/* Section Header */}
      <div className={`bg-gradient-to-r ${gradient} px-6 py-4`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold uppercase tracking-wider text-black">
            {section.name}
          </h2>
          <div className="flex items-center gap-3">
            {section.nearestDistanceMiles !== null && (
              <span className="flex items-center gap-1 text-sm font-bold text-black/70">
                <Navigation className="h-3.5 w-3.5" />
                {section.nearestDistanceMiles} mi away
              </span>
            )}
            <span className="text-sm font-bold text-black/70">
              {section.campCount} {section.campCount === 1 ? 'camp' : 'camps'}
            </span>
          </div>
        </div>
      </div>

      {/* Camp Rows */}
      <div className="divide-y divide-white/5">
        {section.camps.map((camp) => (
          <CampRow key={camp.id} camp={camp} />
        ))}
      </div>
    </div>
  )
}

function CampRow({ camp }: { camp: CampListingItem }) {
  const isEarlyBird = camp.earlyBirdPrice && camp.earlyBirdDeadline && new Date(camp.earlyBirdDeadline) > new Date()

  return (
    <div className={`p-5 hover:bg-white/[0.02] transition-colors ${camp.isFull ? 'opacity-50' : ''}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Left: Venue + Meta */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white truncate">{camp.name}</span>
            <BadgePill badge={camp.badge} />
          </div>

          {/* Venue + location row */}
          <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              {camp.venueName}
              {camp.venueCity && camp.venueState && (
                <span className="text-white/30">
                  {' '}— {camp.venueCity}, {camp.venueState}
                </span>
              )}
            </span>
            {camp.distanceMiles !== null && (
              <span className="flex items-center gap-1 text-neon/70 font-medium">
                <Navigation className="h-3 w-3" />
                {camp.distanceMiles} mi
              </span>
            )}
          </div>

          {/* Date + time + age row */}
          <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {formatDateRange(camp.startDate, camp.endDate)}
            </span>
            {camp.dailyStartTime && camp.dailyEndTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {formatTime12h(camp.dailyStartTime)} – {formatTime12h(camp.dailyEndTime)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Ages {camp.minAge}-{camp.maxAge}
            </span>
          </div>

          {/* Sport tags + highlights */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {camp.sportsOffered.map((sport) => (
              <Badge key={sport} variant="dark" size="sm">{sport}</Badge>
            ))}
            {camp.highlights.slice(0, 2).map((h) => (
              <Badge key={h} variant="outline" size="sm">{h}</Badge>
            ))}
          </div>
        </div>

        {/* Right: Price + availability + CTAs */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <div className="text-right">
            <div className="text-xl font-bold text-neon">
              {formatPrice(camp.currentPrice)}
            </div>
            {isEarlyBird && (
              <div className="text-[10px] text-magenta uppercase tracking-wider">
                Early Bird
              </div>
            )}
          </div>

          <div>
            {camp.isFull ? (
              <Badge variant="error" size="sm">Sold Out</Badge>
            ) : camp.spotsRemaining <= 10 ? (
              <Badge variant="warning" size="sm">{camp.spotsRemaining} spots left</Badge>
            ) : (
              <Badge variant="success" size="sm">Available</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/camps/${camp.slug}`}>
              <Button variant="ghost" size="sm">Details</Button>
            </Link>
            {!camp.isFull && (
              <Link href={`/camps/${camp.slug}`}>
                <Button variant="neon" size="sm">Register</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
