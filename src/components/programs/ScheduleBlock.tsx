/**
 * Schedule Block Component
 *
 * Timeline-style display for "A Day at Camp" sections.
 */

import { Clock } from 'lucide-react'

interface ScheduleItem {
  time: string
  title: string
  description: string
}

interface ScheduleBlockProps {
  items: ScheduleItem[]
}

export default function ScheduleBlock({ items }: ScheduleBlockProps) {
  return (
    <div className="space-y-6">
      {items.map((item, index) => (
        <div key={item.time} className="relative flex gap-4 lg:gap-6">
          {/* Timeline line */}
          {index < items.length - 1 && (
            <div className="absolute left-5 top-12 bottom-0 w-px bg-gradient-to-b from-neon/30 to-transparent" />
          )}

          {/* Time indicator */}
          <div className="flex-shrink-0 w-10 h-10 bg-neon/10 border border-neon/30 flex items-center justify-center">
            <Clock className="h-5 w-5 text-neon" />
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="text-xs font-bold uppercase tracking-widest text-neon mb-1">
              {item.time}
            </div>
            <h4 className="text-lg font-bold text-white mb-2">
              {item.title}
            </h4>
            <p className="text-white/60 text-sm leading-relaxed">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
