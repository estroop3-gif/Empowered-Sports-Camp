'use client'

/**
 * Check-In Success Page
 *
 * Shown after successful check-in.
 * Displays confirmation and link to pickup codes.
 *
 * STATUS: Coming Soon - Part of the check-in kiosk feature.
 */

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { redirect } from 'next/navigation'

// Feature flag - must match the one in the main check-in page
const FEATURE_CHECKIN_KIOSK_ENABLED = false

export default function CheckInSuccessPage() {
  // Redirect to coming soon page if feature is disabled
  if (!FEATURE_CHECKIN_KIOSK_ENABLED) {
    redirect('/camp-checkin')
  }

  const searchParams = useSearchParams()
  const count = searchParams.get('count') || '1'
  const campId = searchParams.get('campId')

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check-In Complete!</h1>

        <p className="text-gray-600 mb-6">
          {count === '1'
            ? 'Your athlete has been checked in successfully.'
            : `${count} athletes have been checked in successfully.`}
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Important:</strong> You&apos;ll need a pickup code to pick up your athlete(s) at the end of camp.
          </p>
          <p className="text-sm text-gray-500">
            Pickup codes will be available when dismissal begins.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/portal/pickup"
            className="block w-full py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            View Pickup Codes
          </Link>

          <Link
            href="/dashboard"
            className="block w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        {campId && (
          <p className="text-xs text-gray-400 mt-6">
            Camp ID: {campId}
          </p>
        )}
      </div>
    </div>
  )
}
