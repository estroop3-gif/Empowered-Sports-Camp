'use client'

import { cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

export interface KpiCardProps {
  label: string
  value: string | number
  subLabel?: string
  delta?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  variant?: 'default' | 'neon' | 'magenta' | 'purple'
  icon?: React.ElementType
  format?: 'currency' | 'percentage' | 'number' | 'decimal'
  bonus?: {
    amount: number
    label: string
    eligible: boolean
  }
}

function formatValue(value: string | number, format?: string): string {
  if (typeof value === 'string') return value

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'decimal':
      return value.toFixed(2)
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(Math.round(value))
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function KpiCard({
  label,
  value,
  subLabel,
  delta,
  variant = 'default',
  icon: Icon,
  format,
  bonus,
}: KpiCardProps) {
  const variantStyles = {
    default: {
      border: 'border-white/10',
      iconBg: 'bg-white/5',
      iconText: 'text-white/60',
    },
    neon: {
      border: 'border-neon/30',
      iconBg: 'bg-neon/10',
      iconText: 'text-neon',
    },
    magenta: {
      border: 'border-magenta/30',
      iconBg: 'bg-magenta/10',
      iconText: 'text-magenta',
    },
    purple: {
      border: 'border-purple/30',
      iconBg: 'bg-purple/10',
      iconText: 'text-purple',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className={cn('bg-dark-100 border p-6', styles.border)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {formatValue(value, format)}
          </p>
          {subLabel && (
            <p className="mt-1 text-xs text-white/40">{subLabel}</p>
          )}
          {delta && (
            <div className="mt-2 flex items-center gap-1">
              {delta.direction === 'up' && (
                <ArrowUpRight className="h-4 w-4 text-neon" />
              )}
              {delta.direction === 'down' && (
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              )}
              {delta.direction === 'neutral' && (
                <Minus className="h-4 w-4 text-white/40" />
              )}
              <span
                className={cn(
                  'text-xs font-bold',
                  delta.direction === 'up' && 'text-neon',
                  delta.direction === 'down' && 'text-red-400',
                  delta.direction === 'neutral' && 'text-white/40'
                )}
              >
                {delta.value}
              </span>
            </div>
          )}
          {bonus && (
            <div className={cn(
              'mt-3 pt-3 border-t',
              bonus.eligible ? 'border-neon/30' : 'border-white/10'
            )}>
              <p className="text-xs text-white/40 mb-1">{bonus.label}</p>
              <p className={cn(
                'text-lg font-black',
                bonus.eligible ? 'text-neon' : 'text-white/30'
              )}>
                {bonus.amount > 0 ? formatCurrency(bonus.amount) : '$0'}
              </p>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'h-12 w-12 flex items-center justify-center border',
              styles.iconBg,
              styles.border
            )}
          >
            <Icon className={cn('h-6 w-6', styles.iconText)} />
          </div>
        )}
      </div>
    </div>
  )
}
