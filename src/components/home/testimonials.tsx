import { Star, Quote, Crown } from 'lucide-react'

const testimonials = [
  {
    quote: "My daughter came home every day glowing. She tried sports she'd never considered before and discovered she loves volleyball. More importantly, she found her voice and confidence.",
    author: "Sarah M.",
    role: "Parent of 9-year-old athlete",
    rating: 5,
    accent: 'neon',
  },
  {
    quote: "The coaches are incredible. They know how to challenge the girls while keeping everything fun and supportive. My daughter has been going for 3 summers and won't miss a year.",
    author: "Jennifer K.",
    role: "Parent of 11-year-old athlete",
    rating: 5,
    accent: 'magenta',
  },
  {
    quote: "As a working mom, knowing my daughter is in a safe, enriching environment gives me peace of mind. The skills she's learned go way beyond sports.",
    author: "Michelle T.",
    role: "Parent of 8-year-old athlete",
    rating: 5,
    accent: 'purple',
  },
]

const accentStyles = {
  neon: {
    border: 'border-neon/30 hover:border-neon/50',
    quote: 'text-neon/20',
    star: 'fill-neon text-neon',
    glow: 'hover:shadow-[0_0_30px_rgba(147,205,1,0.2)]',
    initial: 'bg-neon text-black',
  },
  magenta: {
    border: 'border-magenta/30 hover:border-magenta/50',
    quote: 'text-magenta/20',
    star: 'fill-magenta text-magenta',
    glow: 'hover:shadow-[0_0_30px_rgba(255,45,206,0.2)]',
    initial: 'bg-magenta text-white',
  },
  purple: {
    border: 'border-purple/30 hover:border-purple/50',
    quote: 'text-purple/20',
    star: 'fill-purple text-purple',
    glow: 'hover:shadow-[0_0_30px_rgba(111,0,216,0.2)]',
    initial: 'bg-purple text-white',
  },
}

export function Testimonials() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Rainbow faded background - MORE VIBRANT */}
      <div className="absolute inset-0 bg-gradient-to-bl from-magenta/30 via-purple/20 to-neon/30" />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Glow accents */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-magenta/12 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-0 w-[300px] h-[300px] bg-neon/12 rounded-full blur-[120px]" />
      </div>

      {/* Top fade from previous section */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-magenta/30 via-magenta/15 to-transparent z-10" />

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-neon/15 to-neon/30 z-10" />

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/5 border border-magenta/30 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-magenta mb-8">
            <Crown className="h-4 w-4" />
            Testimonials
          </div>
          <h2 className="headline-display headline-md">
            <span className="text-white">What Parents</span>
            <br />
            <span className="text-magenta-gradient text-glow-magenta">Are Saying</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/50">
            Don't just take our word for it. Hear from the families who've experienced
            the Empowered difference.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => {
            const styles = accentStyles[testimonial.accent as keyof typeof accentStyles]
            return (
              <div
                key={index}
                className={`relative bg-dark-100 border ${styles.border} p-8 transition-all duration-300 ${styles.glow}`}
              >
                {/* Quote Icon */}
                <Quote className={`absolute right-6 top-6 h-12 w-12 ${styles.quote}`} />

                {/* Rating */}
                <div className="flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${styles.star}`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="relative mt-6 text-white/70 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>

                {/* Author */}
                <div className="mt-6 border-t border-white/10 pt-6 flex items-center gap-4">
                  <div className={`h-10 w-10 flex items-center justify-center font-black ${styles.initial}`}>
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-white">
                      {testimonial.author}
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
