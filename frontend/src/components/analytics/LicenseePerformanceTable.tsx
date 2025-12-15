'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react'

interface LicenseePerformanceData {
  tenantId: string
  tenantName: string
  sessionsHeld: number
  totalCampers: number
  tsgr: number
  royaltyIncome: number
  arpc: number
  avgCsat: number | null
  complaintsCount: number
  avgCurriculumAdherence: number | null
}

interface LicenseePerformanceTableProps {
  data: LicenseePerformanceData[]
  onLicenseeClick?: (tenantId: string) => void
}

type SortKey = keyof Omit<LicenseePerformanceData, 'tenantId' | 'tenantName'>

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function LicenseePerformanceTable({
  data,
  onLicenseeClick,
}: LicenseePerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('tsgr')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortKey] ?? 0
    const bValue = b[sortKey] ?? 0
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
          <p className="text-sm text-white/40">No licensee data yet</p>
          <p className="text-xs text-white/20 mt-1">
            Data will appear once licensees have recorded sessions
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
              Licensee
            </th>
            <SortHeader label="Sessions" sortKeyName="sessionsHeld" />
            <SortHeader label="Campers" sortKeyName="totalCampers" />
            <SortHeader label="Revenue" sortKeyName="tsgr" />
            <SortHeader label="Royalty" sortKeyName="royaltyIncome" />
            <SortHeader label="ARPC" sortKeyName="arpc" />
            <SortHeader label="CSAT" sortKeyName="avgCsat" />
            <SortHeader label="Complaints" sortKeyName="complaintsCount" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sortedData.map((row, index) => (
            <tr
              key={row.tenantId}
              className={cn(
                'hover:bg-white/5 transition-colors',
                onLicenseeClick && 'cursor-pointer'
              )}
              onClick={() => onLicenseeClick?.(row.tenantId)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {row.tenantName}
                  </span>
                  {onLicenseeClick && (
                    <ExternalLink className="h-3 w-3 text-white/20" />
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-white/80">
                {row.sessionsHeld}
              </td>
              <td className="px-4 py-3 text-sm text-white/80">
                {row.totalCampers.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-neon font-medium">
                {formatCurrency(row.tsgr)}
              </td>
              <td className="px-4 py-3 text-sm text-magenta font-medium">
                {formatCurrency(row.royaltyIncome)}
              </td>
              <td className="px-4 py-3 text-sm text-white/80">
                {formatCurrency(row.arpc)}
              </td>
              <td className="px-4 py-3">
                {row.avgCsat !== null ? (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      row.avgCsat >= 4.5 && 'text-neon',
                      row.avgCsat >= 3.5 && row.avgCsat < 4.5 && 'text-white',
                      row.avgCsat < 3.5 && 'text-red-400'
                    )}
                  >
                    {row.avgCsat.toFixed(1)}
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
                    row.complaintsCount > 0 && row.complaintsCount <= 2 && 'text-yellow-400',
                    row.complaintsCount > 2 && 'text-red-400'
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
