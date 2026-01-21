import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Play, Zap } from 'lucide-react'

/**
 * Hero Section - Empowered Athletes Brand
 *
 * FIERCE ESPORTS AESTHETIC:
 * - Black background with neon overlays
 * - Bold uppercase headlines (Helvetica Now style)
 * - Neon green (#93CD01) primary glow
 * - Hot magenta (#FF2DCE) accent glow
 * - Diagonal elements and sharp angles
 * - Crown and lightning motifs
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-black min-h-screen flex items-center">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Neon gradient overlays */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-neon/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-magenta/10 via-transparent to-transparent" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(147,205,1,0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(147,205,1,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Diagonal stripe */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden">
          <div className="absolute -top-[50%] -right-[10%] w-[60%] h-[200%] bg-gradient-to-b from-neon/5 to-transparent rotate-[20deg]" />
        </div>

        {/* Glow orbs - color variety */}
        <div className="absolute top-1/4 right-1/4 h-[600px] w-[600px] rounded-full bg-neon/15 blur-[150px]" />
        <div className="absolute bottom-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-purple/15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] rounded-full bg-magenta/10 blur-[100px]" />
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:py-32 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 bg-white/5 border border-neon/30 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-neon mb-8 backdrop-blur-sm">
              <Zap className="h-4 w-4" />
              Summer 2025 Registration Open
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon"></span>
              </span>
            </div>

            {/* Main Headline - FIERCE & BOLD */}
            <h1 className="headline-display headline-xl">
              <span className="text-white">Unleash</span>
              <br />
              <span className="text-white">Your Inner</span>
              <br />
              <span className="text-neon-gradient text-glow-neon">Champion</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 sm:mt-8 text-base sm:text-xl lg:text-2xl text-white/70 lg:max-w-xl leading-relaxed font-light">
              Intro multi-sport camps introducing girls ages 5–17 to competitive sports in a fierce, fun, fully women-led environment. Built for girls, led by women, focused on growing confident competitors and leaders.
            </p>

            {/* CTAs - Sharp esports style */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/camps">
                <Button variant="neon" size="lg" className="w-full sm:w-auto group">
                  Find Your Camp
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline-neon-purple" size="lg" className="w-full sm:w-auto group">
                  <Play className="h-5 w-5" />
                  Watch Our Story
                </Button>
              </Link>
            </div>

            {/* Stats - Bold numbers with color variety */}
            <div className="mt-10 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8 border-t border-white/10 pt-6 sm:pt-10">
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-neon text-glow-neon">5K+</div>
                <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/50">Athletes Trained</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-purple">7</div>
                <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/50">Sports</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-magenta">98%</div>
                <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/50">Return Rate</div>
              </div>
            </div>
          </div>

          {/* Visual Area */}
          <div className="relative hidden lg:block">
            {/* Main container with diagonal clip */}
            <div className="relative clip-diagonal-both">
              <div className="aspect-[4/5] overflow-hidden bg-gradient-to-br from-dark-100 to-black border border-white/10">
                {/* Hero Image */}
                <Image
                  src="https://empowered-sports-camp-new.s3.us-east-2.amazonaws.com/hero/hero-volleyball.jpg"
                  alt="Empowered Athletes - She Breaks Limits With Fearless Grace"
                  fill
                  className="object-cover object-center"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>

            {/* Floating card - positioned at middle right */}
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 max-w-[200px] bg-black/90 border border-neon/30 p-4 backdrop-blur-sm shadow-[0_0_30px_rgba(147,205,1,0.2)]">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-9 w-9 bg-neon flex items-center justify-center">
                    <span className="text-sm font-black text-black">S</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/80 text-xs leading-relaxed">
                    &ldquo;My daughter found her confidence here. She went from shy to team captain!&rdquo;
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neon">Sarah M.</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Camp Parent</p>
                </div>
              </div>
            </div>

            {/* Stats badge - purple accent */}
            <div className="absolute -right-4 top-12 bg-purple p-5 shadow-[0_0_30px_rgba(111,0,216,0.5)]">
              <div className="text-center">
                <div className="text-3xl font-black text-white">4th</div>
                <div className="text-xs font-bold uppercase tracking-wider text-white/80">Year</div>
              </div>
            </div>

            {/* Lightning bolt decoration */}
            <div className="absolute -bottom-4 right-1/4">
              <Zap className="h-12 w-12 text-neon/50" fill="currentColor" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
    </section>
  )
}
