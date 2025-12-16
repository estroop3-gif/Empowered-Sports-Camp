'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Crown,
  User,
  Calendar,
  GraduationCap,
  Heart,
  AlertTriangle,
  Save,
  Loader2,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'

const SPORTS_OPTIONS = [
  'Soccer',
  'Basketball',
  'Volleyball',
  'Flag Football',
  'Lacrosse',
  'Tennis',
  'Softball',
  'Track & Field',
  'Swimming',
  'Gymnastics',
  'Dance',
  'Martial Arts',
  'Other',
]

const GRADE_OPTIONS = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade (Freshman)',
  '10th Grade (Sophomore)',
  '11th Grade (Junior)',
  '12th Grade (Senior)',
]

const TSHIRT_SIZES = [
  'YXS (Youth Extra Small)',
  'YS (Youth Small)',
  'YM (Youth Medium)',
  'YL (Youth Large)',
  'YXL (Youth Extra Large)',
  'AS (Adult Small)',
  'AM (Adult Medium)',
  'AL (Adult Large)',
  'AXL (Adult Extra Large)',
]

function AddAthleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromOnboarding = searchParams.get('from') === 'onboarding'
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'female', // Fixed: Females-only camp
    grade: '',
    schoolName: '',
    tshirtSize: '',
    preferredSports: [] as string[],
    allergies: '',
    medicalConditions: '',
    medications: '',
    dietaryRestrictions: '',
    specialNeeds: '',
    photoConsent: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
    setError(null)
  }

  const handleSportToggle = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      preferredSports: prev.preferredSports.includes(sport)
        ? prev.preferredSports.filter(s => s !== sport)
        : [...prev.preferredSports, sport]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      setError('Please fill in all required fields')
      setSaving(false)
      return
    }

    if (!user?.id) {
      setError('You must be logged in to add an athlete')
      setSaving(false)
      return
    }

    try {
      // Combine medical notes for the medical_notes field
      const medicalNotes = [
        formData.medicalConditions,
        formData.medications && `Medications: ${formData.medications}`,
        formData.dietaryRestrictions && `Dietary: ${formData.dietaryRestrictions}`,
        formData.specialNeeds && `Special needs: ${formData.specialNeeds}`,
      ]
        .filter(Boolean)
        .join('\n')

      // Insert athlete via API
      const res = await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          parent_id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender || undefined,
          grade: formData.grade || undefined,
          school: formData.schoolName || undefined,
          allergies: formData.allergies || undefined,
          medical_notes: medicalNotes || undefined,
        }),
      })

      const { data, error: insertError } = await res.json()

      if (insertError) {
        console.error('Error adding athlete:', insertError)
        setError(insertError)
        setSaving(false)
        return
      }

      // Redirect back
      if (fromOnboarding) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
      setSaving(false)
    }
  }

  const backUrl = fromOnboarding ? '/onboarding' : '/dashboard'

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {fromOnboarding ? 'Back to Onboarding' : 'Back to Dashboard'}
        </Link>

        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 bg-magenta/10 border border-magenta/30 flex items-center justify-center">
            <Crown className="h-7 w-7 text-magenta" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">
              Add New Athlete
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Enter your child&apos;s information to get them ready for camp
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-neon/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-neon" />
                  Basic Information
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      First Name *
                    </label>
                    <Input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      placeholder="Emma"
                    />
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

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date of Birth *
                    </label>
                    <Input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      Sex
                    </label>
                    <div className="w-full bg-black/50 border border-white/10 text-white/70 px-4 py-3 cursor-not-allowed">
                      Female (Females-Only Camp)
                    </div>
                    <p className="mt-2 text-xs text-magenta/80 flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Empowered Athletes is a girls-only sports camp
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      <GraduationCap className="h-4 w-4 inline mr-1" />
                      Current Grade
                    </label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleChange}
                      className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
                    >
                      <option value="">Select grade...</option>
                      {GRADE_OPTIONS.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      School Name
                    </label>
                    <Input
                      type="text"
                      name="schoolName"
                      value={formData.schoolName}
                      onChange={handleChange}
                      placeholder="Lincoln Elementary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    T-Shirt Size
                  </label>
                  <select
                    name="tshirtSize"
                    value={formData.tshirtSize}
                    onChange={handleChange}
                    className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-neon focus:outline-none"
                  >
                    <option value="">Select size...</option>
                    {TSHIRT_SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Preferred Sports */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-purple/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple" />
                  Preferred Sports
                </h2>
                <p className="text-xs text-white/40 mt-1">Select all sports your athlete is interested in</p>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {SPORTS_OPTIONS.map(sport => (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => handleSportToggle(sport)}
                      className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border transition-all ${
                        formData.preferredSports.includes(sport)
                          ? 'bg-purple/20 border-purple text-purple'
                          : 'bg-transparent border-white/20 text-white/60 hover:border-purple/50 hover:text-purple/80'
                      }`}
                    >
                      {sport}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-dark-100 border border-white/10">
              <div className="px-6 py-4 border-b border-magenta/30">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <Heart className="h-4 w-4 text-magenta" />
                  Medical Information
                </h2>
                <p className="text-xs text-white/40 mt-1">This helps us ensure your athlete&apos;s safety</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Allergies
                  </label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-magenta focus:outline-none placeholder:text-white/30"
                    placeholder="List any food, environmental, or medication allergies..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Medical Conditions
                  </label>
                  <textarea
                    name="medicalConditions"
                    value={formData.medicalConditions}
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-magenta focus:outline-none placeholder:text-white/30"
                    placeholder="Asthma, diabetes, seizures, etc..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Current Medications
                  </label>
                  <textarea
                    name="medications"
                    value={formData.medications}
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-magenta focus:outline-none placeholder:text-white/30"
                    placeholder="List any medications and dosages..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Dietary Restrictions
                  </label>
                  <Input
                    type="text"
                    name="dietaryRestrictions"
                    value={formData.dietaryRestrictions}
                    onChange={handleChange}
                    placeholder="Vegetarian, gluten-free, kosher, halal, etc."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Special Needs or Accommodations
                  </label>
                  <textarea
                    name="specialNeeds"
                    value={formData.specialNeeds}
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-black border border-white/20 text-white px-4 py-3 focus:border-magenta focus:outline-none placeholder:text-white/30"
                    placeholder="Any learning differences, physical accommodations, or other needs we should know about..."
                  />
                </div>
              </div>
            </div>

            {/* Photo Consent */}
            <div className="bg-dark-100 border border-white/10 p-6">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  name="photoConsent"
                  checked={formData.photoConsent}
                  onChange={handleChange}
                  className="mt-1 h-5 w-5 bg-black border-2 border-white/30 focus:ring-neon focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm font-bold text-white">Photo & Media Consent</span>
                  <p className="text-xs text-white/50 mt-1">
                    I consent to photos and videos of my child being taken during camp activities
                    and potentially used for marketing purposes on social media, the website, and
                    promotional materials.
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Link href={backUrl}>
                <Button variant="outline-neon" size="lg" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="neon"
                size="lg"
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Athlete
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

export default function AddAthletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    }>
      <AddAthleteContent />
    </Suspense>
  )
}
