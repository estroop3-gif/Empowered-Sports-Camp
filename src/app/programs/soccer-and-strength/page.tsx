/**
 * Soccer & Strength Page
 *
 * Indoor technical soccer plus strength training program.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { Target, Dumbbell, Clock, CheckCircle, Zap } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import ProgramHero from '@/components/programs/ProgramHero'
import TwoColumnSection from '@/components/programs/TwoColumnSection'
import { SOCCER_SKILLS } from '@/lib/constants/programs'

export const metadata: Metadata = {
  title: 'Soccer & Strength | Empowered Athletes',
  description:
    'Technical skill and strength training for the serious soccer player. Indoor program with 1v1 attacking, ball mastery, and female-focused strength training.',
}

const SESSION_SCHEDULE = [
  {
    time: 'Warm-Up',
    title: 'Activation & Mobility',
    description: 'Dynamic movement prep focused on soccer-specific mobility and injury prevention.',
  },
  {
    time: 'Block 1',
    title: 'Technical Skills',
    description: 'High-rep footwork, ball mastery, and 1v1 moves with hundreds of touches.',
  },
  {
    time: 'Block 2',
    title: 'Small-Sided Games',
    description: 'Competitive games that force decision-making and reinforce technical skills.',
  },
  {
    time: 'Block 3',
    title: 'Strength & Movement',
    description: 'Form-focused strength work with progressions tailored for female athletes.',
  },
  {
    time: 'Cooldown',
    title: 'Recovery & Reflection',
    description: 'Stretching, recovery techniques, and goal-setting for continued improvement.',
  },
]

export default function SoccerAndStrengthPage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <ProgramHero
        badge="Specialized Training"
        title="Indoor Soccer &"
        titleAccent="Strength Camp"
        subtitle="Technical footskills, 1v1 attacking, and strength training for serious soccer players."
        description="Technical skill and strength training for the serious soccer player who wants to up her game. This camp has a heavy emphasis on individual skill moves to win 1v1 situations, while getting hundreds of touches on the ball each day through skill pattern challenges and small-sided games. Athletes also learn proper form and progression for strength training. Open to the serious female soccer player, grades 6–12."
        primaryCta={{ label: 'Find Soccer & Strength Camps', href: '/camps' }}
        secondaryCta={{ label: 'Contact Us', href: '/contact' }}
        accentColor="purple"
      />

      {/* Who It's For */}
      <TwoColumnSection
        label="Who It's For"
        title="Serious Players"
        titleAccent="Only"
        accentColor="purple"
        imageSrc="https://empowered-sports-camp-new.s3.us-east-2.amazonaws.com/programs/soccer-serious-players.png"
        imageAlt="Soccer & Strength - Serious Players Only"
        content={
          <>
            <p>
              Players who already love the game and want more reps, more touches, and
              more confidence in competitive situations. This isn't a beginner program—it's
              for athletes ready to put in the work.
            </p>
            <p>
              If your daughter wants to sharpen her technical game, become dangerous in
              1v1 situations, and build the strength foundation for long-term athletic
              development—this is her program.
            </p>
            <div className="pt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple/10 border border-purple/30 text-purple text-sm">
                <CheckCircle className="h-4 w-4" />
                Grades 6th–12th
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-sm">
                Competitive players
              </span>
            </div>
          </>
        }
      />

      {/* What We Train */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-neon/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-neon mb-4 block">
              Dual Focus
            </span>
            <h2 className="headline-display headline-md text-white mb-6">
              What We <span className="text-purple">Train</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Two pillars of development that work together: elite-level technical soccer
              and smart, progressive strength training.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Soccer Column */}
            <div className="bg-dark-100/50 border border-purple/20 p-8 relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-purple/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple" />
                </div>
                <h3 className="text-xl font-bold text-white">Technical Soccer</h3>
              </div>
              <ul className="space-y-4">
                {SOCCER_SKILLS.soccer.map((skill, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-purple" />
                    </div>
                    <span className="text-white/70">{skill}</span>
                  </li>
                ))}
              </ul>
              <p className="text-white/50 text-sm mt-6">
                Hundreds of touches every session through pattern work, challenges, and
                competitive games.
              </p>
            </div>

            {/* Strength Column */}
            <div className="bg-dark-100/50 border border-neon/20 p-8 relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-neon" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-neon/10 flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-neon" />
                </div>
                <h3 className="text-xl font-bold text-white">Strength Training</h3>
              </div>
              <ul className="space-y-4">
                {SOCCER_SKILLS.strength.map((skill, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-neon/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-neon" />
                    </div>
                    <span className="text-white/70">{skill}</span>
                  </li>
                ))}
              </ul>
              <p className="text-white/50 text-sm mt-6">
                Progressive training designed specifically for the female athlete's
                development needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* A Session At A Glance */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />

        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-magenta/5 rounded-full blur-[150px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-magenta mb-4 block">
                Session Flow
              </span>
              <h2 className="headline-display headline-md text-white mb-6">
                A Session At <span className="text-neon">A Glance</span>
              </h2>
              <p className="text-white/60">
                Every session is structured for maximum development—no wasted time,
                no standing around.
              </p>
            </div>

            <div className="space-y-4">
              {SESSION_SCHEDULE.map((item, index) => (
                <div
                  key={item.time}
                  className="flex gap-4 lg:gap-6 bg-dark-100/30 border border-white/10 p-4"
                >
                  <div className="flex-shrink-0 w-20">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple" />
                      <span className="text-xs font-bold uppercase text-purple">
                        {item.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-white/60 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-neon/5 rounded-full blur-[150px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-neon mb-4 block">
              Results
            </span>
            <h2 className="headline-display headline-md text-white mb-6">
              What She <span className="text-purple">Gains</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Sharper Ball Skills', description: 'Technical mastery from high-rep practice' },
              { title: '1v1 Confidence', description: 'Tools to beat defenders and create chances' },
              { title: 'Stronger Movement', description: 'Safe, progressive strength foundation' },
              { title: 'Training Know-How', description: 'Understanding of how serious players train' },
            ].map((item, index) => (
              <div key={item.title} className="text-center">
                <div className="w-12 h-12 bg-purple/10 mx-auto mb-4 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-purple" />
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm">{item.description}</p>
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
            Ready For Her Next Level Of Play?
          </h2>
          <p className="text-white/60 mb-10 max-w-2xl mx-auto">
            Find a Soccer & Strength camp and give her the focused training environment
            she needs to elevate her game.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/camps"
              className={buttonVariants({ variant: 'purple', size: 'lg' })}
            >
              View Upcoming Camps
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
