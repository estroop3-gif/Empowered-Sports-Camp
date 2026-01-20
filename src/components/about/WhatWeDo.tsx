/**
 * What We Do Section
 *
 * Showcases the four main program types with cards.
 */

import { Users, Award, Dumbbell, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const programs = [
  {
    icon: Users,
    title: 'All Girls Sports Camp',
    description:
      'Our flagship multi-sport day camps for girls ages 5-14. Soccer, basketball, flag football, and more — all taught by women coaches who model strength and leadership.',
    color: 'neon',
  },
  {
    icon: Award,
    title: 'CIT Program',
    description:
      'Our Counselor-in-Training program for ages 13-14 bridges the gap between camper and coach. CITs learn mentorship, gain real responsibility, and develop leadership skills.',
    color: 'magenta',
  },
  {
    icon: Dumbbell,
    title: 'Indoor Soccer & Strength',
    description:
      'Year-round indoor programming that keeps athletes active in the off-season. Combines technical soccer training with age-appropriate strength and conditioning.',
    color: 'purple',
  },
  {
    icon: Target,
    title: 'Specialty Camps',
    description:
      'Position-specific and sport-specific clinics for athletes who want to go deeper. Goalkeeper training, striker academies, and elite skill development sessions.',
    color: 'neon',
  },
]

const colorClasses = {
  neon: {
    icon: 'text-neon',
    border: 'border-neon/30',
    glow: 'bg-neon/10',
  },
  magenta: {
    icon: 'text-magenta',
    border: 'border-magenta/30',
    glow: 'bg-magenta/10',
  },
  purple: {
    icon: 'text-purple',
    border: 'border-purple/30',
    glow: 'bg-purple/10',
  },
}

export default function WhatWeDo() {
  return (
    <section className="relative py-20 lg:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

      {/* Glow effects */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-neon/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-magenta/5 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-neon mb-4 block">
            Our Programs
          </span>
          <h2 className="headline-display headline-md text-white mb-6">
            What We <span className="text-magenta">Do</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            From multi-sport day camps to specialized training, we offer programming
            designed to meet girls where they are and help them grow.
          </p>
        </div>

        {/* Program cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {programs.map((program) => {
            const Icon = program.icon
            const colors = colorClasses[program.color as keyof typeof colorClasses]

            return (
              <Card
                key={program.title}
                className={`bg-dark-100/50 border ${colors.border} hover:border-opacity-60 transition-all duration-300 group`}
              >
                <CardContent className="p-6 lg:p-8">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 ${colors.glow} flex items-center justify-center`}
                    >
                      <Icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-neon transition-colors">
                        {program.title}
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed">
                        {program.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
