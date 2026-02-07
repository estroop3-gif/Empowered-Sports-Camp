import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

/**
 * StatCard - Brand-consistent metric display
 *
 * DESIGN NOTES:
 * - Dark background (dark-100) with subtle border
 * - Accent color applied to icon container and value
 * - Sharp edges, no border-radius
 * - Glow effect on hover matching accent color
 * - ALL CAPS labels with wide tracking
 */

interface StatCardProps {
  label: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon?: LucideIcon
  accent?: 'neon' | 'magenta' | 'purple' | 'white'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const accentStyles = {
  neon: {
    icon: 'bg-neon/10 text-neon border-neon/30',
    value: 'text-neon',
    glow: 'hover:shadow-[0_0_30px_rgba(204,255,0,0.2)]',
    border: 'hover:border-neon/50',
  },
  magenta: {
    icon: 'bg-magenta/10 text-magenta border-magenta/30',
    value: 'text-magenta',
    glow: 'hover:shadow-[0_0_30px_rgba(255,45,206,0.2)]',
    border: 'hover:border-magenta/50',
  },
  purple: {
    icon: 'bg-purple/10 text-purple border-purple/30',
    value: 'text-purple',
    glow: 'hover:shadow-[0_0_30px_rgba(111,0,216,0.2)]',
    border: 'hover:border-purple/50',
  },
  white: {
    icon: 'bg-white/10 text-white border-white/30',
    value: 'text-white',
    glow: 'hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]',
    border: 'hover:border-white/30',
  },
}

const sizeStyles = {
  sm: {
    card: 'p-4',
    icon: 'h-10 w-10',
    iconInner: 'h-5 w-5',
    value: 'text-2xl',
    label: 'text-xs',
  },
  md: {
    card: 'p-6',
    icon: 'h-12 w-12',
    iconInner: 'h-6 w-6',
    value: 'text-3xl',
    label: 'text-xs',
  },
  lg: {
    card: 'p-8',
    icon: 'h-14 w-14',
    iconInner: 'h-7 w-7',
    value: 'text-4xl',
    label: 'text-sm',
  },
}

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  accent = 'neon',
  size = 'md',
  className,
}: StatCardProps) {
  const styles = accentStyles[accent]
  const sizes = sizeStyles[size]

  return (
    <div
      className={cn(
        'bg-dark-100 border border-white/10 transition-all duration-300',
        styles.glow,
        styles.border,
        sizes.card,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            'font-bold uppercase tracking-widest text-white/50 mb-2',
            sizes.label
          )}>
            {label}
          </p>
          <p className={cn(
            'font-black',
            sizes.value,
            styles.value
          )}>
            {value}
          </p>
          {change && (
            <p className={cn(
              'mt-2 text-sm font-semibold',
              change.type === 'increase' && 'text-neon',
              change.type === 'decrease' && 'text-red-400',
              change.type === 'neutral' && 'text-white/50'
            )}>
              {change.type === 'increase' && '↑ '}
              {change.type === 'decrease' && '↓ '}
              {change.value > 0 ? '+' : ''}{change.value}%
              <span className="text-white/30 ml-1">vs last period</span>
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'flex items-center justify-center border',
            styles.icon,
            sizes.icon
          )}>
            <Icon className={sizes.iconInner} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * StatCardGrid - Responsive grid for stat cards
 */
export function StatCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5
  className?: string
}) {
  const colsClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  }

  return (
    <div className={cn(
      'grid gap-6',
      colsClass[columns],
      className
    )}>
      {children}
    </div>
  )
}
