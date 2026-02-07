'use client'

import { useState, useRef } from 'react'
import { Search, Zap, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ZipSearchHeroProps {
  onSearch: (zip: string) => void
  isLoading?: boolean
  initialZip?: string
}

export function ZipSearchHero({ onSearch, isLoading, initialZip }: ZipSearchHeroProps) {
  const [zip, setZip] = useState(initialZip || '')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = zip.trim()
    if (trimmed.length < 3 || trimmed.length > 10) {
      setError('Please enter a valid postal code')
      inputRef.current?.focus()
      return
    }
    setError(null)
    onSearch(trimmed)
  }

  return (
    <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-neon/8 rounded-full blur-[180px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple/10 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-magenta/6 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Zap className="h-6 w-6 text-neon" />
          <span className="text-xs font-bold uppercase tracking-widest text-neon">
            Find Your Camp
          </span>
        </div>

        <h1 className="headline-display headline-lg text-white mb-4">
          Enter Your <span className="text-neon">Postal Code</span>
        </h1>
        <p className="text-lg text-white/50 mb-10 max-w-md mx-auto">
          Find camps near you — sorted by distance with full venue details.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
          <div className="flex items-stretch gap-3 w-full max-w-md">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <input
                ref={inputRef}
                type="text"
                maxLength={10}
                placeholder="Enter postal code"
                value={zip}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 10)
                  setZip(val)
                  if (error) setError(null)
                }}
                className="w-full h-14 pl-12 pr-4 bg-dark-100 border border-white/10 text-white text-lg font-mono tracking-widest placeholder:text-white/20 focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/30 transition-colors"
              />
            </div>
            <Button
              type="submit"
              variant="neon"
              size="lg"
              disabled={isLoading}
              className="px-8"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-black/30 border-t-black animate-spin rounded-full" />
                  Searching
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </span>
              )}
            </Button>
          </div>

          {error && (
            <p className="text-magenta text-sm font-medium animate-slide-up">
              {error}
            </p>
          )}
        </form>

        <p className="mt-8 text-xs text-white/20 uppercase tracking-wider">
          Supports postal codes worldwide
        </p>
      </div>
    </div>
  )
}
