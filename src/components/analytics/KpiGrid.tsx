'use client'

import { KpiCard, type KpiCardProps } from './KpiCard'

interface KpiGridProps {
  items: KpiCardProps[]
  columns?: 2 | 3 | 4
}

export function KpiGrid({ items, columns = 4 }: KpiGridProps) {
  const gridCols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
      {items.map((item, index) => (
        <KpiCard key={index} {...item} />
      ))}
    </div>
  )
}

interface KpiGroupProps {
  title: string
  items: KpiCardProps[]
}

export function KpiGroupedGrid({ groups }: { groups: KpiGroupProps[] }) {
  return (
    <div className="space-y-6">
      {groups.map((group, index) => (
        <div key={index}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
            {group.title}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item, itemIndex) => (
              <KpiCard key={itemIndex} {...item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
