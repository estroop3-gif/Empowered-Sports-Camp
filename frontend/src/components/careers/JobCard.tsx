/**
 * JobCard Component
 *
 * Displays a job posting card for the careers page.
 */

import Link from 'next/link'
import { MapPin, Clock, Wifi, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobCardProps {
  title: string
  slug: string
  shortDescription: string
  locationLabel: string
  employmentType: string
  isRemoteFriendly: boolean
  createdAt: string
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  seasonal: 'Seasonal',
  part_time: 'Part-Time',
  full_time: 'Full-Time',
  internship: 'Internship',
  contract: 'Contract',
}

export default function JobCard({
  title,
  slug,
  shortDescription,
  locationLabel,
  employmentType,
  isRemoteFriendly,
  createdAt,
}: JobCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Link
      href={`/careers/${slug}`}
      className="group block bg-dark-100/30 border border-white/10 p-6 transition-all duration-300 hover:border-neon/30 hover:bg-dark-100/50"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <h3 className="text-xl font-bold text-white group-hover:text-neon transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Employment type badge */}
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-magenta/10 border border-magenta/30 text-magenta">
            {EMPLOYMENT_LABELS[employmentType] || employmentType}
          </span>
          {/* Remote badge */}
          {isRemoteFriendly && (
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-neon/10 border border-neon/30 text-neon flex items-center gap-1.5">
              <Wifi className="h-3 w-3" />
              Remote OK
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-white/70 leading-relaxed mb-4 line-clamp-2">
        {shortDescription}
      </p>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
          {/* Location */}
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {locationLabel}
          </span>
          {/* Posted date */}
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Posted {formatDate(createdAt)}
          </span>
        </div>

        {/* View details arrow */}
        <span className="flex items-center gap-1.5 text-sm font-medium text-neon opacity-0 group-hover:opacity-100 transition-opacity">
          View Details
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </Link>
  )
}
