/**
 * CIT Application Hero Section
 *
 * Intro section for the CIT application page.
 */

import { Award, CheckCircle } from 'lucide-react'

export default function CITApplicationHero() {
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
            <Award className="h-4 w-4 text-magenta" />
            <span className="text-xs font-bold uppercase tracking-widest text-magenta">
              Volunteer Application
            </span>
          </div>

          {/* Headline */}
          <h1 className="headline-display headline-lg text-white mb-6">
            Become A <span className="text-magenta">Camp Volunteer</span>
          </h1>

          {/* Description */}
          <p className="text-xl text-white/70 leading-relaxed mb-8">
            Want to make a difference behind the scenes? Our volunteers are the backbone of every
            successful camp day — keeping things running smoothly so athletes can focus on what
            they love.
          </p>

          {/* What you'll get */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-white/60">
              <CheckCircle className="h-4 w-4 text-magenta" />
              <span>Community Service Hours</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <CheckCircle className="h-4 w-4 text-magenta" />
              <span>Real Camp Experience</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <CheckCircle className="h-4 w-4 text-magenta" />
              <span>Make a Difference</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent" />
    </section>
  )
}
