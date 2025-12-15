'use client'

import { useMemo } from 'react'

interface EnrollmentDataPoint {
  periodStart: Date
  periodLabel: string
  registrations: number
  campers: number
  sessionsHeld: number
}

interface EnrollmentTrendsChartProps {
  data: EnrollmentDataPoint[]
  height?: number
}

export function EnrollmentTrendsChart({
  data,
  height = 256,
}: EnrollmentTrendsChartProps) {
  const { maxValue, normalizedData } = useMemo(() => {
    if (data.length === 0) {
      return { maxValue: 0, normalizedData: [] }
    }

    const values = data.flatMap(d => [d.registrations, d.campers])
    const max = Math.max(...values, 1)

    const normalized = data.map(d => ({
      ...d,
      registrationsHeight: (d.registrations / max) * 100,
      campersHeight: (d.campers / max) * 100,
    }))

    return { maxValue: max, normalizedData: normalized }
  }, [data])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border border-dashed border-white/10"
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-sm text-white/40">No enrollment data yet</p>
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
          <div className="w-3 h-3 bg-purple" />
          <span className="text-xs text-white/60">Registrations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-neon" />
          <span className="text-xs text-white/60">Unique Campers</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }} className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-xs text-white/40">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 h-full flex items-end gap-1 border-l border-b border-white/10 pb-6 pr-4">
          {normalizedData.map((point, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              {/* Bars */}
              <div className="w-full flex gap-0.5 items-end" style={{ height: height - 24 }}>
                <div
                  className="flex-1 bg-purple/80 hover:bg-purple transition-colors"
                  style={{ height: `${point.registrationsHeight}%`, minHeight: point.registrations > 0 ? 4 : 0 }}
                />
                <div
                  className="flex-1 bg-neon/80 hover:bg-neon transition-colors"
                  style={{ height: `${point.campersHeight}%`, minHeight: point.campers > 0 ? 4 : 0 }}
                />
              </div>

              {/* X-axis label */}
              <span className="text-[10px] text-white/40 truncate max-w-full">
                {point.periodLabel}
              </span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 border border-white/20 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                <p className="text-xs font-bold text-white">{point.periodLabel}</p>
                <p className="text-xs text-purple">
                  Registrations: {point.registrations}
                </p>
                <p className="text-xs text-neon">
                  Campers: {point.campers}
                </p>
                <p className="text-xs text-white/60">
                  Sessions: {point.sessionsHeld}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
