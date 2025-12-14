/**
 * Programs Overview Page
 *
 * Lists all Empowered Athletes programs with hero and card grid.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import ProgramCard from '@/components/programs/ProgramCard'
import { PROGRAMS } from '@/lib/constants/programs'

export const metadata: Metadata = {
  title: 'Programs | Empowered Athletes',
  description:
    'All-girls, women-led sports experiences that meet athletes where they are and help them grow as competitors and leaders.',
}

export default function ProgramsPage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon/10 via-purple/5 to-magenta/10" />
        <div className="absolute inset-0 bg-black/60" />

        {/* Glow orbs */}
        <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-neon/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-magenta/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-purple/10 rounded-full blur-[100px]" />

        {/* Content */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-neon/10 border border-neon/30">
                <Sparkles className="h-4 w-4 text-neon" />
                <span className="text-xs font-bold uppercase tracking-widest text-neon">
                  Our Programs
                </span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="headline-display headline-lg text-white mb-6">
              Programs Built For{' '}
              <span className="text-neon">Fierce, Confident Girls</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-white/80 mb-6 max-w-3xl">
              All-girls, women-led sports experiences that meet athletes where they are
              and help them grow as competitors and leaders.
            </p>

            {/* Description */}
            <p className="text-white/60 leading-relaxed mb-10 max-w-2xl">
              Empowered Sports Camp offers a pathway for girls at every stage. From
              first-time campers discovering sports, to serious athletes sharpening their
              game, to high school leaders stepping into coaching roles—each program has
              a clear purpose but shares the same heartbeat: confidence, skill, and
              leadership for girls through sport.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-6">
              <Link
                href="/camps"
                className={buttonVariants({ variant: 'neon', size: 'lg' })}
              >
                Find a Camp
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-white/70 hover:text-neon transition-colors group"
              >
                <span className="text-sm font-medium">Learn more about our philosophy</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </section>

      {/* Programs Grid */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-neon/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-magenta/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-magenta mb-4 block">
              Choose Your Path
            </span>
            <h2 className="headline-display headline-md text-white mb-6">
              Find The Right <span className="text-neon">Program</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Every program is designed with intention—meeting girls where they are and
              giving them what they need to grow.
            </p>
          </div>

          {/* Programs grid - 2x2 */}
          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            {PROGRAMS.map((program) => (
              <ProgramCard
                key={program.slug}
                name={program.name}
                tagline={program.tagline}
                description={program.description}
                href={program.href}
                color={program.color}
                grades={program.grades}
                ages={program.ages}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black to-dark-100/50" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="headline-display headline-sm text-white mb-6">
            Not Sure Which Program Is Right For Her?
          </h2>
          <p className="text-white/60 mb-10 max-w-2xl mx-auto">
            Every athlete's journey is different. Reach out and we'll help you find the
            perfect fit for your daughter's age, experience, and goals.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className={buttonVariants({ variant: 'neon', size: 'lg' })}
            >
              Contact Us
            </Link>
            <Link
              href="/camps"
              className={buttonVariants({ variant: 'outline-neon-purple', size: 'lg' })}
            >
              Browse All Camps
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
