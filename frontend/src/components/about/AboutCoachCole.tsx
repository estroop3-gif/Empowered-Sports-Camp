/**
 * About Coach Cole Section
 *
 * Founder bio with image placeholder and accomplishments.
 */

import { Star, Trophy, GraduationCap, Briefcase } from 'lucide-react'

const accomplishments = [
  {
    icon: GraduationCap,
    text: 'NCAA Division I Soccer Player',
  },
  {
    icon: Trophy,
    text: 'Professional Soccer Career',
  },
  {
    icon: Briefcase,
    text: 'Youth Coaching Since 2015',
  },
  {
    icon: Star,
    text: 'Founded Empowered Athletes 2020',
  },
]

export default function AboutCoachCole() {
  return (
    <section className="relative py-20 lg:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

      {/* Glow effects */}
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-neon/5 rounded-full blur-[150px]" />
      <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-magenta/5 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Image placeholder */}
          <div className="relative order-2 lg:order-1">
            <div className="aspect-[3/4] bg-dark-100 border border-white/10 flex items-center justify-center relative overflow-hidden max-w-md mx-auto">
              {/* Decorative elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-magenta/5 via-transparent to-neon/5" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-magenta/10 rounded-full blur-[60px]" />
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-neon/10 rounded-full blur-[40px]" />

              {/* Placeholder content */}
              <div className="relative flex flex-col items-center gap-4 text-white/30">
                <Star className="h-16 w-16" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Photo Coming Soon
                </span>
              </div>

              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-16 h-1 bg-magenta" />
              <div className="absolute top-0 left-0 w-1 h-16 bg-magenta" />
              <div className="absolute bottom-0 right-0 w-16 h-1 bg-neon" />
              <div className="absolute bottom-0 right-0 w-1 h-16 bg-neon" />
            </div>
          </div>

          {/* Text content */}
          <div className="order-1 lg:order-2">
            {/* Section label */}
            <div className="flex items-center gap-3 mb-6">
              <Star className="h-5 w-5 text-magenta" />
              <span className="text-xs font-bold uppercase tracking-widest text-magenta">
                Meet Our Founder
              </span>
            </div>

            {/* Headline */}
            <h2 className="headline-display headline-md text-white mb-6">
              Coach <span className="text-neon">Cole</span>
            </h2>

            {/* Bio */}
            <div className="space-y-4 text-white/70 leading-relaxed mb-8">
              <p>
                Coach Cole founded Empowered Athletes with a simple belief: girls deserve
                the same quality of coaching, competition, and community that boys have
                always had access to.
              </p>
              <p>
                As a former NCAA Division I soccer player and professional athlete, Cole
                experienced firsthand the transformative power of sports. But she also saw
                how often girls were overlooked, undercoached, or pushed out of athletics
                entirely.
              </p>
              <p>
                Now, she leads a growing team of women coaches who share her vision of
                raising the next generation of confident, capable female athletes and
                leaders.
              </p>
            </div>

            {/* Accomplishments */}
            <div className="grid grid-cols-2 gap-4">
              {accomplishments.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-neon/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-neon" />
                    </div>
                    <span className="text-sm text-white/80">{item.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
