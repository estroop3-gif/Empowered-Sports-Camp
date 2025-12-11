'use client'

import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react'
import { useState } from 'react'

/**
 * DataTable - Brand-consistent data display
 *
 * DESIGN NOTES:
 * - Dark background with subtle borders
 * - Header row with neon accent text
 * - Hover states with subtle glow
 * - Sharp edges throughout
 * - Integrated search/filter in brand style
 */

interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  searchable?: boolean
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
  accent?: 'neon' | 'magenta' | 'purple'
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  searchable = false,
  searchPlaceholder = 'Search...',
  onRowClick,
  emptyMessage = 'No data available',
  className,
  accent = 'neon',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const accentColors = {
    neon: {
      header: 'text-neon',
      hover: 'hover:bg-neon/5',
      border: 'border-neon/20',
      focus: 'focus:border-neon focus:ring-neon/30',
    },
    magenta: {
      header: 'text-magenta',
      hover: 'hover:bg-magenta/5',
      border: 'border-magenta/20',
      focus: 'focus:border-magenta focus:ring-magenta/30',
    },
    purple: {
      header: 'text-purple',
      hover: 'hover:bg-purple/5',
      border: 'border-purple/20',
      focus: 'focus:border-purple focus:ring-purple/30',
    },
  }

  const colors = accentColors[accent]

  // Filter data based on search
  const filteredData = searchTerm
    ? data.filter((row) =>
        columns.some((col) => {
          const value = row[col.key as keyof T]
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    : data

  // Sort data
  const sortedData = sortConfig
    ? [...filteredData].sort((a, b) => {
        const aVal = a[sortConfig.key as keyof T]
        const bVal = b[sortConfig.key as keyof T]
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    : filteredData

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : null
      }
      return { key, direction: 'asc' }
    })
  }

  return (
    <div className={cn('bg-dark-100 border border-white/10', className)}>
      {/* Search Header */}
      {searchable && (
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'w-full h-12 bg-black border border-white/20 pl-12 pr-4',
                'text-white placeholder:text-white/30 uppercase tracking-wider',
                'focus:outline-none focus:ring-1',
                colors.focus
              )}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-6 py-4 text-xs font-bold uppercase tracking-widest text-left',
                    colors.header,
                    col.sortable && 'cursor-pointer select-none hover:text-white transition-colors',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.sortable && (
                      <span className="flex flex-col">
                        <ChevronUp
                          className={cn(
                            'h-3 w-3 -mb-1',
                            sortConfig?.key === col.key && sortConfig.direction === 'asc'
                              ? 'text-white'
                              : 'text-white/20'
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            'h-3 w-3',
                            sortConfig?.key === col.key && sortConfig.direction === 'desc'
                              ? 'text-white'
                              : 'text-white/20'
                          )}
                        />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-white/40 uppercase tracking-wider"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr
                  key={String(row[keyField])}
                  className={cn(
                    'border-b border-white/5 transition-colors',
                    colors.hover,
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-6 py-4 text-sm text-white/70',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right'
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key as keyof T], row)
                        : String(row[col.key as keyof T] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      <div className="px-6 py-3 border-t border-white/10 text-xs text-white/30 uppercase tracking-wider">
        {sortedData.length} {sortedData.length === 1 ? 'item' : 'items'}
        {searchTerm && ` (filtered from ${data.length})`}
      </div>
    </div>
  )
}

/**
 * TableBadge - Status badges for table cells
 */
export function TableBadge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const variants = {
    default: 'bg-white/10 text-white/70 border-white/20',
    success: 'bg-neon/10 text-neon border-neon/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    info: 'bg-purple/10 text-purple border-purple/30',
  }

  return (
    <span className={cn(
      'inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wider border',
      variants[variant]
    )}>
      {children}
    </span>
  )
}
