'use client'

/**
 * Public Testimony Submission Page
 *
 * Form for submitting testimonies to be reviewed by admins.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Send, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ROLES = [
  { value: 'parent', label: 'Parent/Guardian' },
  { value: 'athlete', label: 'Athlete/Camper' },
  { value: 'coach', label: 'Coach/Director' },
  { value: 'cit', label: 'CIT/Volunteer' },
  { value: 'licensee', label: 'Licensee' },
  { value: 'other', label: 'Other' },
]

export default function SubmitTestimonyPage() {
  const [formData, setFormData] = useState({
    author_name: '',
    author_email: '',
    author_role: '',
    author_relationship: '',
    headline: '',
    body: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/testimonies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const { error } = await res.json()

      if (error) {
        setError(error)
        setIsSubmitting(false)
        return
      }

      setIsSubmitted(true)
    } catch (err) {
      console.error('Error submitting testimony:', err)
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-neon/10 border border-neon/30 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-neon" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white mb-4">
            Thank You!
          </h1>
          <p className="text-white/60 mb-8">
            Your testimony has been submitted for review. Once approved, it may appear
            on our testimonies page. We appreciate you sharing your experience with us!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/testimonies"
              className={buttonVariants({ variant: 'neon' })}
            >
              View Testimonies
            </Link>
            <Link
              href="/"
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-dark-100/50 border-b border-white/10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
          <Link
            href="/testimonies"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Testimonies</span>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Heart className="h-6 w-6 text-magenta" />
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">
              Share Your Story
            </h1>
          </div>
          <p className="text-white/60">
            Tell us about your experience with Empowered Sports Camp.
            Your story may be featured on our website to inspire others.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* About You */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              About You
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Your Name <span className="text-magenta">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.author_name}
                  onChange={(e) =>
                    setFormData({ ...formData, author_name: e.target.value })
                  }
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Email (optional)
                </label>
                <Input
                  type="email"
                  value={formData.author_email}
                  onChange={(e) =>
                    setFormData({ ...formData, author_email: e.target.value })
                  }
                  placeholder="jane@example.com"
                />
                <p className="text-xs text-white/40 mt-1">
                  We&apos;ll notify you when your testimony is published
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Your Role <span className="text-magenta">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, author_role: role.value })
                    }
                    className={cn(
                      'px-4 py-3 text-sm font-medium border transition-all text-left',
                      formData.author_role === role.value
                        ? 'bg-magenta/10 border-magenta/50 text-magenta'
                        : 'bg-dark-100 border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                    )}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Relationship (optional)
              </label>
              <Input
                type="text"
                value={formData.author_relationship}
                onChange={(e) =>
                  setFormData({ ...formData, author_relationship: e.target.value })
                }
                placeholder="e.g., Parent of 10-year-old camper"
              />
              <p className="text-xs text-white/40 mt-1">
                Add context like &ldquo;Parent of two campers&rdquo; or &ldquo;Coached for 3 seasons&rdquo;
              </p>
            </div>
          </div>

          {/* Your Story */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Your Story
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Headline (optional)
              </label>
              <Input
                type="text"
                value={formData.headline}
                onChange={(e) =>
                  setFormData({ ...formData, headline: e.target.value })
                }
                placeholder="e.g., My daughter found her confidence at camp"
                maxLength={120}
              />
              <p className="text-xs text-white/40 mt-1">
                A short summary of your experience (max 120 characters)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Your Testimony <span className="text-magenta">*</span>
              </label>
              <textarea
                value={formData.body}
                onChange={(e) =>
                  setFormData({ ...formData, body: e.target.value })
                }
                placeholder="Tell us about your experience with Empowered Sports Camp..."
                rows={8}
                required
                className="w-full bg-dark-100 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-magenta/50 focus:outline-none focus:ring-0 transition-colors resize-none"
              />
              <p className="text-xs text-white/40 mt-1">
                Share what made your experience special and how it impacted you or your family
              </p>
            </div>
          </div>

          {/* Consent notice */}
          <div className="p-4 bg-white/5 border border-white/10 text-sm text-white/60">
            <p>
              By submitting this form, you agree that your testimony may be reviewed and
              potentially published on our website. We may edit for length and clarity
              while preserving the essence of your message.
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/testimonies"
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !formData.author_name || !formData.author_role || !formData.body}
              className={cn(
                buttonVariants({ variant: 'magenta', size: 'lg' }),
                'inline-flex items-center gap-2',
                (isSubmitting || !formData.author_name || !formData.author_role || !formData.body) &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Testimony
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
