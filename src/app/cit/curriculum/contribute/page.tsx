'use client'

/**
 * CIT Contribution Page
 *
 * Allows CITs to submit training ideas and curriculum contributions.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import {
  Loader2,
  ArrowLeft,
  Lightbulb,
  CheckCircle,
} from 'lucide-react'

export default function CitContributePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/empoweru/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          portalType: 'SKILL_STATION',
          videoUrl: formData.videoUrl || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit contribution')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <LmsGate featureName="contributions">
        <div>
          <PortalPageHeader
            title="Contribution Submitted"
            description="Thank you for sharing your ideas!"
          />
          <PortalCard accent="neon">
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-neon mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                Your training idea has been submitted for review. Our team will
                review it and let you know if it gets approved for the curriculum
                library.
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/cit/curriculum"
                  className="px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
                >
                  Back to Curriculum
                </Link>
                <button
                  onClick={() => {
                    setSuccess(false)
                    setFormData({ title: '', description: '', videoUrl: '' })
                  }}
                  className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
                >
                  Submit Another
                </button>
              </div>
            </div>
          </PortalCard>
        </div>
      </LmsGate>
    )
  }

  return (
    <LmsGate featureName="contributions">
      <div>
        <PortalPageHeader
          title="Contribute Training Idea"
          description="Share drills, warm-ups, or station tips with the team"
          actions={
            <Link
              href="/cit/curriculum"
              className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <PortalCard accent="neon">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g., Dynamic Dribbling Drill"
                    className="w-full px-4 py-3 bg-black border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-neon"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe the drill, warm-up, or activity. Include setup, execution, and any variations..."
                    rows={6}
                    className="w-full px-4 py-3 bg-black border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-neon resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">
                    Video URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, videoUrl: e.target.value }))
                    }
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-4 py-3 bg-black border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-neon"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    YouTube or Vimeo links are supported
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-5 w-5" />
                      Submit Contribution
                    </>
                  )}
                </button>
              </form>
            </PortalCard>
          </div>

          {/* Tips */}
          <div>
            <PortalCard title="Tips for Great Contributions">
              <div className="space-y-4 text-sm text-white/60">
                <div>
                  <h4 className="font-bold text-white mb-1">Be Specific</h4>
                  <p>
                    Include clear setup instructions, step-by-step execution, and
                    equipment needed.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-white mb-1">Think Safety</h4>
                  <p>
                    Note any safety considerations or modifications for different
                    skill levels.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-white mb-1">Add Variations</h4>
                  <p>
                    Include ways to make the activity easier or harder for different
                    ages and abilities.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-white mb-1">Keep It Fun</h4>
                  <p>
                    Remember our camps are all about positive energy and having fun
                    while learning!
                  </p>
                </div>
              </div>
            </PortalCard>

            <PortalCard className="mt-4 bg-purple/5 border-purple/20">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-purple flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">What happens next?</h4>
                  <p className="text-sm text-white/50">
                    Your submission will be reviewed by our curriculum team. If
                    approved, it may be added to the Skill Station curriculum and
                    shared with camps across the country!
                  </p>
                </div>
              </div>
            </PortalCard>
          </div>
        </div>
      </div>
    </LmsGate>
  )
}
