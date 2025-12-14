/**
 * About Mission Section
 *
 * Two-column layout with mission statement and image placeholder.
 */

import { Target, Crown } from 'lucide-react'

export default function AboutMission() {
  return (
    <section className="relative py-20 lg:py-24 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Text content */}
          <div>
            {/* Section label */}
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-5 w-5 text-neon" />
              <span className="text-xs font-bold uppercase tracking-widest text-neon">
                Our Mission
              </span>
            </div>

            {/* Headline */}
            <h2 className="headline-display headline-md text-white mb-6">
              Building The Next Generation Of{' '}
              <span className="text-magenta">Female Leaders</span>
            </h2>

            {/* Mission statement */}
            <div className="space-y-6 text-white/70 leading-relaxed">
              <p>
                At Empowered Athletes, we believe every girl deserves equal access to high-quality coaching, real competition, and a community that lifts her up.
              </p>
              <p>
                Our mission is to help girls discover how powerful they really are – on the field and far beyond it. Through movement, mentorship, and meaningful shared experiences, we're not just running camps; we're developing the next generation of female leaders.
              </p>
            </div>
          </div>

          {/* Image placeholder */}
          <div className="relative">
            <div className="aspect-[4/3] bg-dark-100 border border-white/10 flex items-center justify-center relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-neon/5 via-transparent to-magenta/5" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-neon/10 rounded-full blur-[60px]" />
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-purple/10 rounded-full blur-[40px]" />

              {/* Placeholder content */}
              <div className="relative flex flex-col items-center gap-4 text-white/30">
                <Crown className="h-16 w-16" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Photo Coming Soon
                </span>
              </div>

              {/* Corner accent */}
              <div className="absolute top-0 left-0 w-16 h-1 bg-neon" />
              <div className="absolute top-0 left-0 w-1 h-16 bg-neon" />
              <div className="absolute bottom-0 right-0 w-16 h-1 bg-magenta" />
              <div className="absolute bottom-0 right-0 w-1 h-16 bg-magenta" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
