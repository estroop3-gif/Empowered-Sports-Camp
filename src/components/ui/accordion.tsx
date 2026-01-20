'use client'

/**
 * Accordion Component
 *
 * A reusable, accessible accordion/collapsible component.
 * Supports multiple items open at once (independent state per item).
 */

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// CONTEXT
// ============================================================================

interface AccordionItemContextValue {
  isOpen: boolean
  toggle: () => void
  itemId: string
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null)

function useAccordionItem() {
  const context = React.useContext(AccordionItemContext)
  if (!context) {
    throw new Error('Accordion components must be used within an AccordionItem')
  }
  return context
}

// ============================================================================
// ACCORDION CONTAINER
// ============================================================================

interface AccordionProps {
  children: React.ReactNode
  className?: string
}

export function Accordion({ children, className }: AccordionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {children}
    </div>
  )
}

// ============================================================================
// ACCORDION ITEM
// ============================================================================

interface AccordionItemProps {
  children: React.ReactNode
  className?: string
  defaultOpen?: boolean
}

export function AccordionItem({ children, className, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const itemId = React.useId()

  const toggle = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const contextValue = React.useMemo(
    () => ({ isOpen, toggle, itemId }),
    [isOpen, toggle, itemId]
  )

  return (
    <AccordionItemContext.Provider value={contextValue}>
      <div
        className={cn(
          'border border-white/10 bg-dark-100/30 transition-colors duration-200',
          isOpen && 'border-neon/20 bg-dark-100/50',
          className
        )}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

// ============================================================================
// ACCORDION TRIGGER (THE CLICKABLE QUESTION)
// ============================================================================

interface AccordionTriggerProps {
  children: React.ReactNode
  className?: string
}

export function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  const { isOpen, toggle, itemId } = useAccordionItem()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      aria-controls={`accordion-content-${itemId}`}
      className={cn(
        'flex w-full items-center justify-between gap-4 px-5 py-4 text-left',
        'font-semibold text-white transition-colors duration-200',
        'hover:text-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-neon/50',
        className
      )}
    >
      <span className="flex-1">{children}</span>
      <ChevronDown
        className={cn(
          'h-5 w-5 flex-shrink-0 text-neon transition-transform duration-300',
          isOpen && 'rotate-180'
        )}
      />
    </button>
  )
}

// ============================================================================
// ACCORDION CONTENT (THE EXPANDABLE ANSWER)
// ============================================================================

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
}

export function AccordionContent({ children, className }: AccordionContentProps) {
  const { isOpen, itemId } = useAccordionItem()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [children])

  return (
    <div
      id={`accordion-content-${itemId}`}
      role="region"
      aria-hidden={!isOpen}
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        maxHeight: isOpen ? height : 0,
      }}
    >
      <div
        ref={contentRef}
        className={cn(
          'px-5 pb-5 pt-0 text-white/70 leading-relaxed',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
