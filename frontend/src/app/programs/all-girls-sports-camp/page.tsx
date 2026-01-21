/**
 * All Girls Sports Camp Page
 *
 * Dedicated landing page for the flagship multi-sport camp.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { Heart, Zap, Users, CheckCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import ProgramHero from '@/components/programs/ProgramHero'
import TwoColumnSection from '@/components/programs/TwoColumnSection'
import SportsGrid from '@/components/programs/SportsGrid'
import ScheduleBlock from '@/components/programs/ScheduleBlock'
import PillarCard from '@/components/programs/PillarCard'
import { SPORTS_LIST, CAMP_SCHEDULE, VALUE_PILLARS } from '@/lib/constants/programs'

export const metadata: Metadata = {
  title: 'All Girls Sports Camp | Empowered Athletes',
  description:
    'An introductory multi-sport camp for girls, by girls. Athletes learn up to seven popular sports in a welcoming, safe, and competitive environment.',
}

export default function AllGirlsSportsCampPage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <ProgramHero
        badge="Flagship Program"
        title="All Girls"
        titleAccent="Sports Camp"
        subtitle="An introductory sports camp for girls, by girls."
        description="Athletes learn up to seven popular sports in a welcoming and safe, yet competitive environment with their friends. Each day blends skill-building, small-sided games, and team competitions that help girls discover what they love and build confidence while they play."
        primaryCta={{ label: 'Find a Camp', href: '/camps' }}
        secondaryCta={{ label: 'View Upcoming Dates', href: '/camps' }}
        accentColor="neon"
      />

      {/* Who It's For */}
      <TwoColumnSection
        label="Who It's For"
        title="Every Girl Is"
        titleAccent="Welcome"
        accentColor="neon"
        imageSrc="https://empowered-sports-camp-new.s3.us-east-2.amazonaws.com/programs/all-girls-welcome.png"
        imageAlt="All Girls Sports Camp - Every Girl Is Welcome"
        content={
          <>
            <p>
              Girls entering 1st–8th grade, all levels welcome. Whether your daughter is
              brand new to sports or already loves to compete, this camp meets her where
              she is and gives her space to grow.
            </p>
            <p>
              No prior experience required. We believe every girl deserves a chance to
              discover what she's capable of—and this is the perfect place to start.
            </p>
            <div className="pt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-neon/10 border border-neon/30 text-neon text-sm">
                <CheckCircle className="h-4 w-4" />
                Grades 1st–8th
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-sm">
                All skill levels
              </span>
            </div>
          </>
        }
      />

      {/* Sports They'll Explore */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-magenta/5 rounded-full blur-[150px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-magenta mb-4 block">
              Multi-Sport Experience
            </span>
            <h2 className="headline-display headline-md text-white mb-6">
              Sports They'll <span className="text-neon">Explore</span>
            </h2>
            <p className="text-white/60">
              Campers rotate through multiple sports so they can try new things, build
              all-around athleticism, and avoid burnout from doing just one thing.
            </p>
          </div>

          <SportsGrid sports={SPORTS_LIST} />

          <p className="text-center text-white/50 text-sm mt-8 max-w-2xl mx-auto">
            Sports offerings may vary by location. Intro to Weightlifting available at
            select locations.
          </p>
        </div>
      </section>

      {/* A Day At Camp */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />

        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Text content */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple mb-4 block">
                Daily Schedule
              </span>
              <h2 className="headline-display headline-md text-white mb-6">
                What A Day At Camp <span className="text-magenta">Looks Like</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-8">
                Every day is designed to keep girls moving, engaged, and supported—balancing
                skill work, gameplay, and leadership-building moments. No standing around,
                no boring lectures. Just purposeful, fun programming from start to finish.
              </p>
              <ScheduleBlock items={CAMP_SCHEDULE} />
            </div>

            {/* Highlight box */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-dark-100/50 border border-white/10 p-8">
                <h3 className="text-lg font-bold text-white mb-4">
                  The Empowered Difference
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-neon/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-neon" />
                    </div>
                    <span className="text-white/70 text-sm">
                      All-girls environment with women coaches and mentors
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-neon/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-neon" />
                    </div>
                    <span className="text-white/70 text-sm">
                      Real coaching, not just babysitting—every drill has purpose
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-neon/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-neon" />
                    </div>
                    <span className="text-white/70 text-sm">
                      Leadership moments woven into every session
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-neon/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-neon" />
                    </div>
                    <span className="text-white/70 text-sm">
                      Small groups that let every girl be seen and heard
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What She Takes Home */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon/5 rounded-full blur-[200px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-neon mb-4 block">
              Beyond The T-Shirt
            </span>
            <h2 className="headline-display headline-md text-white mb-6">
              What She <span className="text-magenta">Takes Home</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Because every girl deserves a space to grow as an athlete, as a leader,
              and as herself.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {VALUE_PILLARS.map((pillar, index) => {
              const icons = [
                <Heart key="heart" className="h-8 w-8" />,
                <Zap key="zap" className="h-8 w-8" />,
                <Users key="users" className="h-8 w-8" />,
              ]
              return (
                <PillarCard
                  key={pillar.title}
                  title={pillar.title}
                  description={pillar.description}
                  color={pillar.color as 'neon' | 'magenta' | 'purple'}
                  icon={
                    <div className={`text-${pillar.color}`}>
                      {icons[index]}
                    </div>
                  }
                />
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-dark-100/50 to-black" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="headline-display headline-sm text-white mb-6">
            Ready To Get Her In The Game?
          </h2>
          <p className="text-white/60 mb-10 max-w-2xl mx-auto">
            Find an All Girls Sports Camp near you and give her the experience she
            deserves—confidence, skills, and friendships that last.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/camps"
              className={buttonVariants({ variant: 'neon', size: 'lg' })}
            >
              Find a Camp
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
