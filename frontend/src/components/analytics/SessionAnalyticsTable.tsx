'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, Calendar, MapPin } from 'lucide-react'

interface SessionAnalyticsData {
  campId: string
  campName: string
  programType: string
  startDate: Date
  endDate: Date
  location: string
  registrations: number
  revenue: number
  csatScore: number | null
  curriculumAdherence: number | null
  complaintsCount: number
}

interface SessionAnalyticsTableProps {
  data: SessionAnalyticsData[]
  onSessionClick?: (campId: string) => void
}

type SortKey = 'startDate' | 'registrations' | 'revenue' | 'csatScore' | 'curriculumAdherence' | 'complaintsCount'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function SessionAnalyticsTable({
  data,
  onSessionClick,
}: SessionAnalyticsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('startDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const sortedData = [...data].sort((a, b) => {
    let aValue: number
    let bValue: number

    if (sortKey === 'startDate') {
      aValue = new Date(a.startDate).getTime()
      bValue = new Date(b.startDate).getTime()
    } else {
      aValue = a[sortKey] ?? 0
      bValue = b[sortKey] ?? 0
    }

    const multiplier = sortDirection === 'asc' ? 1 : -1
    return (aValue - bValue) * multiplier
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const SortHeader = ({
    label,
    sortKeyName,
  }: {
    label: string
    sortKeyName: SortKey
  }) => (
    <th
      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40 cursor-pointer hover:text-white/60 transition-colors"
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (
          sortDirection === 'desc' ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )
        )}
      </div>
    </th>
  )

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-white/10 h-64">
        <div className="text-center">
          <p className="text-sm text-white/40">No session data yet</p>
          <p className="text-xs text-white/20 mt-1">
            Data will appear once camp sessions are completed
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-white/10">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40">
              Session
            </th>
            <SortHeader label="Date" sortKeyName="startDate" />
            <SortHeader label="Registrations" sortKeyName="registrations" />
            <SortHeader label="Revenue" sortKeyName="revenue" />
            <SortHeader label="CSAT" sortKeyName="csatScore" />
            <SortHeader label="Curriculum" sortKeyName="curriculumAdherence" />
            <SortHeader label="Complaints" sortKeyName="complaintsCount" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sortedData.map((row) => (
            <tr
              key={row.campId}
              className={cn(
                'hover:bg-white/5 transition-colors',
                onSessionClick && 'cursor-pointer'
              )}
              onClick={() => onSessionClick?.(row.campId)}
            >
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{row.campName}</p>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10">
                      {row.programType}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {row.location}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Calendar className="h-3 w-3 text-white/40" />
                  {formatDate(row.startDate)}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-white/80">
                {row.registrations}
              </td>
              <td className="px-4 py-3 text-sm text-neon font-medium">
                {formatCurrency(row.revenue)}
              </td>
              <td className="px-4 py-3">
                {row.csatScore !== null ? (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      row.csatScore >= 4.5 && 'text-neon',
                      row.csatScore >= 3.5 && row.csatScore < 4.5 && 'text-white',
                      row.csatScore < 3.5 && 'text-red-400'
                    )}
                  >
                    {row.csatScore.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-sm text-white/20">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {row.curriculumAdherence !== null ? (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      row.curriculumAdherence >= 90 && 'text-neon',
                      row.curriculumAdherence >= 70 && row.curriculumAdherence < 90 && 'text-white',
                      row.curriculumAdherence < 70 && 'text-red-400'
                    )}
                  >
                    {row.curriculumAdherence.toFixed(0)}%
                  </span>
                ) : (
                  <span className="text-sm text-white/20">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'text-sm',
                    row.complaintsCount === 0 && 'text-white/40',
                    row.complaintsCount > 0 && row.complaintsCount <= 1 && 'text-yellow-400',
                    row.complaintsCount > 1 && 'text-red-400'
                  )}
                >
                  {row.complaintsCount}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
