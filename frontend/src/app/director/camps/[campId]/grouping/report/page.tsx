'use client'

/**
 * Grouping Report Page (Print View)
 *
 * Printer-friendly view of camp group assignments.
 */

import { useState, useEffect, use } from 'react'

interface GroupingCamper {
  id: string
  name: string
  first_name: string
  last_name: string
  grade_level: number | null
  friend_group_number: number | null
  has_medical_notes: boolean
  has_allergies: boolean
  special_considerations: string | null
}

interface GroupingGroup {
  id: string
  group_number: number
  group_name: string
  campers: GroupingCamper[]
  stats: {
    count: number
    min_grade: number | null
    max_grade: number | null
  }
}

interface GroupingState {
  camp_id: string
  camp_name: string
  groups: GroupingGroup[]
  total_campers: number
  max_group_size: number
  max_grade_spread: number
}

export default function GroupingReportPage({
  params,
}: {
  params: Promise<{ campId: string }>
}) {
  const { campId } = use(params)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<GroupingState | null>(null)

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/grouping/${campId}`)
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load')
        }

        setState(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading')
      } finally {
        setLoading(false)
      }
    }

    fetchState()
  }, [campId])

  // Auto-print on load
  useEffect(() => {
    if (!loading && !error && state) {
      setTimeout(() => window.print(), 500)
    }
  }, [loading, error, state])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading report...</p>
      </div>
    )
  }

  if (error || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || 'Failed to load report'}</p>
      </div>
    )
  }

  const printDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5in;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break {
            page-break-before: always;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="mb-8 border-b-2 border-black pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black uppercase tracking-wide">
              {state.camp_name}
            </h1>
            <p className="text-lg text-gray-600 mt-1">Group Assignment Report</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Generated: {printDate}</p>
            <p>Total Campers: {state.total_campers}</p>
          </div>
        </div>
      </div>

      {/* Print button (no-print) */}
      <div className="no-print mb-6 flex gap-4">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-black text-white font-medium rounded hover:bg-gray-800"
        >
          Print Report
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      {/* Groups */}
      <div className="space-y-8">
        {state.groups.map((group, idx) => (
          <div
            key={group.id}
            className={idx > 0 && idx % 2 === 0 ? 'page-break' : ''}
          >
            {/* Group Header */}
            <div className="bg-gray-100 rounded-t px-4 py-2 border border-gray-300 border-b-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black">
                  {group.group_name}
                </h2>
                <div className="text-sm text-gray-600">
                  {group.stats.count} campers |{' '}
                  Grades:{' '}
                  {group.stats.min_grade !== null && group.stats.max_grade !== null
                    ? group.stats.min_grade === group.stats.max_grade
                      ? group.stats.min_grade
                      : `${group.stats.min_grade}-${group.stats.max_grade}`
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Camper Table */}
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 border-b border-gray-300 text-sm font-semibold">
                    #
                  </th>
                  <th className="text-left px-4 py-2 border-b border-gray-300 text-sm font-semibold">
                    Name
                  </th>
                  <th className="text-center px-4 py-2 border-b border-gray-300 text-sm font-semibold">
                    Grade
                  </th>
                  <th className="text-center px-4 py-2 border-b border-gray-300 text-sm font-semibold">
                    Friend Group
                  </th>
                  <th className="text-center px-4 py-2 border-b border-gray-300 text-sm font-semibold">
                    Medical
                  </th>
                  <th className="text-center px-4 py-2 border-b border-gray-300 text-sm font-semibold">
                    Allergies
                  </th>
                  <th className="text-left px-4 py-2 border-b border-gray-300 text-sm font-semibold">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.campers.length > 0 ? (
                  group.campers.map((camper, camperIdx) => (
                    <tr
                      key={camper.id}
                      className={camperIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {camperIdx + 1}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {camper.last_name}, {camper.first_name}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {camper.grade_level ?? '?'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {camper.friend_group_number ? (
                          <span className="inline-block w-6 h-6 bg-pink-500 text-white text-xs rounded-full leading-6">
                            {camper.friend_group_number}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {camper.has_medical_notes ? (
                          <span className="text-red-600 font-bold">!</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {camper.has_allergies ? (
                          <span className="text-yellow-600 font-bold">!</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                        {camper.special_considerations || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No campers assigned
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500">
        <div className="flex justify-between">
          <p>Empowered Athletes - Camp Grouping Report</p>
          <p>Max group size: {state.max_group_size} | Max grade spread: {state.max_grade_spread}</p>
        </div>
      </div>
    </div>
  )
}
