/**
 * About Hero Section
 *
 * Full-width hero for the About page with headline, description, and CTAs.
 */

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function AboutHero() {
  return (
    <section className="relative min-h-[70vh] flex items-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon/10 via-purple/5 to-magenta/10" />
      <div className="absolute inset-0 bg-black/60" />

      {/* Glow orbs */}
      <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-neon/15 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-magenta/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-purple/10 rounded-full blur-[100px]" />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-neon/10 border border-neon/30">
              <Sparkles className="h-4 w-4 text-neon" />
              <span className="text-xs font-bold uppercase tracking-widest text-neon">
                About Empowered Athletes
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="headline-display headline-lg text-white mb-6">
            Where Girls Grow As{' '}
            <span className="text-neon">Competitors And Leaders</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl lg:text-2xl text-white/80 mb-6 max-w-3xl">
            All-girls, women-led sports camps that build confidence, leadership, and real game skills.
          </p>

          {/* Description */}
          <p className="text-white/60 leading-relaxed mb-10 max-w-2xl">
            Empowered Athletes exists to give girls a place where they can push hard, have fun, and feel fully seen. We use sport as a tool to grow strong, confident, and capable young women. Our camps are intentionally designed environments where girls learn, compete, and lead alongside female coaches and mentors who believe in them.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <Link href="/camps" className={buttonVariants({ variant: 'neon', size: 'lg' })}>
              Find a Camp
            </Link>
            <Link href="/host-a-camp" className={buttonVariants({ variant: 'outline-neon-purple', size: 'lg' })}>
              Host a Camp
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  )
}
