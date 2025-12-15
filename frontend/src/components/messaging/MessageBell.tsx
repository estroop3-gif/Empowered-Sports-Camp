/**
 * Message Bell Component
 *
 * Message icon with "Coming Soon" dropdown.
 * Styled to match Empowered Sports Camp brand aesthetic.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MessageBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-md transition-colors',
          'text-white/70 hover:text-neon hover:bg-white/5',
          'focus:outline-none focus:ring-2 focus:ring-neon/50',
          isOpen && 'text-neon bg-white/5'
        )}
        aria-label="Messages"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-black border border-white/10 rounded-lg shadow-xl shadow-black/50 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Messages
            </h3>
          </div>

          {/* Coming Soon Content */}
          <div className="p-8 text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-neon/20 rounded-full animate-pulse" />
              <div className="absolute inset-2 bg-black rounded-full flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-neon" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-neon" />
              <p className="text-white font-semibold uppercase tracking-wide">Coming Soon</p>
              <Sparkles className="h-4 w-4 text-neon" />
            </div>
            <p className="text-white/50 text-sm">
              Direct messaging between directors, parents, and staff is on the way!
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/30 text-xs">
                Stay tuned for updates
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
