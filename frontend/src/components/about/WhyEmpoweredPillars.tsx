/**
 * Why Empowered Athletes - Core Values Pillars
 *
 * Four pillars showcasing the organization's core values.
 */

import { Heart, Zap, Crown, Users } from 'lucide-react'

const pillars = [
  {
    icon: Heart,
    title: 'Confidence First',
    description:
      'Girls leave camp feeling capable, brave, and ready to take on new challenges. We celebrate effort, encourage risk-taking, and build self-belief through every activity.',
    color: 'neon',
  },
  {
    icon: Zap,
    title: 'Skill-Driven',
    description:
      'Real drills. Real coaching. Real improvement. Our coaches bring professional-level instruction to age-appropriate training, so every athlete walks away better than when she arrived.',
    color: 'magenta',
  },
  {
    icon: Crown,
    title: 'Leadership',
    description:
      'Every session includes opportunities to lead. Whether it\'s captaining a team, mentoring younger campers, or speaking up in a huddle — leadership is learned by doing.',
    color: 'purple',
  },
  {
    icon: Users,
    title: 'Community',
    description:
      'Girls build lasting friendships with teammates who become like sisters. Our camps create a culture of support where athletes lift each other up on and off the field.',
    color: 'neon',
  },
]

const colorClasses = {
  neon: {
    icon: 'text-neon',
    line: 'bg-neon',
    glow: 'group-hover:shadow-[0_0_30px_rgba(204,255,0,0.3)]',
  },
  magenta: {
    icon: 'text-magenta',
    line: 'bg-magenta',
    glow: 'group-hover:shadow-[0_0_30px_rgba(255,45,206,0.3)]',
  },
  purple: {
    icon: 'text-purple',
    line: 'bg-purple',
    glow: 'group-hover:shadow-[0_0_30px_rgba(111,0,216,0.3)]',
  },
}

export default function WhyEmpoweredPillars() {
  return (
    <section className="relative py-20 lg:py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />

      {/* Decorative glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple/5 rounded-full blur-[200px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-magenta mb-4 block">
            Our Core Values
          </span>
          <h2 className="headline-display headline-md text-white mb-6">
            Why <span className="text-neon">Empowered Athletes</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Our approach is built on four pillars that guide everything we do —
            from how we design drills to how we train our coaches.
          </p>
        </div>

        {/* Pillars grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon
            const colors = colorClasses[pillar.color as keyof typeof colorClasses]

            return (
              <div
                key={pillar.title}
                className={`group relative bg-dark-100/30 border border-white/10 p-6 hover:border-white/20 transition-all duration-300 ${colors.glow}`}
              >
                {/* Top accent line */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${colors.line}`} />

                {/* Icon */}
                <div className="mb-4">
                  <Icon className={`h-8 w-8 ${colors.icon}`} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-white mb-3">{pillar.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
