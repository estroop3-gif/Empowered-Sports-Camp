'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface ProgramData {
  programType: string
  sessionsHeld: number
  totalCampers: number
  totalRevenue: number
  avgCsatScore: number | null
  avgCurriculumAdherence: number | null
}

interface ProgramBreakdownChartProps {
  data: ProgramData[]
  metric?: 'revenue' | 'campers' | 'sessions' | 'csat'
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

const COLORS = [
  'bg-neon',
  'bg-magenta',
  'bg-purple',
  'bg-blue-500',
  'bg-orange-500',
  'bg-teal-500',
]

export function ProgramBreakdownChart({
  data,
  metric = 'revenue',
}: ProgramBreakdownChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return []

    const getValue = (item: ProgramData) => {
      switch (metric) {
        case 'revenue':
          return item.totalRevenue
        case 'campers':
          return item.totalCampers
        case 'sessions':
          return item.sessionsHeld
        case 'csat':
          return item.avgCsatScore ?? 0
        default:
          return item.totalRevenue
      }
    }

    const total = data.reduce((sum, item) => sum + getValue(item), 0)

    return data
      .map((item, index) => ({
        ...item,
        value: getValue(item),
        percentage: total > 0 ? (getValue(item) / total) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [data, metric])

  const formatValue = (value: number) => {
    switch (metric) {
      case 'revenue':
        return formatCurrency(value)
      case 'csat':
        return value.toFixed(1)
      default:
        return value.toLocaleString()
    }
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-white/10 h-64">
        <div className="text-center">
          <p className="text-sm text-white/40">No program data yet</p>
          <p className="text-xs text-white/20 mt-1">
            Data will appear once camps are completed
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Horizontal bar chart */}
      <div className="space-y-3">
        {chartData.map((item, index) => (
          <div key={item.programType} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80 font-medium">{item.programType}</span>
              <span className="text-white/60">
                {formatValue(item.value)} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-6 bg-white/5 relative">
              <div
                className={cn('h-full transition-all duration-500', item.color)}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
        <div>
          <p className="text-xs text-white/40">Total Programs</p>
          <p className="text-lg font-bold text-white">{chartData.length}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">
            Total {metric === 'revenue' ? 'Revenue' : metric === 'campers' ? 'Campers' : metric === 'sessions' ? 'Sessions' : 'Avg CSAT'}
          </p>
          <p className="text-lg font-bold text-white">
            {formatValue(chartData.reduce((sum, item) => sum + item.value, 0))}
          </p>
        </div>
      </div>
    </div>
  )
}
