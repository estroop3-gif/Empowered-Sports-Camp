/**
 * Program Hero Component
 *
 * Reusable hero section for program pages with title, subtitle, description, and CTAs.
 */

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

interface ProgramHeroProps {
  badge?: string
  title: string
  titleAccent?: string
  subtitle: string
  description: string
  primaryCta?: {
    label: string
    href: string
  }
  secondaryCta?: {
    label: string
    href: string
  }
  accentColor?: 'neon' | 'magenta' | 'purple'
}

const colorClasses = {
  neon: {
    badge: 'bg-neon/10 border-neon/30 text-neon',
    accent: 'text-neon',
    glow1: 'bg-neon/15',
    glow2: 'bg-magenta/10',
  },
  magenta: {
    badge: 'bg-magenta/10 border-magenta/30 text-magenta',
    accent: 'text-magenta',
    glow1: 'bg-magenta/15',
    glow2: 'bg-purple/10',
  },
  purple: {
    badge: 'bg-purple/10 border-purple/30 text-purple',
    accent: 'text-purple',
    glow1: 'bg-purple/15',
    glow2: 'bg-neon/10',
  },
}

export default function ProgramHero({
  badge,
  title,
  titleAccent,
  subtitle,
  description,
  primaryCta,
  secondaryCta,
  accentColor = 'neon',
}: ProgramHeroProps) {
  const colors = colorClasses[accentColor]

  return (
    <section className="relative min-h-[60vh] flex items-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon/10 via-purple/5 to-magenta/10" />
      <div className="absolute inset-0 bg-black/60" />

      {/* Glow orbs */}
      <div className={`absolute top-20 -left-40 w-[500px] h-[500px] ${colors.glow1} rounded-full blur-[150px]`} />
      <div className={`absolute bottom-0 right-0 w-[400px] h-[400px] ${colors.glow2} rounded-full blur-[120px]`} />
      <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-purple/10 rounded-full blur-[100px]" />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-4xl">
          {/* Badge */}
          {badge && (
            <div className="flex items-center gap-3 mb-6">
              <div className={`flex items-center gap-2 px-4 py-2 border ${colors.badge}`}>
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {badge}
                </span>
              </div>
            </div>
          )}

          {/* Headline */}
          <h1 className="headline-display headline-lg text-white mb-6">
            {title}
            {titleAccent && (
              <>
                {' '}
                <span className={colors.accent}>{titleAccent}</span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-xl lg:text-2xl text-white/80 mb-6 max-w-3xl">
            {subtitle}
          </p>

          {/* Description */}
          <p className="text-white/60 leading-relaxed mb-10 max-w-2xl">
            {description}
          </p>

          {/* CTAs */}
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-wrap gap-4">
              {primaryCta && (
                <Link
                  href={primaryCta.href}
                  className={buttonVariants({ variant: 'neon', size: 'lg' })}
                >
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  className={buttonVariants({ variant: 'outline-neon-purple', size: 'lg' })}
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  )
}
