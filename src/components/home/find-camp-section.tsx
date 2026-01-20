'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FindCampSection() {
  const [zipCode, setZipCode] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (zipCode.trim()) {
      router.push(`/camps?zip=${encodeURIComponent(zipCode.trim())}`)
    } else {
      router.push('/camps')
    }
  }

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Rainbow faded background - MORE VIBRANT */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple/35 via-magenta/25 to-neon/35" />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Glow accents */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple/12 rounded-full blur-[120px]" />
      </div>

      {/* Top fade from previous section */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-purple/30 via-purple/20 to-transparent z-10" />

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-neon/15 to-neon/30 z-10" />

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border border-neon/30 bg-dark-100/50 backdrop-blur-sm p-8 sm:p-12 lg:p-16 shadow-[0_0_50px_rgba(204,255,0,0.15)]">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
            {/* Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-3 bg-neon/10 border border-neon/30 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-neon mb-6">
                <MapPin className="h-4 w-4" />
                Find Camps Near You
              </div>
              <h2 className="headline-display headline-md">
                <span className="text-white">Discover Your</span>
                <br />
                <span className="text-neon">Perfect Location</span>
              </h2>
              <p className="mt-6 text-lg text-white/50">
                Enter your zip code to find Empowered Athletes camps near you.
                Locations across the Chicagoland area and beyond.
              </p>
            </div>

            {/* Search Form */}
            <div className="flex items-center justify-center lg:justify-end">
              <form onSubmit={handleSearch} className="w-full max-w-md">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="ENTER ZIP CODE"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="h-14 w-full bg-black border border-white/20 pl-12 pr-4 text-lg text-white uppercase tracking-wider placeholder:text-white/30 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/50"
                      maxLength={10}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="neon"
                    size="lg"
                    className="h-14 px-8"
                  >
                    <Zap className="h-5 w-5" />
                    Search
                  </Button>
                </div>
                <p className="mt-4 text-center text-sm text-white/40 sm:text-left">
                  Or{' '}
                  <a
                    href="/camps"
                    className="font-bold text-neon hover:text-neon-400 underline underline-offset-2"
                  >
                    browse all camps
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
