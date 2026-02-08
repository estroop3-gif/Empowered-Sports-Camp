'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CheckoutStep } from '@/types/registration'

/**
 * RegistrationStepper
 *
 * DESIGN NOTES:
 * - Vertical layout on desktop (left sidebar)
 * - Horizontal compact layout on mobile
 * - Neon highlight on current step
 * - Check marks for completed steps
 * - Muted styling for upcoming steps
 */

interface RegistrationStepperProps {
  currentStep: CheckoutStep
  variant?: 'vertical' | 'horizontal'
  hideAccountStep?: boolean
  isWaitlistMode?: boolean
}

interface StepConfig {
  id: CheckoutStep
  label: string
  number: number
}

const STEPS: StepConfig[] = [
  { id: 'camp', label: 'SELECT CAMP', number: 1 },
  { id: 'campers', label: 'CAMPER INFO', number: 2 },
  { id: 'squad', label: 'HER SQUAD', number: 3 },
  { id: 'addons', label: 'ADD-ONS', number: 4 },
  { id: 'waivers', label: 'WAIVERS', number: 5 },
  { id: 'account', label: 'ACCOUNT', number: 6 },
  { id: 'payment', label: 'PAYMENT', number: 7 },
  { id: 'confirmation', label: 'CONFIRMED', number: 8 },
]

const WAITLIST_STEPS: StepConfig[] = [
  { id: 'camp', label: 'SELECT CAMP', number: 1 },
  { id: 'campers', label: 'CAMPER INFO', number: 2 },
  { id: 'squad', label: 'HER SQUAD', number: 3 },
  { id: 'waivers', label: 'WAIVERS', number: 4 },
  { id: 'account', label: 'ACCOUNT', number: 5 },
  { id: 'waitlist-confirm', label: 'WAITLIST', number: 6 },
]

export function RegistrationStepper({
  currentStep,
  variant = 'vertical',
  hideAccountStep = false,
  isWaitlistMode = false,
}: RegistrationStepperProps) {
  // Use waitlist steps when in waitlist mode
  const baseSteps = isWaitlistMode ? WAITLIST_STEPS : STEPS

  // Filter out the account step when user is authenticated and renumber
  const steps = hideAccountStep
    ? baseSteps.filter((s) => s.id !== 'account').map((s, i) => ({ ...s, number: i + 1 }))
    : baseSteps
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  if (variant === 'horizontal') {
    // Show steps in horizontal mode (exclude confirmation)
    const visibleSteps = steps.slice(0, steps.length - 1)
    return (
      <div className="flex items-center justify-between">
        {visibleSteps.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = step.id === currentStep
          const isUpcoming = index > currentIndex

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'h-8 w-8 flex items-center justify-center text-sm font-bold transition-all duration-300',
                    isCompleted && 'bg-neon text-black',
                    isCurrent &&
                      'bg-black border-2 border-neon text-neon shadow-[0_0_20px_rgba(204,255,0,0.5)]',
                    isUpcoming && 'bg-white/5 border border-white/20 text-white/40'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-[10px] font-semibold tracking-wider whitespace-nowrap',
                    isCurrent && 'text-neon',
                    isCompleted && 'text-white/60',
                    isUpcoming && 'text-white/30'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < visibleSteps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-[2px] mx-2',
                    index < currentIndex
                      ? 'bg-gradient-to-r from-neon to-neon'
                      : 'bg-white/10'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Vertical layout (desktop sidebar)
  return (
    <nav className="space-y-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = step.id === currentStep
        const isUpcoming = index > currentIndex

        return (
          <div key={step.id} className="relative">
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'absolute left-4 top-10 w-[2px] h-8',
                  index < currentIndex
                    ? 'bg-gradient-to-b from-neon to-neon/50'
                    : 'bg-white/10'
                )}
              />
            )}

            <div
              className={cn(
                'flex items-center gap-4 p-3 transition-all duration-300',
                isCurrent && 'bg-neon/10 border-l-2 border-neon'
              )}
            >
              {/* Step number/check */}
              <div
                className={cn(
                  'h-8 w-8 flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300',
                  isCompleted && 'bg-neon text-black',
                  isCurrent &&
                    'bg-black border-2 border-neon text-neon shadow-[0_0_20px_rgba(204,255,0,0.5)]',
                  isUpcoming && 'bg-white/5 border border-white/20 text-white/40'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-xs font-semibold tracking-wider transition-colors duration-300',
                  isCurrent && 'text-neon',
                  isCompleted && 'text-white/60',
                  isUpcoming && 'text-white/30'
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
