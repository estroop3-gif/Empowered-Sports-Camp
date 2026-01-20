import Link from 'next/link'
import { ArrowRight, Zap, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * CTA Banner - Empowered Athletes Brand
 *
 * FIERCE ESPORTS AESTHETIC:
 * - Dark background with neon gradient overlay
 * - Bold uppercase messaging
 * - Glowing CTA buttons
 * - Lightning motifs
 */
export function CTABanner() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Rainbow faded background - MORE VIBRANT */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon/40 via-magenta/30 to-purple/40" />

      {/* Dark overlay for depth */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Extra glow spots */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-neon/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple/15 rounded-full blur-[120px]" />
      </div>

      {/* Top fade from previous section */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-neon/30 via-neon/15 to-transparent z-10" />

      {/* Bottom fade to footer */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 bg-purple/10 border border-purple/30 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-purple mb-8">
            <Zap className="h-4 w-4" />
            Limited Spots Available
          </div>

          {/* Headline */}
          <h2 className="headline-display headline-lg max-w-4xl">
            <span className="text-white">Ready to Empower Your</span>
            <br />
            <span className="text-neon-gradient text-glow-neon">Future Champion?</span>
          </h2>

          {/* Subtext */}
          <p className="mt-8 text-xl text-white/60 max-w-2xl leading-relaxed">
            Join thousands of families who have discovered the confidence-building power
            of Empowered Athletes. Registration is open—secure your daughter&apos;s spot today.
          </p>

          {/* CTAs */}
          <div className="mt-12 flex flex-col gap-4 sm:flex-row">
            <Link href="/camps">
              <Button variant="neon" size="lg" className="group">
                Find Your Camp
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline-neon" size="lg">
                Questions? Contact Us
              </Button>
            </Link>
          </div>

          {/* Trust line */}
          <div className="mt-12 flex items-center gap-3">
            <Crown className="h-5 w-5 text-neon" />
            <p className="text-sm text-white/40 uppercase tracking-wider">
              Trusted by 5,000+ families across Chicagoland
            </p>
            <Crown className="h-5 w-5 text-neon" />
          </div>
        </div>
      </div>
    </section>
  )
}
