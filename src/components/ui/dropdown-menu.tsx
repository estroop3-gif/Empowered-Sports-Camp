'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * DropdownMenu - Brand-consistent action menu
 *
 * DESIGN NOTES:
 * - Dark background with subtle borders
 * - Sharp edges throughout
 * - Hover states with neon/magenta accents
 * - Keyboard navigation support
 * - Uses portal to escape overflow:hidden containers
 */

interface DropdownMenuItem {
  label: string
  icon?: React.ElementType
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownMenuItem[]
  align?: 'left' | 'right'
  className?: string
}

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const menuWidth = 180 // min-width of menu

      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: align === 'right'
          ? rect.right + window.scrollX - menuWidth
          : rect.left + window.scrollX,
      })
    }
  }, [isOpen, align])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Close on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick()
      setIsOpen(false)
    }
  }

  const menuContent = isOpen ? (
    <div
      ref={menuRef}
      className={cn(
        'fixed min-w-[180px] py-1',
        'bg-black border border-white/20',
        'shadow-xl shadow-black/80'
      )}
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      role="menu"
    >
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={index}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
              item.disabled && 'opacity-40 cursor-not-allowed',
              !item.disabled && item.variant === 'danger' && 'text-red-400 hover:bg-red-500/10 hover:text-red-300',
              !item.disabled && item.variant !== 'danger' && 'text-white/70 hover:bg-neon/10 hover:text-white'
            )}
            role="menuitem"
          >
            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-white/40 hover:text-white transition-colors focus:outline-none focus:text-white"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </button>

      {typeof window !== 'undefined' && menuContent && createPortal(menuContent, document.body)}
    </div>
  )
}

/**
 * Modal - Brand-consistent modal dialog
 */
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10000 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative bg-black border border-white/20 p-6 max-w-md w-full mx-4',
          'shadow-xl shadow-black/50',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="mb-4">
          <h2
            id="modal-title"
            className="text-lg font-black uppercase tracking-wider text-white"
          >
            {title}
          </h2>
          {description && (
            <p className="text-sm text-white/50 mt-1">{description}</p>
          )}
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  )

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null
}
