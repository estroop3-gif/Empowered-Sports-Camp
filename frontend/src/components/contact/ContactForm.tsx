'use client'

/**
 * Contact Form Component
 *
 * Multi-field contact form with validation and API submission.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Send, CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

interface FormData {
  name: string
  email: string
  phone: string
  inquiryType: string
  athleteInfo: string
  organization: string
  location: string
  message: string
}

const inquiryTypes = [
  { value: '', label: 'Select an inquiry type...' },
  { value: 'registration', label: 'Camp Registration' },
  { value: 'host', label: 'Host a Camp / Become a Licensee →' },
  { value: 'partnership', label: 'Partnership Opportunity' },
  { value: 'coaching', label: 'Coaching Position' },
  { value: 'general', label: 'General Question' },
]

export default function ContactForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    inquiryType: '',
    athleteInfo: '',
    organization: '',
    location: '',
    message: '',
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [status, setStatus] = useState<FormStatus>('idle')

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.inquiryType) {
      newErrors.inquiryType = 'Please select an inquiry type'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    // Redirect to host-a-camp page if they select that inquiry type
    if (name === 'inquiryType' && value === 'host') {
      router.push('/host-a-camp')
      return
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setStatus('submitting')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to submit form')
      }

      setStatus('success')
      setFormData({
        name: '',
        email: '',
        phone: '',
        inquiryType: '',
        athleteInfo: '',
        organization: '',
        location: '',
        message: '',
      })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <section className="relative py-16 lg:py-20">
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="bg-dark-100/50 border border-neon/30 p-8 lg:p-12 text-center">
            <CheckCircle className="h-16 w-16 text-neon mx-auto mb-6" />
            <h2 className="headline-display text-2xl text-white mb-4">
              Message Sent!
            </h2>
            <p className="text-white/70 mb-8">
              Thank you for reaching out. We'll get back to you within 24-48 hours.
            </p>
            <Button
              variant="outline-neon"
              onClick={() => setStatus('idle')}
            >
              Send Another Message
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative py-16 lg:py-20">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error banner */}
          {status === 'error' && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">
                Something went wrong. Please try again or email us directly.
              </p>
            </div>
          )}

          {/* Name & Email row */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-2">
                Full Name <span className="text-magenta">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-400">{errors.name}</p>
              )}
            </div>

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
                placeholder="you@example.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Phone & Inquiry Type row */}
          <div className="grid gap-6 md:grid-cols-2">
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

            <div>
              <label htmlFor="inquiryType" className="block text-sm font-medium text-white/80 mb-2">
                Inquiry Type <span className="text-magenta">*</span>
              </label>
              <select
                id="inquiryType"
                name="inquiryType"
                value={formData.inquiryType}
                onChange={handleChange}
                className={`w-full h-10 px-3 bg-dark-100 border ${
                  errors.inquiryType ? 'border-red-500' : 'border-white/20'
                } text-white focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors`}
              >
                {inquiryTypes.map((type) => (
                  <option key={type.value} value={type.value} className="bg-dark-100">
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.inquiryType && (
                <p className="mt-1 text-xs text-red-400">{errors.inquiryType}</p>
              )}
            </div>
          </div>

          {/* Athlete Info */}
          <div>
            <label htmlFor="athleteInfo" className="block text-sm font-medium text-white/80 mb-2">
              Athlete Info
              <span className="text-white/50 font-normal ml-2">(Name, age, sport)</span>
            </label>
            <Input
              id="athleteInfo"
              name="athleteInfo"
              type="text"
              value={formData.athleteInfo}
              onChange={handleChange}
              placeholder="e.g., Sarah, 10, Soccer"
            />
          </div>

          {/* Organization & Location row */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-white/80 mb-2">
                Organization
                <span className="text-white/50 font-normal ml-2">(if applicable)</span>
              </label>
              <Input
                id="organization"
                name="organization"
                type="text"
                value={formData.organization}
                onChange={handleChange}
                placeholder="Club, school, facility name"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-white/80 mb-2">
                Location
              </label>
              <Input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                placeholder="City, State"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-white/80 mb-2">
              Message <span className="text-magenta">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us how we can help..."
              className={`w-full px-3 py-2 bg-dark-100 border ${
                errors.message ? 'border-red-500' : 'border-white/20'
              } text-white placeholder:text-white/40 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors resize-none`}
            />
            {errors.message && (
              <p className="mt-1 text-xs text-red-400">{errors.message}</p>
            )}
          </div>

          {/* Submit button */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="neon"
              size="lg"
              className="w-full md:w-auto"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
