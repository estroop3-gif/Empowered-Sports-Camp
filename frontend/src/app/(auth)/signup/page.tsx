'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth/cognito-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap, Mail, Lock, User, Phone, ArrowRight, Crown, MapPin, ChevronDown, Check } from 'lucide-react'

const HOW_HEARD_OPTIONS = [
  'Friend or family referral',
  'Social media (Instagram, Facebook)',
  'Google search',
  'School or community flyer',
  'Local sports league',
  'News or press coverage',
  'Other',
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

interface LocationOption {
  city: string
  state: string
  display: string
}

export default function SignUpPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    state: '',
    zipCode: '',
    howHeard: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Location autocomplete state
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [locationSearch, setLocationSearch] = useState('')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [filteredLocations, setFilteredLocations] = useState<LocationOption[]>([])
  const locationRef = useRef<HTMLDivElement>(null)

  // Fetch available locations on mount
  useEffect(() => {
    async function fetchLocations() {
      try {
        // Fetch cities from camps API
        const citiesRes = await fetch('/api/camps?action=cities')
        const citiesData = await citiesRes.json()
        const cities: string[] = citiesData.data || []

        // Fetch states from camps API
        const statesRes = await fetch('/api/camps?action=states')
        const statesData = await statesRes.json()
        const states: string[] = statesData.data || []

        // Create location options - combine cities with their likely states
        // For now, just create city options since we don't have city-state mapping
        const locationOptions: LocationOption[] = []

        // Add each city as an option
        cities.forEach(city => {
          if (city) {
            locationOptions.push({
              city,
              state: '',
              display: city,
            })
          }
        })

        // Add state options for broader selection
        states.forEach(state => {
          if (state) {
            locationOptions.push({
              city: '',
              state,
              display: `Any city in ${state}`,
            })
          }
        })

        setLocations(locationOptions)
      } catch (err) {
        console.error('Failed to fetch locations:', err)
      }
    }
    fetchLocations()
  }, [])

  // Filter locations based on search
  useEffect(() => {
    if (locationSearch.trim()) {
      const search = locationSearch.toLowerCase()
      const filtered = locations.filter(loc =>
        loc.display.toLowerCase().includes(search) ||
        loc.city.toLowerCase().includes(search) ||
        loc.state.toLowerCase().includes(search)
      )
      setFilteredLocations(filtered)
    } else {
      setFilteredLocations(locations)
    }
  }, [locationSearch, locations])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocationSelect = (location: LocationOption) => {
    setFormData(prev => ({
      ...prev,
      city: location.city,
      state: location.state,
    }))
    setLocationSearch(location.display)
    setShowLocationDropdown(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      // Sign up with Cognito
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      // Get the user ID from Cognito
      const userId = result.userSub

      if (userId) {
        // Create profile and role in database via API
        const response = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
          }),
        })

        if (!response.ok) {
          console.error('Failed to create user profile:', await response.text())
        }
      }

      // Cognito will send a verification email
      // Redirect to confirmation page
      router.push('/signup/confirm?email=' + encodeURIComponent(formData.email))
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      console.error('Sign up error:', error)

      if (error.code === 'UsernameExistsException') {
        setError('An account with this email already exists.')
      } else if (error.code === 'InvalidPasswordException') {
        setError('Password does not meet requirements. Must include uppercase, lowercase, numbers, and special characters.')
      } else if (error.code === 'InvalidParameterException') {
        setError('Please check your input and try again.')
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-neon/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-magenta/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-lg">
            <Link href="/" className="flex items-center gap-3 mb-12">
              <div className="relative h-14 w-14">
                <Image
                  src="/images/logo.png"
                  alt="Empowered Athletes"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-2xl font-black uppercase tracking-wider text-white">Empowered</span>
                <span className="text-2xl font-light uppercase tracking-wider text-neon ml-2">Athletes</span>
              </div>
            </Link>

            <h2 className="text-5xl font-black uppercase tracking-wider text-white mb-6">
              Join the<br />
              <span className="text-neon-gradient text-glow-neon">Movement</span>
            </h2>

            <p className="text-xl text-white/60 leading-relaxed mb-8">
              Create your parent account to register your athletes for camps, track their progress, and become part of our community of fierce competitors.
            </p>

            <div className="flex items-center gap-4 text-white/40">
              <Crown className="h-6 w-6 text-neon" />
              <span className="text-sm uppercase tracking-wider">Trusted by 5,000+ families</span>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="relative h-12 w-12">
                  <Image
                    src="/images/logo.png"
                    alt="Empowered Athletes"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <span className="text-xl font-black uppercase tracking-wider text-white">Empowered</span>
                  <span className="text-xl font-light uppercase tracking-wider text-neon ml-2">Athletes</span>
                </div>
              </Link>
            </div>

            <div className="bg-dark-100 border border-white/10 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="h-6 w-6 text-neon" />
                <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                  Create Parent Account
                </h1>
              </div>

              <p className="text-sm text-white/50 mb-6">
                Start by creating your parent account. You can add your athletes after signing up.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      First Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                      <Input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="pl-12"
                        placeholder="Jane"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      Last Name *
                    </label>
                    <Input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      placeholder="Smith"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="pl-12"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Mobile Phone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="pl-12"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                {/* Location */}
                <div ref={locationRef}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Location *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 z-10" />
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(e) => {
                        setLocationSearch(e.target.value)
                        setShowLocationDropdown(true)
                      }}
                      onFocus={() => setShowLocationDropdown(true)}
                      placeholder="Search for your city or state..."
                      required
                      className="w-full bg-black border border-white/20 text-white pl-12 pr-10 py-3 focus:border-neon focus:outline-none"
                    />
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />

                    {/* Dropdown */}
                    {showLocationDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-white/20 max-h-60 overflow-y-auto">
                        {filteredLocations.length === 0 ? (
                          <div className="px-4 py-3 text-white/50 text-sm">
                            {locations.length === 0 ? 'Loading locations...' : 'No locations found'}
                          </div>
                        ) : (
                          filteredLocations.slice(0, 10).map((loc, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleLocationSelect(loc)}
                              className="w-full px-4 py-3 text-left text-white hover:bg-neon/10 flex items-center justify-between transition-colors"
                            >
                              <span>{loc.display}</span>
                              {(formData.city === loc.city && formData.state === loc.state) && (
                                <Check className="h-4 w-4 text-neon" />
                              )}
                            </button>
                          ))
                        )}
                        {/* Manual entry option */}
                        <div className="border-t border-white/10 px-4 py-2">
                          <p className="text-xs text-white/40 mb-2">Or enter manually:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleChange}
                              placeholder="City"
                              className="text-sm"
                            />
                            <select
                              name="state"
                              value={formData.state}
                              onChange={handleChange}
                              className="bg-black border border-white/20 text-white text-sm px-2 py-2 focus:border-neon focus:outline-none"
                            >
                              <option value="">State</option>
                              {US_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Show selected location */}
                  {(formData.city || formData.state) && !showLocationDropdown && (
                    <p className="mt-1 text-xs text-neon">
                      Selected: {[formData.city, formData.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                {/* How did you hear about us */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    How did you hear about us?
                  </label>
                  <select
                    name="howHeard"
                    value={formData.howHeard}
                    onChange={handleChange}
                    className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
                  >
                    <option value="">Select an option...</option>
                    {HOW_HEARD_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Passwords */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                      className="pl-12"
                      placeholder="Min 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                    <Input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="pl-12"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="neon"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    'Creating Account...'
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-white/40">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-neon hover:text-neon-400">
                  Sign In
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-white/30">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-neon hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-neon hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
