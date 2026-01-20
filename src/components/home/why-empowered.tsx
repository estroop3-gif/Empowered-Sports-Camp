import {
  Shield,
  Trophy,
  Heart,
  Users,
  Target,
  Zap,
  Star,
  Crown
} from 'lucide-react'

/**
 * Why Empowered Section - Empowered Athletes Brand
 *
 * FIERCE ESPORTS AESTHETIC:
 * - Dark background with neon accents
 * - Bold typography
 * - Sharp edged cards
 * - Crown and lightning motifs
 */

const features = [
  {
    icon: Shield,
    title: 'Safe & Inclusive',
    description: 'Background-checked coaches trained in creating supportive environments where every girl thrives.',
    accent: 'neon',
  },
  {
    icon: Trophy,
    title: 'Real Skills, Real Sports',
    description: 'Learn 7 different sports from coaches who are passionate about developing young athletes.',
    accent: 'magenta',
  },
  {
    icon: Heart,
    title: 'Confidence First',
    description: 'Every activity is designed to help girls discover their inner strength and voice.',
    accent: 'purple',
  },
  {
    icon: Users,
    title: 'Sisterhood',
    description: 'Build lasting friendships with girls who share your love of sports and competition.',
    accent: 'neon',
  },
  {
    icon: Target,
    title: 'Goal Setting',
    description: 'Learn to set and achieve goals both on and off the field with dedicated mentorship.',
    accent: 'magenta',
  },
  {
    icon: Zap,
    title: 'Leadership Development',
    description: 'Workshops and activities designed to build the leaders of tomorrow.',
    accent: 'purple',
  },
]

const accentColors = {
  neon: {
    icon: 'bg-neon/10 text-neon border-neon/30',
    number: 'bg-neon text-black',
    hover: 'hover:border-neon/50 hover:shadow-[0_0_30px_rgba(147,205,1,0.2)]',
  },
  magenta: {
    icon: 'bg-magenta/10 text-magenta border-magenta/30',
    number: 'bg-magenta text-white',
    hover: 'hover:border-magenta/50 hover:shadow-[0_0_30px_rgba(255,45,206,0.2)]',
  },
  purple: {
    icon: 'bg-purple/10 text-purple border-purple/30',
    number: 'bg-purple text-white',
    hover: 'hover:border-purple/50 hover:shadow-[0_0_30px_rgba(111,0,216,0.2)]',
  },
}

export function WhyEmpowered() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Rainbow faded background - MORE VIBRANT */}
      <div className="absolute inset-0 bg-gradient-to-tl from-neon/35 via-magenta/25 to-purple/35" />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Glow accents */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-purple/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-neon/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-magenta/8 rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(204,255,0,0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(204,255,0,0.5) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Top fade from previous section */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-neon/30 via-neon/15 to-transparent z-10" />

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-magenta/15 to-magenta/30 z-10" />

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-3 bg-white/5 border border-neon/30 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-neon mb-8">
            <Crown className="h-4 w-4" />
            Why Choose Us
          </div>
          <h2 className="headline-display headline-lg">
            <span className="text-white">More Than</span>
            <br />
            <span className="text-neon-gradient text-glow-neon">A Sports Camp</span>
          </h2>
          <p className="mt-8 text-xl text-white/50 leading-relaxed">
            We&apos;re building confident, capable young leaders who will change the game—
            on the field and in life.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const colors = accentColors[feature.accent as keyof typeof accentColors]
            return (
              <div
                key={feature.title}
                className={`group relative bg-dark-100 border border-white/10 p-8 transition-all duration-300 ${colors.hover}`}
              >
                {/* Number badge */}
                <div className={`absolute -top-3 -right-3 h-8 w-8 flex items-center justify-center text-sm font-black ${colors.number}`}>
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center border ${colors.icon} transition-transform group-hover:scale-110`}>
                  <feature.icon className="h-7 w-7" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold uppercase tracking-wide text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-white/50 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 text-neon font-bold uppercase tracking-wider">
            <Star className="h-5 w-5 fill-current" />
            <span>Rated 4.9/5 by camp families</span>
            <Star className="h-5 w-5 fill-current" />
          </div>
        </div>
      </div>
    </section>
  )
}
