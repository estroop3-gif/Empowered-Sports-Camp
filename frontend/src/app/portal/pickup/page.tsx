'use client'

/**
 * Parent Pickup Codes Page
 *
 * Shows pickup QR codes for checked-in athletes.
 * Staff scans these codes to verify pickup authorization.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

interface PickupToken {
  id: string
  token: string
  athlete: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
  }
  camp: {
    id: string
    name: string
  }
  camp_day: {
    id: string
    date: string
    day_number: number
  }
  status: 'checked_in' | 'checked_out'
  token_available: boolean
  message?: string
}

export default function PickupCodesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<PickupToken[]>([])
  const [selectedToken, setSelectedToken] = useState<PickupToken | null>(null)

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const res = await fetch('/api/pickup/my-tokens')
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load pickup codes')
        }

        setTokens(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()

    // Refresh every 30 seconds to check for new tokens
    const interval = setInterval(fetchTokens, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pickup codes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Pickup Codes Yet</h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have any athletes checked in today, or pickup codes haven&apos;t been generated yet.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-600 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">Pickup Codes</h1>
          <p className="text-orange-100 mt-1">
            Show these codes to staff when picking up
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Pickup Instructions:</strong> When you arrive for pickup, tap an athlete below to show your QR code. Camp staff will scan the code to verify your authorization.
          </p>
        </div>

        {/* Athlete Cards */}
        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.id || `${token.athlete.id}-${token.camp_day?.id}`}
              className={`bg-white rounded-lg shadow p-4 ${
                token.status === 'checked_out' ? 'opacity-50' : 'cursor-pointer hover:shadow-md'
              }`}
              onClick={() => token.status !== 'checked_out' && token.token_available && setSelectedToken(token)}
            >
              <div className="flex items-center gap-4">
                {token.athlete.photo_url ? (
                  <img
                    src={token.athlete.photo_url}
                    alt={token.athlete.first_name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-lg">
                      {token.athlete.first_name[0]}{token.athlete.last_name[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {token.athlete.first_name} {token.athlete.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{token.camp?.name}</p>
                </div>
                {token.status === 'checked_out' ? (
                  <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    Picked Up
                  </span>
                ) : token.token_available ? (
                  <div className="text-orange-600">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                ) : (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    {token.message || 'Pending'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Check Out Confirmation */}
        {tokens.every((t) => t.status === 'checked_out') && (
          <div className="mt-6 text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">All Picked Up!</h2>
            <p className="text-gray-600">See you next time!</p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {selectedToken && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedToken(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {selectedToken.athlete.first_name} {selectedToken.athlete.last_name}
            </h2>
            <p className="text-gray-500 mb-4">{selectedToken.camp?.name}</p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl border-2 border-gray-100 inline-block mb-4">
              <QRCodeSVG
                value={selectedToken.token}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Show this code to staff for pickup verification
            </p>

            <button
              onClick={() => setSelectedToken(null)}
              className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
