/**
 * Contact Hero Section
 *
 * Intro section for the contact page.
 */

import { Mail } from 'lucide-react'

export default function ContactHero() {
  return (
    <section className="relative py-20 lg:py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon/10 via-purple/5 to-magenta/10" />
      <div className="absolute inset-0 bg-black/60" />

      {/* Glow orbs */}
      <div className="absolute top-20 -left-40 w-[400px] h-[400px] bg-neon/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-magenta/10 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon/10 border border-neon/30 mb-6">
            <Mail className="h-4 w-4 text-neon" />
            <span className="text-xs font-bold uppercase tracking-widest text-neon">
              Get In Touch
            </span>
          </div>

          {/* Headline */}
          <h1 className="headline-display headline-lg text-white mb-6">
            Let's <span className="text-neon">Connect</span>
          </h1>

          {/* Description */}
          <p className="text-xl text-white/70 leading-relaxed">
            Whether you're looking to register your athlete, host a camp at your facility,
            or learn more about Empowered Athletes — we'd love to hear from you.
          </p>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent" />
    </section>
  )
}
