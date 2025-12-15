'use client'

/**
 * Host a Camp / Licensee Application Page
 *
 * Public-facing application form for prospective licensees/franchisees.
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Briefcase,
  Users,
  Trophy,
  DollarSign,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName: string
  website: string
  city: string
  state: string
  territoryInterest: string
  businessExperience: string
  sportsBackground: string
  whyInterested: string
  investmentCapacity: string
  howHeard: string
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

const HOW_HEARD_OPTIONS = [
  '',
  'Google search',
  'Social media',
  'Friend or referral',
  'Attended a camp',
  'News or press',
  'Industry event',
  'Other',
]

const INVESTMENT_OPTIONS = [
  '',
  'Under $25,000',
  '$25,000 - $50,000',
  '$50,000 - $100,000',
  '$100,000 - $250,000',
  'Over $250,000',
]

export default function HostACampPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    website: '',
    city: '',
    state: '',
    territoryInterest: '',
    businessExperience: '',
    sportsBackground: '',
    whyInterested: '',
    investmentCapacity: '',
    howHeard: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!formData.state) {
      newErrors.state = 'State is required'
    }

    if (!formData.territoryInterest.trim()) {
      newErrors.territoryInterest = 'Please describe your territory interest'
    }

    if (!formData.whyInterested.trim()) {
      newErrors.whyInterested = 'Please tell us why you are interested'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/applications/host-a-camp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          company_name: formData.companyName || undefined,
          website: formData.website || undefined,
          city: formData.city,
          state: formData.state,
          territory_interest: formData.territoryInterest,
          business_experience: formData.businessExperience || undefined,
          sports_background: formData.sportsBackground || undefined,
          why_interested: formData.whyInterested,
          investment_capacity: formData.investmentCapacity || undefined,
          how_heard: formData.howHeard || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application')
      }

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (status === 'success') {
    return (
      <main className="min-h-screen bg-black">
        {/* Hero section with success message */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neon/10 via-purple/5 to-magenta/10" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute top-20 -left-40 w-[400px] h-[400px] bg-neon/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-magenta/10 rounded-full blur-[120px]" />

          <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <div className="bg-dark-100/50 border border-neon/30 p-8 lg:p-12 text-center">
              <CheckCircle className="h-16 w-16 text-neon mx-auto mb-6" />
              <h1 className="headline-display text-2xl lg:text-3xl text-white mb-4">
                Application Submitted!
              </h1>
              <p className="text-lg text-white/70 mb-8">
                Thank you for your interest in becoming an Empowered Athletes licensee.
                Our team will review your application and reach out within 3-5 business days.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button variant="outline-neon">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="ghost" className="text-white/60 hover:text-white">
                    Have Questions? Contact Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon/10 via-purple/5 to-magenta/10" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute top-20 -left-40 w-[400px] h-[400px] bg-neon/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-magenta/10 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon/10 border border-neon/30 mb-6">
              <Building2 className="h-4 w-4 text-neon" />
              <span className="text-xs font-bold uppercase tracking-widest text-neon">
                Become a Licensee
              </span>
            </div>

            {/* Headline */}
            <h1 className="headline-display headline-lg text-white mb-6">
              Host an <span className="text-neon">Empowered</span> Camp
            </h1>

            {/* Description */}
            <p className="text-xl text-white/70 leading-relaxed">
              Join our network of passionate sports entrepreneurs and bring world-class
              athletic training to your community. We're looking for driven individuals
              ready to make an impact.
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent" />
      </section>

      {/* Benefits Section */}
      <section className="relative py-12 lg:py-16">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Trophy,
                title: 'Proven Model',
                description: 'Access our battle-tested curriculum and operations playbook',
              },
              {
                icon: Users,
                title: 'Training & Support',
                description: 'Comprehensive onboarding with ongoing coaching support',
              },
              {
                icon: Briefcase,
                title: 'Marketing Tools',
                description: 'Professional marketing assets and lead generation',
              },
              {
                icon: DollarSign,
                title: 'Growth Potential',
                description: 'Scalable business model with multiple revenue streams',
              },
            ].map((benefit) => (
              <div
                key={benefit.title}
                className="bg-dark-100/50 border border-white/10 p-6 hover:border-neon/30 transition-colors"
              >
                <benefit.icon className="h-8 w-8 text-neon mb-4" />
                <h3 className="text-white font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-white/60">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form Section */}
      <section className="relative py-16 lg:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="headline-display text-xl text-white mb-4">
              Start Your Application
            </h2>
            <p className="text-white/60">
              Fill out the form below and our team will be in touch to discuss the opportunity.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error banner */}
            {status === 'error' && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">
                  {errorMessage || 'Something went wrong. Please try again.'}
                </p>
              </div>
            )}

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neon border-b border-white/10 pb-2">
                Contact Information
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-white/80 mb-2">
                    First Name <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-white/80 mb-2">
                    Last Name <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Smith"
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-400">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                    Email Address <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-2">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neon border-b border-white/10 pb-2">
                Business Information
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-white/80 mb-2">
                    Company Name <span className="text-white/50 font-normal">(if applicable)</span>
                  </label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Your company"
                  />
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-white/80 mb-2">
                    Website
                  </label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neon border-b border-white/10 pb-2">
                <MapPin className="h-4 w-4 inline mr-2" />
                Location & Territory
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-white/80 mb-2">
                    City <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Your city"
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && (
                    <p className="mt-1 text-xs text-red-400">{errors.city}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-white/80 mb-2">
                    State <span className="text-magenta">*</span>
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={`w-full h-10 px-3 bg-dark-100 border ${
                      errors.state ? 'border-red-500' : 'border-white/20'
                    } text-white focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors`}
                  >
                    <option value="" className="bg-dark-100">Select state...</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state} className="bg-dark-100">
                        {state}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
                    <p className="mt-1 text-xs text-red-400">{errors.state}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="territoryInterest" className="block text-sm font-medium text-white/80 mb-2">
                  Territory Interest <span className="text-magenta">*</span>
                  <span className="text-white/50 font-normal ml-2">(cities/areas you'd like to serve)</span>
                </label>
                <textarea
                  id="territoryInterest"
                  name="territoryInterest"
                  rows={3}
                  value={formData.territoryInterest}
                  onChange={handleChange}
                  placeholder="Describe the geographic area(s) you're interested in serving..."
                  className={`w-full px-3 py-2 bg-dark-100 border ${
                    errors.territoryInterest ? 'border-red-500' : 'border-white/20'
                  } text-white placeholder:text-white/40 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors resize-none`}
                />
                {errors.territoryInterest && (
                  <p className="mt-1 text-xs text-red-400">{errors.territoryInterest}</p>
                )}
              </div>
            </div>

            {/* Background Information */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neon border-b border-white/10 pb-2">
                Your Background
              </h3>

              <div>
                <label htmlFor="businessExperience" className="block text-sm font-medium text-white/80 mb-2">
                  Business Experience
                </label>
                <textarea
                  id="businessExperience"
                  name="businessExperience"
                  rows={3}
                  value={formData.businessExperience}
                  onChange={handleChange}
                  placeholder="Tell us about your business background, entrepreneurial experience, or relevant management roles..."
                  className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors resize-none"
                />
              </div>

              <div>
                <label htmlFor="sportsBackground" className="block text-sm font-medium text-white/80 mb-2">
                  Sports Background
                </label>
                <textarea
                  id="sportsBackground"
                  name="sportsBackground"
                  rows={3}
                  value={formData.sportsBackground}
                  onChange={handleChange}
                  placeholder="Share your experience with youth sports, coaching, athletics, or related activities..."
                  className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors resize-none"
                />
              </div>

              <div>
                <label htmlFor="whyInterested" className="block text-sm font-medium text-white/80 mb-2">
                  Why Are You Interested? <span className="text-magenta">*</span>
                </label>
                <textarea
                  id="whyInterested"
                  name="whyInterested"
                  rows={4}
                  value={formData.whyInterested}
                  onChange={handleChange}
                  placeholder="Tell us why you want to become an Empowered Athletes licensee and what excites you about this opportunity..."
                  className={`w-full px-3 py-2 bg-dark-100 border ${
                    errors.whyInterested ? 'border-red-500' : 'border-white/20'
                  } text-white placeholder:text-white/40 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors resize-none`}
                />
                {errors.whyInterested && (
                  <p className="mt-1 text-xs text-red-400">{errors.whyInterested}</p>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neon border-b border-white/10 pb-2">
                Additional Information
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="investmentCapacity" className="block text-sm font-medium text-white/80 mb-2">
                    Investment Capacity
                  </label>
                  <select
                    id="investmentCapacity"
                    name="investmentCapacity"
                    value={formData.investmentCapacity}
                    onChange={handleChange}
                    className="w-full h-10 px-3 bg-dark-100 border border-white/20 text-white focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors"
                  >
                    {INVESTMENT_OPTIONS.map((option) => (
                      <option key={option || 'empty'} value={option} className="bg-dark-100">
                        {option || 'Select range...'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="howHeard" className="block text-sm font-medium text-white/80 mb-2">
                    How Did You Hear About Us?
                  </label>
                  <select
                    id="howHeard"
                    name="howHeard"
                    value={formData.howHeard}
                    onChange={handleChange}
                    className="w-full h-10 px-3 bg-dark-100 border border-white/20 text-white focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors"
                  >
                    {HOW_HEARD_OPTIONS.map((option) => (
                      <option key={option || 'empty'} value={option} className="bg-dark-100">
                        {option || 'Select...'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-6">
              <Button
                type="submit"
                variant="neon"
                size="lg"
                className="w-full"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
              <p className="text-xs text-white/40 text-center mt-4">
                By submitting this form, you agree to be contacted by our team regarding
                licensee opportunities.
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
