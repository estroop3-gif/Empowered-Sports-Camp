'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface TrendDataPoint {
  periodStart: Date
  periodLabel: string
  tsgr: number
  royaltyIncome: number
  sessionsHeld: number
  campers: number
  arpc: number
}

interface RevenueTrendsChartProps {
  data: TrendDataPoint[]
  showRoyalty?: boolean
  height?: number
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

export function RevenueTrendsChart({
  data,
  showRoyalty = true,
  height = 256,
}: RevenueTrendsChartProps) {
  const { maxValue, normalizedData } = useMemo(() => {
    if (data.length === 0) {
      return { maxValue: 0, normalizedData: [] }
    }

    const values = data.flatMap(d =>
      showRoyalty ? [d.tsgr, d.royaltyIncome] : [d.tsgr]
    )
    const max = Math.max(...values, 1)

    const normalized = data.map(d => ({
      ...d,
      tsgrHeight: (d.tsgr / max) * 100,
      royaltyHeight: (d.royaltyIncome / max) * 100,
    }))

    return { maxValue: max, normalizedData: normalized }
  }, [data, showRoyalty])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border border-dashed border-white/10"
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-sm text-white/40">No revenue data yet</p>
          <p className="text-xs text-white/20 mt-1">
            Data will appear once registrations are recorded
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-neon" />
          <span className="text-xs text-white/60">Revenue</span>
        </div>
        {showRoyalty && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-magenta" />
            <span className="text-xs text-white/60">Royalty Income</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ height }} className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-xs text-white/40">
          <span>{formatCurrency(maxValue)}</span>
          <span>{formatCurrency(maxValue / 2)}</span>
          <span>$0</span>
        </div>

        {/* Chart area */}
        <div className="ml-16 h-full flex items-end gap-1 border-l border-b border-white/10 pb-6 pr-4">
          {normalizedData.map((point, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              {/* Bars */}
              <div className="w-full flex gap-0.5 items-end" style={{ height: height - 24 }}>
                <div
                  className="flex-1 bg-neon/80 hover:bg-neon transition-colors"
                  style={{ height: `${point.tsgrHeight}%`, minHeight: point.tsgr > 0 ? 4 : 0 }}
                />
                {showRoyalty && (
                  <div
                    className="flex-1 bg-magenta/80 hover:bg-magenta transition-colors"
                    style={{ height: `${point.royaltyHeight}%`, minHeight: point.royaltyIncome > 0 ? 4 : 0 }}
                  />
                )}
              </div>

              {/* X-axis label */}
              <span className="text-[10px] text-white/40 truncate max-w-full">
                {point.periodLabel}
              </span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 border border-white/20 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                <p className="text-xs font-bold text-white">{point.periodLabel}</p>
                <p className="text-xs text-neon">
                  Revenue: {formatCurrency(point.tsgr)}
                </p>
                {showRoyalty && (
                  <p className="text-xs text-magenta">
                    Royalty: {formatCurrency(point.royaltyIncome)}
                  </p>
                )}
                <p className="text-xs text-white/60">
                  Campers: {point.campers}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
