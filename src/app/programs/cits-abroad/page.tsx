/**
 * CITs Abroad Leadership Program Page
 *
 * International leadership experience in Costa Rica for top CITs.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { Globe, Users, Award, Heart, Sun, Shield, CheckCircle, ChevronDown, Plane } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import ProgramHero from '@/components/programs/ProgramHero'
import TwoColumnSection from '@/components/programs/TwoColumnSection'
import PillarCard from '@/components/programs/PillarCard'

export const metadata: Metadata = {
  title: 'CITs Abroad Leadership Program | Empowered Athletes',
  description:
    'An international leadership experience where top Coaches-in-Training travel to Costa Rica to coach, mentor, and lead alongside local athletes.',
}

const ABROAD_HIGHLIGHTS = [
  'Coach and mentor young athletes in Costa Rica communities',
  'Lead sport sessions alongside local coaches and volunteers',
  'Immerse yourself in a new culture while building global confidence',
  'Earn international leadership credentials and service hours',
  'Bond with a tight-knit team of driven female leaders',
]

const ABROAD_FAQ = [
  {
    question: 'Do I need to have completed the CIT Program first?',
    answer:
      'Yes — CITs Abroad is designed for athletes who have completed at least one season as a CIT domestically. This ensures you have the coaching fundamentals and leadership readiness to thrive internationally.',
  },
  {
    question: 'Is travel and accommodation included?',
    answer:
      'Program fees cover lodging, meals, local transportation, and all program activities in Costa Rica. Flights are booked separately, and our team will help coordinate group travel options.',
  },
  {
    question: 'How long is the trip?',
    answer:
      'The CITs Abroad program runs for 7–10 days, depending on the session. Each trip includes coaching days, cultural excursions, team-building activities, and reflection time.',
  },
  {
    question: 'Is it safe?',
    answer:
      'Safety is our top priority. All trips are led by experienced Empowered Athletes staff, with vetted local partners, established facilities, and 24/7 supervision. Detailed safety information is shared with families well in advance.',
  },
]

export default function CITsAbroadPage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <ProgramHero
        badge="International Leadership"
        title="CITs Abroad"
        titleAccent="Leadership Program"
        subtitle="CITs take on Costa Rica."
        description="Our top Coaches-in-Training take their leadership global. CITs Abroad is an immersive international experience where young women coach, mentor, and lead alongside local athletes in Costa Rica — building cross-cultural confidence, lifelong friendships, and a deeper sense of purpose."
        primaryCta={{ label: 'Find a Trip', href: '/camps?program=cits-abroad' }}
        secondaryCta={{ label: 'Learn More', href: '#the-experience' }}
        accentColor="magenta"
      />

      {/* The Experience */}
      <TwoColumnSection
        label="The Experience"
        title="More Than"
        titleAccent="A Trip"
        accentColor="magenta"
        imagePosition="left"
        imageAlt="CITs coaching in Costa Rica"
        content={
          <>
            <p>
              CITs Abroad isn't a vacation — it's a mission. You'll wake up each morning
              with a purpose: to show up for young athletes who are waiting for someone
              just like you to believe in them.
            </p>
            <p>
              From leading warm-ups on sun-soaked fields to running skill stations with
              local coaches, every day pushes you outside your comfort zone and into the
              leader you're meant to become. You'll return home changed — more confident,
              more compassionate, and more connected to the global sports community.
            </p>
            <div className="pt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-magenta/10 border border-magenta/30 text-magenta text-sm">
                <Globe className="h-4 w-4" />
                Costa Rica
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-sm">
                7–10 Days
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-sm">
                High School CITs
              </span>
            </div>
          </>
        }
      />

      {/* What You'll Do */}
      <section id="the-experience" className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple/5 rounded-full blur-[150px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Text */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple mb-4 block">
                On the Ground
              </span>
              <h2 className="headline-display headline-md text-white mb-6">
                What You&apos;ll Do <span className="text-magenta">Abroad</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-8">
                Every day is packed with purpose. You'll coach, connect, explore, and grow
                in ways that a classroom or local camp simply can't replicate.
              </p>

              <ul className="space-y-4">
                {ABROAD_HIGHLIGHTS.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-magenta/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-magenta" />
                    </div>
                    <span className="text-white/70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pillars */}
            <div className="space-y-6">
              <PillarCard
                title="Coach Across Borders"
                description="Lead drills, run stations, and mentor young athletes in Costa Rica communities — putting your CIT training to work on an international stage."
                color="magenta"
                icon={<Globe className="h-8 w-8 text-magenta" />}
              />
              <PillarCard
                title="Cultural Immersion"
                description="Experience local traditions, explore Costa Rica's natural beauty, and build cross-cultural friendships that expand your worldview."
                color="purple"
                icon={<Sun className="h-8 w-8 text-purple" />}
              />
              <PillarCard
                title="Grow as a Leader"
                description="Navigate new challenges, adapt on the fly, and discover strengths you didn't know you had — all with the support of your team."
                color="neon"
                icon={<Award className="h-8 w-8 text-neon" />}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Costa Rica */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-magenta/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-neon mb-4 block">
              The Destination
            </span>
            <h2 className="headline-display headline-md text-white mb-6">
              Why <span className="text-magenta">Costa Rica</span>
            </h2>
            <p className="text-white/60">
              Costa Rica is more than a beautiful destination — it's a community that
              shares our belief in the power of sport to change young lives.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            <div className="bg-dark-100/50 border border-white/10 p-6 text-center">
              <div className="w-12 h-12 bg-neon/10 mx-auto mb-4 flex items-center justify-center">
                <Heart className="h-6 w-6 text-neon" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Community-Centered</h3>
              <p className="text-white/60 text-sm">
                We partner with established local organizations that serve youth through
                sport, ensuring every coaching session creates real, lasting impact.
              </p>
            </div>

            <div className="bg-dark-100/50 border border-white/10 p-6 text-center">
              <div className="w-12 h-12 bg-magenta/10 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-6 w-6 text-magenta" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sport is Universal</h3>
              <p className="text-white/60 text-sm">
                Language barriers disappear on the field. Soccer, basketball, and teamwork
                speak louder than words — and our CITs prove it every trip.
              </p>
            </div>

            <div className="bg-dark-100/50 border border-white/10 p-6 text-center">
              <div className="w-12 h-12 bg-purple/10 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Safe & Supported</h3>
              <p className="text-white/60 text-sm">
                Experienced staff, vetted local partners, established facilities, and
                24/7 supervision — so families can feel confident from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Bigger Picture */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple/5 rounded-full blur-[200px]" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-magenta mb-4 block">
            The Bigger Picture
          </span>
          <h2 className="headline-display headline-md text-white mb-6">
            Leadership Without <span className="text-neon">Borders</span>
          </h2>
          <p className="text-xl text-white/70 leading-relaxed mb-6">
            We believe the best leaders are shaped by experiences that stretch them beyond
            what's familiar.
          </p>
          <p className="text-white/60 leading-relaxed max-w-2xl mx-auto">
            When a CIT steps onto a field in Costa Rica and connects with a young athlete
            who speaks a different language but shares the same love for the game — that's
            the moment everything clicks. She realizes her leadership isn't limited to her
            hometown. It's global. And that confidence follows her everywhere she goes.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-purple mb-4 block">
              Questions
            </span>
            <h2 className="headline-display headline-sm text-white mb-6">
              Frequently Asked <span className="text-magenta">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {ABROAD_FAQ.map((item, index) => (
              <div
                key={index}
                className="bg-dark-100/50 border border-white/10 p-6"
              >
                <div className="flex items-start gap-3">
                  <ChevronDown className="h-5 w-5 text-magenta flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white mb-2">{item.question}</h3>
                    <p className="text-white/60 text-sm">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-dark-100/50 to-black" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <Plane className="h-10 w-10 text-magenta mx-auto mb-6" />
          <h2 className="headline-display headline-sm text-white mb-6">
            Ready To Go Global?
          </h2>
          <p className="text-white/60 mb-10 max-w-2xl mx-auto">
            Find an upcoming CITs Abroad trip and take the first step toward an
            international leadership experience you'll never forget.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/camps?program=cits-abroad"
              className={buttonVariants({ variant: 'magenta', size: 'lg' })}
            >
              Find a Trip
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
