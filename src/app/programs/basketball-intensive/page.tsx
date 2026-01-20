/**
 * Basketball Intensive Page
 *
 * High-rep skill work and competitive play for serious hoopers.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { Target, Zap, Users, Brain, Clock, CheckCircle, Heart } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import ProgramHero from '@/components/programs/ProgramHero'
import TwoColumnSection from '@/components/programs/TwoColumnSection'
import PillarCard from '@/components/programs/PillarCard'
import { BASKETBALL_PILLARS } from '@/lib/constants/programs'

export const metadata: Metadata = {
  title: 'Basketball Intensive | Empowered Athletes',
  description:
    'High-rep skill work and competitive reps for serious hoopers. Ball-handling, shooting, decision-making, and live small-sided games.',
}

const DAY_SCHEDULE = [
  { time: 'Check-In', title: 'Warm-Up & Activation' },
  { time: 'Block 1', title: 'Ball-Handling & Footwork' },
  { time: 'Block 2', title: 'Shooting & Finishing' },
  { time: 'Break', title: 'Recovery & Hydration' },
  { time: 'Block 3', title: 'Small-Sided Games & Competition' },
  { time: 'Closing', title: 'Cooldown & Leadership Huddle' },
]

export default function BasketballIntensivePage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <ProgramHero
        badge="New Program"
        title="Basketball"
        titleAccent="Intensive"
        subtitle="High-rep skill work and competitive reps for serious hoopers."
        description="The Basketball Intensive is for girls who want to compete with confidence. We combine high-repetition ball-handling, shooting, decision-making, and live small-sided games so athletes get the kind of focused work they rarely find in a typical practice."
        primaryCta={{ label: 'Find Basketball Intensive Camps', href: '/camps' }}
        secondaryCta={{ label: 'Contact Us', href: '/contact' }}
        accentColor="neon"
      />

      {/* Who It's For */}
      <TwoColumnSection
        label="Who It's For"
        title="Competitive"
        titleAccent="Hoopers"
        accentColor="neon"
        content={
          <>
            <p>
              Girls in grades 6–12 who have some basketball experience and want to grow
              as playmakers, scorers, and leaders on the court.
            </p>
            <p>
              Whether she's a point guard looking to tighten her handle, a wing who wants
              to become a more confident shooter, or a post player developing perimeter
              skills—this intensive meets her where she is and pushes her forward.
            </p>
            <div className="pt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-neon/10 border border-neon/30 text-neon text-sm">
                <CheckCircle className="h-4 w-4" />
                Grades 6th–12th
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-sm">
                Some experience preferred
              </span>
            </div>
          </>
        }
      />

      {/* What We Work On */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-magenta/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-magenta mb-4 block">
              Skill Development
            </span>
            <h2 className="headline-display headline-md text-white mb-6">
              What We <span className="text-neon">Work On</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Three pillars of complete player development—handles, scoring, and
              game intelligence.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {BASKETBALL_PILLARS.map((pillar, index) => {
              const icons = [
                <Zap key="zap" className="h-8 w-8 text-neon" />,
                <Target key="target" className="h-8 w-8 text-magenta" />,
                <Brain key="brain" className="h-8 w-8 text-purple" />,
              ]
              return (
                <PillarCard
                  key={pillar.title}
                  title={pillar.title}
                  description={pillar.description}
                  color={pillar.color as 'neon' | 'magenta' | 'purple'}
                  icon={icons[index]}
                />
              )
            })}
          </div>
        </div>
      </section>

      {/* Leadership & Mindset */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple/5 rounded-full blur-[200px]" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple mb-4 block">
                Beyond The X's And O's
              </span>
              <h2 className="headline-display headline-md text-white mb-6">
                Leadership & <span className="text-magenta">Mindset</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-6">
                Just like all of our programs, the Basketball Intensive weaves in
                leadership and confidence-building moments. We want athletes to walk
                off the court with a stronger voice, better communication, and belief
                in themselves.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple/10 flex items-center justify-center mt-0.5">
                    <Heart className="h-4 w-4 text-purple" />
                  </div>
                  <span className="text-white/70">
                    Confidence-building through competitive success
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple/10 flex items-center justify-center mt-0.5">
                    <Users className="h-4 w-4 text-purple" />
                  </div>
                  <span className="text-white/70">
                    Communication and court leadership development
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple/10 flex items-center justify-center mt-0.5">
                    <Zap className="h-4 w-4 text-purple" />
                  </div>
                  <span className="text-white/70">
                    Mental toughness through high-pressure scenarios
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-dark-100/50 border border-magenta/20 p-8">
              <div className="absolute top-0 left-0 right-0 h-1 bg-magenta" />
              <h3 className="text-lg font-bold text-white mb-4">
                The Empowered Difference
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                This is still the same Empowered environment—women-led, all-girls,
                and built around confidence, community, and growth through sport.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-magenta" />
                  <span className="text-white/70 text-sm">Women coaches who understand the female athlete</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-magenta" />
                  <span className="text-white/70 text-sm">All-girls environment where she can compete freely</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-magenta" />
                  <span className="text-white/70 text-sm">Leadership woven into every session</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* A Day At Camp */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-neon/5 rounded-full blur-[150px]" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-neon mb-4 block">
              Daily Flow
            </span>
            <h2 className="headline-display headline-md text-white mb-6">
              A Day At <span className="text-magenta">Camp</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {DAY_SCHEDULE.map((item, index) => (
              <div
                key={item.time}
                className="bg-dark-100/30 border border-white/10 p-4 text-center hover:border-neon/30 transition-colors"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-neon" />
                  <span className="text-xs font-bold uppercase text-neon">
                    {item.time}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-white">{item.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-dark-100/50 to-black" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="headline-display headline-sm text-white mb-6">
            Ready To Elevate Her Game?
          </h2>
          <p className="text-white/60 mb-10 max-w-2xl mx-auto">
            Find a Basketball Intensive camp and give her the high-rep, competitive
            environment she needs to become a more complete player.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/camps"
              className={buttonVariants({ variant: 'neon', size: 'lg' })}
            >
              View Camps
            </Link>
            <Link
              href="/contact"
              className={buttonVariants({ variant: 'outline-neon-purple', size: 'lg' })}
            >
              Ask a Question
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
