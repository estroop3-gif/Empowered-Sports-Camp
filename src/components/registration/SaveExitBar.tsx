'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCheckout } from '@/lib/checkout/context'
import type { CampSession } from '@/types/registration'

interface SaveExitBarProps {
  camp: CampSession
}

export function SaveExitBar({ camp }: SaveExitBarProps) {
  const router = useRouter()
  const { state, totals } = useCheckout()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only show after the camp step and before confirmation
  const hiddenSteps = ['camp', 'confirmation', 'waitlist-confirm']
  if (hiddenSteps.includes(state.step)) return null

  // Need parent email to save
  const parentEmail = state.parentInfo.email?.trim()

  const handleSaveExit = async () => {
    if (!parentEmail) {
      setError('Please enter your email in the parent info section first.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/registration-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          parentEmail,
          parentName: `${state.parentInfo.firstName} ${state.parentInfo.lastName}`.trim() || null,
          campId: camp.id,
          campName: camp.name,
          campSlug: camp.slug,
          tenantId: camp.tenantId || null,
          checkoutState: state,
          currentStep: state.step,
          camperCount: state.campers.length,
          totalEstimate: totals.total > 0 ? totals.total / 100 : null,
        }),
      })

      const result = await res.json()

      if (!res.ok || result.error) {
        throw new Error(result.error || 'Failed to save')
      }

      // Redirect to saved confirmation page
      router.push(`/register/saved?email=${encodeURIComponent(parentEmail)}&camp=${encodeURIComponent(camp.name)}`)
    } catch (err) {
      console.error('[SaveExit] Failed to save draft:', err)
      setError('Failed to save your progress. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-dark-100/95 backdrop-blur-sm border-t border-white/10">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-xs text-white/50 hidden sm:block">
          Need to finish later? Save your progress and come back anytime.
        </p>
        <div className="flex items-center gap-3 ml-auto">
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          <Button
            variant="outline-white"
            size="sm"
            onClick={handleSaveExit}
            disabled={saving}
            className="whitespace-nowrap"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save & Exit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
