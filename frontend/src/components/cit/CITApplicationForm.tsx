'use client'

/**
 * CIT Application Form Component
 *
 * Comprehensive application form for the Coaches-In-Training program.
 * Updated to work with database-backed API.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Send, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

interface FormData {
  // Applicant Info
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  state: string

  // School Info
  schoolName: string
  gradeLevel: string
  graduationYear: string

  // Sports Experience
  sportsPlayed: string
  experienceSummary: string

  // Parent/Guardian Info
  parentName: string
  parentEmail: string
  parentPhone: string

  // Availability
  availabilityNotes: string

  // Essays
  whyCit: string
  leadershipExperience: string

  // Additional
  howHeard: string
}

interface FormErrors {
  [key: string]: string | undefined
}

const gradeOptions = [
  { value: '', label: 'Select grade level...' },
  { value: '9', label: '9th Grade (Freshman)' },
  { value: '10', label: '10th Grade (Sophomore)' },
  { value: '11', label: '11th Grade (Junior)' },
  { value: '12', label: '12th Grade (Senior)' },
]

const stateOptions = [
  { value: '', label: 'Select state...' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

const howHeardOptions = [
  { value: '', label: 'How did you hear about us?' },
  { value: 'attended-camp', label: 'I attended camp as a camper' },
  { value: 'friend', label: 'Friend or family member' },
  { value: 'school', label: 'School announcement' },
  { value: 'social-media', label: 'Social media' },
  { value: 'website', label: 'Website search' },
  { value: 'coach', label: 'Coach or trainer' },
  { value: 'other', label: 'Other' },
]

export default function CITApplicationForm() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    schoolName: '',
    gradeLevel: '',
    graduationYear: '',
    sportsPlayed: '',
    experienceSummary: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    availabilityNotes: '',
    whyCit: '',
    leadershipExperience: '',
    howHeard: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<FormStatus>('idle')

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Required applicant fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'

    // Required school fields
    if (!formData.schoolName.trim()) newErrors.schoolName = 'School name is required'
    if (!formData.gradeLevel) newErrors.gradeLevel = 'Grade level is required'

    // Required sports experience
    if (!formData.sportsPlayed.trim()) newErrors.sportsPlayed = 'Sports experience is required'

    // Required parent fields
    if (!formData.parentName.trim()) newErrors.parentName = 'Parent/guardian name is required'
    if (!formData.parentEmail.trim()) {
      newErrors.parentEmail = 'Parent/guardian email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      newErrors.parentEmail = 'Please enter a valid email address'
    }
    if (!formData.parentPhone.trim()) newErrors.parentPhone = 'Parent/guardian phone is required'

    // Required essays
    if (!formData.whyCit.trim()) {
      newErrors.whyCit = 'Please tell us why you want to be a CIT'
    } else if (formData.whyCit.trim().length < 50) {
      newErrors.whyCit = 'Please provide a more detailed response (at least 50 characters)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.text-red-400')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setStatus('submitting')

    try {
      const response = await fetch('/api/cit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to submit application')
      }

      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <section className="relative py-16 lg:py-20">
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="bg-dark-100/50 border border-magenta/30 p-8 lg:p-12 text-center">
            <CheckCircle className="h-16 w-16 text-magenta mx-auto mb-6" />
            <h2 className="headline-display text-2xl text-white mb-4">
              Application Submitted!
            </h2>
            <p className="text-white/70 mb-4">
              Thank you for applying to become a Coach-In-Training at Empowered Athletes.
            </p>
            <p className="text-white/60 text-sm mb-8">
              We'll review your application and reach out to you and your parent/guardian
              within 5-7 business days with next steps. Keep an eye on your inbox!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/programs/cit-program">
                <Button variant="outline-neon">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to CIT Program
                </Button>
              </Link>
              <Link href="/programs">
                <Button variant="ghost">
                  View All Programs
                </Button>
              </Link>
            </div>
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
        {/* Back link */}
        <Link
          href="/programs/cit-program"
          className="inline-flex items-center gap-2 text-white/60 hover:text-magenta transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to CIT Program</span>
        </Link>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Error banner */}
          {status === 'error' && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">
                Something went wrong submitting your application. Please try again or
                email us at info@empoweredsportscamp.com.
              </p>
            </div>
          )}

          {/* Section: Applicant Information */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Your Information</h3>
            <p className="text-white/50 text-sm mb-6">Tell us about yourself.</p>

            <div className="space-y-6">
              {/* Name row */}
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
                    placeholder="Your first name"
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
                    placeholder="Your last name"
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-400">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email & Phone row */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                    Your Email <span className="text-magenta">*</span>
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

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-2">
                    Your Phone <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-400">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* City & State row */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-white/80 mb-2">
                    City
                  </label>
                  <Input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Your city"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-white/80 mb-2">
                    State
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full h-10 px-3 bg-dark-100 border border-white/20 text-white focus:border-magenta focus:outline-none focus:ring-1 focus:ring-magenta transition-colors"
                  >
                    {stateOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-dark-100">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Section: School Information */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">School Information</h3>
            <p className="text-white/50 text-sm mb-6">Where do you go to school?</p>

            <div className="space-y-6">
              {/* School name */}
              <div>
                <label htmlFor="schoolName" className="block text-sm font-medium text-white/80 mb-2">
                  School Name <span className="text-magenta">*</span>
                </label>
                <Input
                  id="schoolName"
                  name="schoolName"
                  type="text"
                  value={formData.schoolName}
                  onChange={handleChange}
                  placeholder="Your high school name"
                  className={errors.schoolName ? 'border-red-500' : ''}
                />
                {errors.schoolName && (
                  <p className="mt-1 text-xs text-red-400">{errors.schoolName}</p>
                )}
              </div>

              {/* Grade & Graduation row */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="gradeLevel" className="block text-sm font-medium text-white/80 mb-2">
                    Current Grade Level <span className="text-magenta">*</span>
                  </label>
                  <select
                    id="gradeLevel"
                    name="gradeLevel"
                    value={formData.gradeLevel}
                    onChange={handleChange}
                    className={`w-full h-10 px-3 bg-dark-100 border ${
                      errors.gradeLevel ? 'border-red-500' : 'border-white/20'
                    } text-white focus:border-magenta focus:outline-none focus:ring-1 focus:ring-magenta transition-colors`}
                  >
                    {gradeOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-dark-100">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.gradeLevel && (
                    <p className="mt-1 text-xs text-red-400">{errors.gradeLevel}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="graduationYear" className="block text-sm font-medium text-white/80 mb-2">
                    Expected Graduation Year
                  </label>
                  <Input
                    id="graduationYear"
                    name="graduationYear"
                    type="text"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    placeholder="e.g., 2026"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Section: Sports Experience */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Sports Experience</h3>
            <p className="text-white/50 text-sm mb-6">Tell us about your athletic background.</p>

            <div className="space-y-6">
              {/* Sports played */}
              <div>
                <label htmlFor="sportsPlayed" className="block text-sm font-medium text-white/80 mb-2">
                  What sports do you play or have played? <span className="text-magenta">*</span>
                </label>
                <Input
                  id="sportsPlayed"
                  name="sportsPlayed"
                  type="text"
                  value={formData.sportsPlayed}
                  onChange={handleChange}
                  placeholder="e.g., Soccer, Basketball, Volleyball"
                  className={errors.sportsPlayed ? 'border-red-500' : ''}
                />
                {errors.sportsPlayed && (
                  <p className="mt-1 text-xs text-red-400">{errors.sportsPlayed}</p>
                )}
              </div>

              {/* Experience summary */}
              <div>
                <label htmlFor="experienceSummary" className="block text-sm font-medium text-white/80 mb-2">
                  Tell us more about your sports experience
                </label>
                <textarea
                  id="experienceSummary"
                  name="experienceSummary"
                  rows={3}
                  value={formData.experienceSummary}
                  onChange={handleChange}
                  placeholder="How long have you played? Current teams, leagues, or clubs? Any achievements or positions?"
                  className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-magenta focus:outline-none focus:ring-1 focus:ring-magenta transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Section: Parent/Guardian Information */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Parent/Guardian Information</h3>
            <p className="text-white/50 text-sm mb-6">
              We'll contact your parent/guardian regarding your application.
            </p>

            <div className="space-y-6">
              {/* Parent name */}
              <div>
                <label htmlFor="parentName" className="block text-sm font-medium text-white/80 mb-2">
                  Parent/Guardian Full Name <span className="text-magenta">*</span>
                </label>
                <Input
                  id="parentName"
                  name="parentName"
                  type="text"
                  value={formData.parentName}
                  onChange={handleChange}
                  placeholder="Parent or guardian name"
                  className={errors.parentName ? 'border-red-500' : ''}
                />
                {errors.parentName && (
                  <p className="mt-1 text-xs text-red-400">{errors.parentName}</p>
                )}
              </div>

              {/* Parent email & phone row */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="parentEmail" className="block text-sm font-medium text-white/80 mb-2">
                    Parent/Guardian Email <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="parentEmail"
                    name="parentEmail"
                    type="email"
                    value={formData.parentEmail}
                    onChange={handleChange}
                    placeholder="parent@example.com"
                    className={errors.parentEmail ? 'border-red-500' : ''}
                  />
                  {errors.parentEmail && (
                    <p className="mt-1 text-xs text-red-400">{errors.parentEmail}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="parentPhone" className="block text-sm font-medium text-white/80 mb-2">
                    Parent/Guardian Phone <span className="text-magenta">*</span>
                  </label>
                  <Input
                    id="parentPhone"
                    name="parentPhone"
                    type="tel"
                    value={formData.parentPhone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    className={errors.parentPhone ? 'border-red-500' : ''}
                  />
                  {errors.parentPhone && (
                    <p className="mt-1 text-xs text-red-400">{errors.parentPhone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Section: Availability */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Availability</h3>
            <p className="text-white/50 text-sm mb-6">When can you participate as a CIT?</p>

            <div>
              <label htmlFor="availabilityNotes" className="block text-sm font-medium text-white/80 mb-2">
                Describe your availability
              </label>
              <textarea
                id="availabilityNotes"
                name="availabilityNotes"
                rows={3}
                value={formData.availabilityNotes}
                onChange={handleChange}
                placeholder="e.g., Available all summer, weekdays only in June, weekends in July, etc."
                className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-magenta focus:outline-none focus:ring-1 focus:ring-magenta transition-colors resize-none"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Section: Essays */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Tell Us About Yourself</h3>
            <p className="text-white/50 text-sm mb-6">Help us get to know you better.</p>

            <div className="space-y-6">
              {/* Why CIT */}
              <div>
                <label htmlFor="whyCit" className="block text-sm font-medium text-white/80 mb-2">
                  Why do you want to be a Coach-In-Training? <span className="text-magenta">*</span>
                </label>
                <textarea
                  id="whyCit"
                  name="whyCit"
                  rows={4}
                  value={formData.whyCit}
                  onChange={handleChange}
                  placeholder="Tell us what draws you to this program and what you hope to gain from the experience..."
                  className={`w-full px-3 py-2 bg-dark-100 border ${
                    errors.whyCit ? 'border-red-500' : 'border-white/20'
                  } text-white placeholder:text-white/40 focus:border-magenta focus:outline-none focus:ring-1 focus:ring-magenta transition-colors resize-none`}
                />
                {errors.whyCit && (
                  <p className="mt-1 text-xs text-red-400">{errors.whyCit}</p>
                )}
              </div>

              {/* Leadership experience */}
              <div>
                <label htmlFor="leadershipExperience" className="block text-sm font-medium text-white/80 mb-2">
                  Describe any leadership experience you have
                  <span className="text-white/50 font-normal ml-2">(sports, school, community)</span>
                </label>
                <textarea
                  id="leadershipExperience"
                  name="leadershipExperience"
                  rows={3}
                  value={formData.leadershipExperience}
                  onChange={handleChange}
                  placeholder="Team captain, club president, volunteer work, mentoring, etc..."
                  className="w-full px-3 py-2 bg-dark-100 border border-white/20 text-white placeholder:text-white/40 focus:border-magenta focus:outline-none focus:ring-1 focus:ring-magenta transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Section: Additional Info */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Additional Information</h3>
            <p className="text-white/50 text-sm mb-6">Just one more question!</p>

            <div className="md:w-1/2">
              <label htmlFor="howHeard" className="block text-sm font-medium text-white/80 mb-2">
                How did you hear about the CIT Program?
              </label>
              <select
                id="howHeard"
                name="howHeard"
                value={formData.howHeard}
                onChange={handleChange}
                className="w-full h-10 px-3 bg-dark-100 border border-white/20 text-white focus:border-magenta focus:outline-none focus:ring-1 focus:ring-magenta transition-colors"
              >
                {howHeardOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-dark-100">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="magenta"
              size="lg"
              className="w-full md:w-auto"
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
            <p className="mt-4 text-xs text-white/40">
              By submitting this application, you confirm that all information provided is accurate
              and that your parent/guardian is aware of your application.
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
