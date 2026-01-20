/**
 * Pillar Card Component
 *
 * Card for displaying value pillars or program benefits.
 */

interface PillarCardProps {
  title: string
  description: string
  color: 'neon' | 'magenta' | 'purple'
  icon?: React.ReactNode
}

const colorClasses = {
  neon: {
    line: 'bg-neon',
    title: 'text-neon',
    glow: 'hover:shadow-[0_0_20px_rgba(204,255,0,0.15)]',
  },
  magenta: {
    line: 'bg-magenta',
    title: 'text-magenta',
    glow: 'hover:shadow-[0_0_20px_rgba(255,45,206,0.15)]',
  },
  purple: {
    line: 'bg-purple',
    title: 'text-purple',
    glow: 'hover:shadow-[0_0_20px_rgba(111,0,216,0.15)]',
  },
}

export default function PillarCard({ title, description, color, icon }: PillarCardProps) {
  const colors = colorClasses[color]

  return (
    <div
      className={`relative bg-dark-100/30 border border-white/10 p-6 hover:border-white/20 transition-all duration-300 ${colors.glow}`}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colors.line}`} />

      {/* Icon */}
      {icon && <div className="mb-4">{icon}</div>}

      {/* Content */}
      <h3 className={`text-lg font-bold ${colors.title} mb-3`}>{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
