import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  ArrowLeft,
  Zap,
  Crown,
  AlertCircle,
} from 'lucide-react'
import {
  fetchCampBySlug,
  formatPrice,
  formatDateRange,
  formatAgeRange,
  type PublicCampCard,
} from '@/lib/services/camps'
import { ShareCampButton } from '@/components/camps/ShareCampButton'

/** Convert "HH:MM" or "HH:MM:SS" 24h time to "H:MM AM/PM" */
function formatTime12h(time?: string | null): string {
  if (!time) return '9:00 AM'
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${ampm}`
}

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getCamp(slug: string): Promise<PublicCampCard | null> {
  try {
    return await fetchCampBySlug(slug)
  } catch (error) {
    console.error('Failed to fetch camp:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const camp = await getCamp(slug)

  if (!camp) {
    return {
      title: 'Camp Not Found',
    }
  }

  return {
    title: `${camp.name} | Empowered Sports Camp`,
    description: camp.description || `Register for ${camp.name}`,
  }
}

export default async function CampDetailPage({ params }: PageProps) {
  const { slug } = await params
  const camp = await getCamp(slug)

  if (!camp) {
    notFound()
  }

  const isEarlyBird =
    camp.early_bird_price &&
    camp.early_bird_deadline &&
    new Date() < new Date(camp.early_bird_deadline)
  const currentPrice = isEarlyBird ? camp.early_bird_price! : camp.price

  return (
    <div className="min-h-screen bg-black">
      {/* Breadcrumb */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 pt-24">
          <Link
            href="/camps"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all camps
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative border-b border-white/10">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-neon/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {camp.name}
                </h1>
                {camp.description && (
                  <p className="mt-6 text-lg text-white/60 whitespace-pre-wrap">{camp.description}</p>
                )}
              </div>

              {/* Quick Info Grid */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 p-4 bg-dark-100 border border-white/10">
                  <MapPin className="h-5 w-5 text-neon" />
                  <div>
                    <div className="text-sm text-white/40 uppercase tracking-wider">Location</div>
                    <div className="text-white font-medium">
                      {camp.location_name || 'TBD'}
                      {camp.city && `, ${camp.city}`}
                      {camp.state && `, ${camp.state}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-dark-100 border border-white/10">
                  <Calendar className="h-5 w-5 text-magenta" />
                  <div>
                    <div className="text-sm text-white/40 uppercase tracking-wider">Dates</div>
                    <div className="text-white font-medium">
                      {formatDateRange(camp.start_date, camp.end_date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-dark-100 border border-white/10">
                  <Clock className="h-5 w-5 text-purple" />
                  <div>
                    <div className="text-sm text-white/40 uppercase tracking-wider">Time</div>
                    <div className="text-white font-medium">
                      {formatTime12h(camp.daily_start_time)} - {formatTime12h(camp.daily_end_time)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-dark-100 border border-white/10">
                  <Users className="h-5 w-5 text-neon" />
                  <div>
                    <div className="text-sm text-white/40 uppercase tracking-wider">Ages</div>
                    <div className="text-white font-medium">
                      {formatAgeRange(camp.min_age, camp.max_age)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Image — hidden for now */}
              {camp.image_url ? (
                <div className="hidden mt-8 aspect-[16/9] overflow-hidden border border-white/10">
                  <img
                    src={camp.image_url}
                    alt={camp.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="hidden mt-8 aspect-[16/9] overflow-hidden border border-white/10 bg-gradient-to-br from-neon/10 via-purple/10 to-magenta/10">
                  <div className="flex h-full items-center justify-center">
                    <Crown className="h-24 w-24 text-neon/30" />
                  </div>
                </div>
              )}
            </div>

            {/* Registration Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-dark-100 border border-white/10 p-6 space-y-6">
                {/* Price */}
                <div>
                  {isEarlyBird && (
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-neon" />
                      <span className="text-xs font-bold uppercase tracking-widest text-neon">
                        Early Bird Pricing
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-neon">
                      {formatPrice(currentPrice)}
                    </span>
                    {isEarlyBird && (
                      <span className="text-lg text-white/40 line-through">
                        {formatPrice(camp.price)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Availability */}
                {camp.is_full ? (
                  <div className="p-4 bg-magenta/10 border border-magenta/30 text-center">
                    <AlertCircle className="h-6 w-6 text-magenta mx-auto mb-2" />
                    <p className="font-bold text-magenta uppercase tracking-wider">Session Full</p>
                    <p className="mt-1 text-sm text-magenta/70">
                      Join waitlist for notifications
                    </p>
                  </div>
                ) : camp.spots_remaining <= 5 ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-center">
                    <p className="font-bold text-yellow-500 uppercase tracking-wider">
                      Only {camp.spots_remaining} spots left!
                    </p>
                    <p className="mt-1 text-sm text-yellow-500/70">
                      Register now to secure your spot
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-neon/10 border border-neon/30 text-center">
                    <p className="font-bold text-neon uppercase tracking-wider">
                      {camp.spots_remaining} spots available
                    </p>
                  </div>
                )}

                {/* CTA Buttons */}
                <Link
                  href={`/register/${camp.slug}`}
                  className={`block w-full py-4 text-center font-bold uppercase tracking-widest transition-all ${
                    camp.is_full
                      ? 'bg-transparent border-2 border-magenta text-magenta hover:bg-magenta/10'
                      : 'bg-neon text-black hover:bg-neon/90'
                  }`}
                >
                  {camp.is_full ? 'Join Waitlist' : 'Register Now'}
                </Link>

                <ShareCampButton
                  campName={camp.name}
                  campSlug={camp.slug}
                  campDescription={camp.description}
                  campDates={formatDateRange(camp.start_date, camp.end_date)}
                  campLocation={
                    camp.location_name
                      ? `${camp.location_name}${camp.city ? `, ${camp.city}` : ''}${camp.state ? `, ${camp.state}` : ''}`
                      : null
                  }
                />

                {isEarlyBird && camp.early_bird_deadline && (
                  <p className="text-center text-sm text-white/40">
                    Early bird pricing ends{' '}
                    <span className="text-neon">
                      {new Date(camp.early_bird_deadline).toLocaleDateString()}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-16">
            {/* Sports */}
            {camp.sports_offered && camp.sports_offered.length > 0 && (
              <section>
                <h2 className="text-2xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                  <Crown className="h-6 w-6 text-neon" />
                  Sports You&apos;ll Play
                </h2>
                <div className="mt-6 flex flex-wrap gap-3">
                  {camp.sports_offered.map((sport) => (
                    <span
                      key={sport}
                      className="px-4 py-2 bg-purple/10 border border-purple/30 text-purple text-sm font-bold uppercase tracking-wider"
                    >
                      {sport}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Highlights */}
            {camp.highlights && camp.highlights.length > 0 && (
              <section>
                <h2 className="text-2xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-neon" />
                  What&apos;s Included
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {camp.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Zap className="h-5 w-5 flex-shrink-0 text-neon mt-0.5" />
                      <span className="text-white/70">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Tenant Info */}
            {camp.tenant_name && (
              <section>
                <h2 className="text-2xl font-black uppercase tracking-wider text-white flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-magenta" />
                  Hosted By
                </h2>
                <div className="mt-6 p-6 bg-dark-100 border border-white/10">
                  <h3 className="text-xl font-bold text-white">{camp.tenant_name}</h3>
                  {camp.location_address && (
                    <p className="mt-2 text-white/60">
                      {camp.location_address}
                      <br />
                      {camp.city}, {camp.state} {camp.zip_code}
                    </p>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      `${camp.location_address || ''} ${camp.city || ''} ${camp.state || ''} ${
                        camp.zip_code || ''
                      }`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-neon hover:text-neon/80 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">Get Directions</span>
                  </a>
                </div>
              </section>
            )}
          </div>

          {/* Location Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-dark-100 border border-white/10 p-6">
              <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-4">
                Location Details
              </h3>
              {/* Map — OpenStreetMap embed (no API key needed) */}
              <div className="aspect-video bg-black/50 border border-white/10 mb-4 overflow-hidden">
                {camp.latitude && camp.longitude ? (
                  <iframe
                    title={`Map of ${camp.location_name || 'camp location'}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${camp.longitude - 0.01},${camp.latitude - 0.007},${camp.longitude + 0.01},${camp.latitude + 0.007}&layer=mapnik&marker=${camp.latitude},${camp.longitude}`}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <MapPin className="h-8 w-8 text-white/20" />
                  </div>
                )}
              </div>
              <h4 className="font-bold text-white">{camp.location_name || 'Location TBD'}</h4>
              {camp.location_address && (
                <p className="mt-2 text-white/60 text-sm">
                  {camp.location_address}
                  <br />
                  {camp.city}, {camp.state} {camp.zip_code}
                </p>
              )}
              {camp.indoor !== null && (
                <p className="mt-3 text-sm text-white/40">
                  {camp.indoor ? 'Indoor Facility' : 'Outdoor Facility'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-white">
                Ready to Join?
              </h2>
              <p className="mt-2 text-white/60">
                {camp.is_full
                  ? 'Join the waitlist to be notified when a spot opens up.'
                  : `Only ${camp.spots_remaining} spots remaining. Register today!`}
              </p>
            </div>
            <Link
              href={`/register/${camp.slug}`}
              className={`px-8 py-4 font-bold uppercase tracking-widest transition-all ${
                camp.is_full
                  ? 'bg-transparent border-2 border-magenta text-magenta hover:bg-magenta/10'
                  : 'bg-neon text-black hover:bg-neon/90'
              }`}
            >
              {camp.is_full ? 'Join Waitlist' : 'Register Now'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
