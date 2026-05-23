/**
 * Volunteer Sign-Up Hero Section
 *
 * Intro section explaining volunteer roles and expectations.
 */

import Link from 'next/link'
import { Heart, CheckCircle, ArrowRight } from 'lucide-react'

const duties = [
  'Setup & cleanup',
  'Concessions',
  'Supervising',
  'Check-in / check-out',
  'Timekeeping',
  'Inventory',
]

export default function VolunteerSignupHero() {
  return (
    <section className="relative py-20 lg:py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-magenta/10 via-purple/5 to-neon/10" />
      <div className="absolute inset-0 bg-black/60" />

      {/* Glow orbs */}
      <div className="absolute top-20 -left-40 w-[400px] h-[400px] bg-magenta/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple/10 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-magenta/10 border border-magenta/30 mb-6">
            <Heart className="h-4 w-4 text-magenta" />
            <span className="text-xs font-bold uppercase tracking-widest text-magenta">
              Volunteer Sign-Up
            </span>
          </div>

          {/* Headline */}
          <h1 className="headline-display headline-lg text-white mb-6">
            Volunteer At <span className="text-magenta">Camp</span>
          </h1>

          {/* Description */}
          <p className="text-xl text-white/70 leading-relaxed mb-8">
            Our volunteers handle the behind-the-scenes work that keeps camp running smoothly —
            so coaches and athletes can focus on what matters. You must arrive 30 minutes before
            camp and stay 30 minutes after. All volunteer hours are eligible for community
            service credit.
          </p>

          {/* Duty list */}
          <div className="flex flex-wrap justify-center gap-4 text-sm mb-10">
            {duties.map((duty) => (
              <div key={duty} className="flex items-center gap-2 text-white/60">
                <CheckCircle className="h-4 w-4 text-magenta" />
                <span>{duty}</span>
              </div>
            ))}
          </div>

          {/* CIT callout */}
          <div className="inline-flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-sm text-white/60">
            <span>Want to work with campers as a coach?</span>
            <Link
              href="/volunteer/apply"
              className="inline-flex items-center gap-1 text-magenta hover:text-magenta/80 font-medium transition-colors"
            >
              Check out our CIT Leadership Program
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent" />
    </section>
  )
}
