'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Navigation, Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { VenueGroupData, CampProgramData } from '@/types'

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

interface VenueCampCardProps {
  venue: VenueGroupData
}

const INITIAL_SHOW = 3

export function VenueCampCard({ venue }: VenueCampCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = venue.programs.length > INITIAL_SHOW
  const visiblePrograms = expanded ? venue.programs : venue.programs.slice(0, INITIAL_SHOW)

  const fullAddress = [
    venue.addressLine1,
    venue.addressLine2,
    [venue.city, venue.state].filter(Boolean).join(', '),
    venue.postalCode,
  ].filter(Boolean).join(', ')

  return (
    <div className="border border-white/10 bg-dark-100/50 overflow-hidden">
      {/* Venue Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                {venue.venueName}
              </h3>
              {venue.territoryName && (
                <Badge variant="purple" size="sm">{venue.territoryName}</Badge>
              )}
            </div>
            {fullAddress && (
              <div className="flex items-center gap-2 text-sm text-white/40">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{fullAddress}</span>
              </div>
            )}
          </div>

          {venue.distanceMiles !== null && (
            <div className="flex items-center gap-1.5 text-neon font-bold text-sm whitespace-nowrap">
              <Navigation className="h-3.5 w-3.5" />
              {venue.distanceMiles} mi
            </div>
          )}
        </div>
      </div>

      {/* Neon gradient divider */}
      <div className="h-[2px] bg-gradient-to-r from-neon via-magenta to-purple" />

      {/* Program Rows */}
      <div className="divide-y divide-white/5">
        {visiblePrograms.map((program) => (
          <ProgramRow key={program.id} program={program} />
        ))}
      </div>

      {/* "View All" toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-white/40 hover:text-neon border-t border-white/5 transition-colors"
        >
          {expanded ? (
            <>
              Show Less <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              View All {venue.programs.length} Programs <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

function ProgramRow({ program }: { program: CampProgramData }) {
  return (
    <div className="p-5 hover:bg-white/[0.02] transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Left: Name + meta */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white truncate">{program.name}</span>
            <Badge variant="default" size="sm">
              {program.programTypeName}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {formatDateRange(program.startDate, program.endDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Ages {program.minAge}-{program.maxAge}
            </span>
          </div>

          {program.sportsOffered.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {program.sportsOffered.map((sport) => (
                <Badge key={sport} variant="dark" size="sm">{sport}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Right: Price + spots + CTAs */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <div className="text-right">
            <div className="text-xl font-bold text-neon">
              {formatPrice(program.currentPrice)}
            </div>
            {program.earlyBirdPrice && program.earlyBirdDeadline && new Date(program.earlyBirdDeadline) > new Date() && (
              <div className="text-[10px] text-magenta uppercase tracking-wider">
                Early Bird
              </div>
            )}
          </div>

          <div>
            {program.isFull ? (
              <Badge variant="warning" size="sm">Waitlist Open</Badge>
            ) : program.spotsRemaining <= 10 ? (
              <Badge variant="warning" size="sm">{program.spotsRemaining} spots left</Badge>
            ) : (
              <Badge variant="success" size="sm">Available</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/camps/${program.slug}`}>
              <Button variant="ghost" size="sm">Details</Button>
            </Link>
            <Link href={`/register/${program.slug}`}>
              <Button variant={program.isFull ? 'outline-neon' : 'neon'} size="sm">
                {program.isFull ? 'Waitlist' : 'Register'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
