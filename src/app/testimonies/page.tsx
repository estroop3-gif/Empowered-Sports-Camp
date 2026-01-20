/**
 * Public Testimonies Page
 *
 * Displays approved testimonies from parents, athletes, coaches, and others.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { Heart, Star, Sparkles, Quote, Camera, Video, ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { listPublicTestimonies } from '@/lib/services/testimonies'

export const metadata: Metadata = {
  title: 'Testimonies | Empowered Sports Camp',
  description:
    'Read real stories from parents, athletes, and coaches about their Empowered Sports Camp experience.',
}

const ROLE_LABELS: Record<string, string> = {
  parent: 'Parent',
  athlete: 'Athlete',
  coach: 'Coach',
  licensee: 'Licensee',
  cit: 'CIT/Volunteer',
  volunteer: 'Volunteer',
  other: 'Community Member',
}

const ROLE_COLORS: Record<string, string> = {
  parent: 'text-purple bg-purple/10 border-purple/30',
  athlete: 'text-neon bg-neon/10 border-neon/30',
  coach: 'text-magenta bg-magenta/10 border-magenta/30',
  licensee: 'text-orange bg-orange/10 border-orange/30',
  cit: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  volunteer: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  other: 'text-white/60 bg-white/5 border-white/20',
}

export default async function TestimoniesPage() {
  const { data: testimonies } = await listPublicTestimonies({ limit: 50 })

  const featuredTestimonies = testimonies?.filter((t) => t.is_featured) || []
  const otherTestimonies = testimonies?.filter((t) => !t.is_featured) || []

  return (
    <main className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-magenta/10 via-purple/5 to-neon/10" />
        <div className="absolute inset-0 bg-black/60" />

        {/* Glow orbs */}
        <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-magenta/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple/10 rounded-full blur-[120px]" />

        {/* Content */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-magenta/10 border border-magenta/30">
                <Heart className="h-4 w-4 text-magenta" />
                <span className="text-xs font-bold uppercase tracking-widest text-magenta">
                  Real Stories
                </span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="headline-display headline-lg text-white mb-6">
              Hear From Our{' '}
              <span className="text-magenta">Empowered Community</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-white/80 mb-6 max-w-3xl">
              Real stories from parents, athletes, coaches, and volunteers about
              how Empowered Sports Camp made a difference.
            </p>

            {/* CTA */}
            <div className="flex flex-wrap items-center gap-6">
              <Link
                href="/testimonies/submit"
                className={buttonVariants({ variant: 'magenta', size: 'lg' })}
              >
                Share Your Story
              </Link>
              <Link
                href="/camps"
                className="inline-flex items-center gap-2 text-white/70 hover:text-neon transition-colors group"
              >
                <span className="text-sm font-medium">Find a Camp Near You</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stories */}
      {featuredTestimonies.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-8">
              <Star className="h-5 w-5 text-neon" />
              <h2 className="text-2xl font-black uppercase tracking-wider text-white">
                Featured Stories
              </h2>
            </div>

            {/* Featured Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {featuredTestimonies.map((testimony) => (
                <div
                  key={testimony.id}
                  className="relative bg-dark-100/50 border border-neon/20 p-8 group hover:border-neon/40 transition-all"
                >
                  {/* Star badge */}
                  <div className="absolute -top-3 -right-3 p-2 bg-neon text-black">
                    <Star className="h-4 w-4 fill-current" />
                  </div>

                  {/* Quote icon */}
                  <Quote className="h-8 w-8 text-neon/30 mb-4" />

                  {/* Headline */}
                  {testimony.headline && (
                    <h3 className="text-xl font-bold text-white mb-4">
                      &ldquo;{testimony.headline}&rdquo;
                    </h3>
                  )}

                  {/* Body */}
                  <p className="text-white/70 leading-relaxed mb-6">
                    {testimony.body.length > 300
                      ? testimony.body.slice(0, 300) + '...'
                      : testimony.body}
                  </p>

                  {/* Media indicators */}
                  {(testimony.photo_url || testimony.video_url) && (
                    <div className="flex items-center gap-3 mb-4">
                      {testimony.photo_url && (
                        <div className="flex items-center gap-1 text-xs text-white/40">
                          <Camera className="h-3 w-3" />
                          <span>Photo</span>
                        </div>
                      )}
                      {testimony.video_url && (
                        <div className="flex items-center gap-1 text-xs text-white/40">
                          <Video className="h-3 w-3" />
                          <span>Video</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Author */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div>
                      <p className="font-bold text-white">{testimony.author_name}</p>
                      {testimony.author_relationship && (
                        <p className="text-sm text-white/50">{testimony.author_relationship}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                        ROLE_COLORS[testimony.author_role] || ROLE_COLORS.other
                      }`}
                    >
                      {ROLE_LABELS[testimony.author_role] || testimony.author_role}
                    </span>
                  </div>

                  {/* Camp reference */}
                  {testimony.camp_name && (
                    <p className="text-xs text-white/40 mt-3">
                      {testimony.camp_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Stories */}
      <section className="py-16 lg:py-24 bg-dark-100/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="h-5 w-5 text-purple" />
            <h2 className="text-2xl font-black uppercase tracking-wider text-white">
              {featuredTestimonies.length > 0 ? 'More Stories' : 'All Stories'}
            </h2>
          </div>

          {otherTestimonies.length === 0 && featuredTestimonies.length === 0 ? (
            <div className="text-center py-16">
              <Quote className="h-16 w-16 text-white/10 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-white/60 mb-3">
                Be the First to Share Your Story
              </h3>
              <p className="text-white/40 mb-8 max-w-md mx-auto">
                We&apos;d love to hear about your experience with Empowered Sports Camp.
              </p>
              <Link
                href="/testimonies/submit"
                className={buttonVariants({ variant: 'purple' })}
              >
                Share Your Story
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherTestimonies.map((testimony) => (
                <div
                  key={testimony.id}
                  className="bg-dark-100/50 border border-white/10 p-6 hover:border-purple/30 transition-all"
                >
                  {/* Quote icon */}
                  <Quote className="h-6 w-6 text-purple/30 mb-3" />

                  {/* Headline */}
                  {testimony.headline && (
                    <h3 className="text-lg font-bold text-white mb-3">
                      &ldquo;{testimony.headline}&rdquo;
                    </h3>
                  )}

                  {/* Body */}
                  <p className="text-sm text-white/70 leading-relaxed mb-4">
                    {testimony.body.length > 200
                      ? testimony.body.slice(0, 200) + '...'
                      : testimony.body}
                  </p>

                  {/* Media indicators */}
                  {(testimony.photo_url || testimony.video_url) && (
                    <div className="flex items-center gap-3 mb-3">
                      {testimony.photo_url && (
                        <div className="flex items-center gap-1 text-xs text-white/40">
                          <Camera className="h-3 w-3" />
                        </div>
                      )}
                      {testimony.video_url && (
                        <div className="flex items-center gap-1 text-xs text-white/40">
                          <Video className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Author */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div>
                      <p className="font-semibold text-white text-sm">{testimony.author_name}</p>
                      {testimony.author_relationship && (
                        <p className="text-xs text-white/40">{testimony.author_relationship}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        ROLE_COLORS[testimony.author_role] || ROLE_COLORS.other
                      }`}
                    >
                      {ROLE_LABELS[testimony.author_role] || testimony.author_role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-magenta/20 via-purple/10 to-neon/20 border border-white/10 p-8 lg:p-12 text-center">
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative">
              <Heart className="h-12 w-12 text-magenta mx-auto mb-6" />
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-wider text-white mb-4">
                Share Your Experience
              </h2>
              <p className="text-white/60 max-w-2xl mx-auto mb-8">
                Has Empowered Sports Camp made a difference in your family&apos;s life?
                We&apos;d love to hear your story and share it with our community.
              </p>
              <Link
                href="/testimonies/submit"
                className={buttonVariants({ variant: 'magenta', size: 'lg' })}
              >
                Submit Your Testimony
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
