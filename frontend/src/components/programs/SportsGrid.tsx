/**
 * Sports Grid Component
 *
 * Grid display of sports with icons.
 */

import {
  Trophy,
  Target,
  Zap,
  Users,
  Medal,
  Dumbbell,
  Timer,
} from 'lucide-react'

const sportIcons: Record<string, React.ReactNode> = {
  volleyball: <Trophy className="h-6 w-6" />,
  basketball: <Target className="h-6 w-6" />,
  football: <Zap className="h-6 w-6" />,
  soccer: <Users className="h-6 w-6" />,
  lacrosse: <Medal className="h-6 w-6" />,
  running: <Timer className="h-6 w-6" />,
  dumbbell: <Dumbbell className="h-6 w-6" />,
}

interface Sport {
  name: string
  icon: string
}

interface SportsGridProps {
  sports: Sport[]
}

export default function SportsGrid({ sports }: SportsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {sports.map((sport) => (
        <div
          key={sport.name}
          className="flex items-center gap-3 p-4 bg-dark-100/50 border border-white/10 hover:border-neon/30 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-neon/10 flex items-center justify-center text-neon">
            {sportIcons[sport.icon] || <Trophy className="h-6 w-6" />}
          </div>
          <span className="text-sm font-medium text-white">{sport.name}</span>
        </div>
      ))}
    </div>
  )
}
