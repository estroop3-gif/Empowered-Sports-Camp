/**
 * Program Card Component
 *
 * Card for displaying program overview with hover effects and link.
 */

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ProgramCardProps {
  name: string
  tagline: string
  description: string
  href: string
  color: 'neon' | 'magenta' | 'purple'
  grades?: string
  ages?: string
}

const colorClasses = {
  neon: {
    border: 'hover:border-neon/50',
    accent: 'text-neon',
    line: 'bg-neon',
    arrow: 'group-hover:text-neon',
    glow: 'group-hover:shadow-[0_0_30px_rgba(204,255,0,0.2)]',
  },
  magenta: {
    border: 'hover:border-magenta/50',
    accent: 'text-magenta',
    line: 'bg-magenta',
    arrow: 'group-hover:text-magenta',
    glow: 'group-hover:shadow-[0_0_30px_rgba(255,45,206,0.2)]',
  },
  purple: {
    border: 'hover:border-purple/50',
    accent: 'text-purple',
    line: 'bg-purple',
    arrow: 'group-hover:text-purple',
    glow: 'group-hover:shadow-[0_0_30px_rgba(111,0,216,0.2)]',
  },
}

export default function ProgramCard({
  name,
  tagline,
  description,
  href,
  color,
  grades,
  ages,
}: ProgramCardProps) {
  const colors = colorClasses[color]

  return (
    <Link href={href} className="block group">
      <Card
        className={`h-full bg-dark-100/50 border border-white/10 ${colors.border} ${colors.glow} transition-all duration-300`}
      >
        <CardContent className="p-6 lg:p-8 relative">
          {/* Top accent line */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${colors.line}`} />

          {/* Content */}
          <div className="space-y-4">
            {/* Name */}
            <h3 className="text-xl font-bold text-white group-hover:text-neon transition-colors">
              {name}
            </h3>

            {/* Tagline */}
            <p className={`text-sm font-medium ${colors.accent}`}>
              {tagline}
            </p>

            {/* Description */}
            <p className="text-white/60 text-sm leading-relaxed">
              {description}
            </p>

            {/* Ages/Grades badge */}
            {(grades || ages) && (
              <div className="pt-2">
                <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 text-xs text-white/50">
                  {grades || ages}
                </span>
              </div>
            )}

            {/* Learn more link */}
            <div className="flex items-center gap-2 pt-4 text-white/70 group-hover:text-white transition-colors">
              <span className="text-sm font-medium">Learn more</span>
              <ArrowRight className={`h-4 w-4 ${colors.arrow} transition-colors`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
