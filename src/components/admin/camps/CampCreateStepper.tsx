'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface Step {
  id: number
  name: string
  description: string
  status: 'complete' | 'current' | 'upcoming'
}

interface CampCreateStepperProps {
  steps: Step[]
  currentStep: number
}

export function CampCreateStepper({ steps, currentStep }: CampCreateStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li
            key={step.id}
            className={cn(
              'relative',
              stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''
            )}
          >
            {/* Connector line */}
            {stepIdx !== steps.length - 1 && (
              <div
                className="absolute top-4 left-7 -ml-px mt-0.5 h-0.5 w-full"
                aria-hidden="true"
              >
                <div
                  className={cn(
                    'h-full',
                    step.status === 'complete' ? 'bg-neon' : 'bg-white/20'
                  )}
                />
              </div>
            )}

            <div className="group relative flex items-start">
              {/* Step circle */}
              <span className="flex h-9 items-center" aria-hidden="true">
                <span
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center border-2 transition-all',
                    step.status === 'complete'
                      ? 'bg-neon border-neon'
                      : step.status === 'current'
                      ? 'border-neon bg-dark-100'
                      : 'border-white/30 bg-dark-100'
                  )}
                >
                  {step.status === 'complete' ? (
                    <Check className="h-5 w-5 text-black" />
                  ) : (
                    <span
                      className={cn(
                        'text-sm font-bold',
                        step.status === 'current' ? 'text-neon' : 'text-white/50'
                      )}
                    >
                      {step.id}
                    </span>
                  )}
                </span>
              </span>

              {/* Step content */}
              <span className="ml-4 flex min-w-0 flex-col">
                <span
                  className={cn(
                    'text-sm font-bold uppercase tracking-wider',
                    step.status === 'complete'
                      ? 'text-neon'
                      : step.status === 'current'
                      ? 'text-white'
                      : 'text-white/50'
                  )}
                >
                  {step.name}
                </span>
                <span className="text-xs text-white/40 hidden sm:block">
                  {step.description}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export const CAMP_CREATE_STEPS: Step[] = [
  {
    id: 1,
    name: 'Basic Details',
    description: 'Name, dates, location, pricing',
    status: 'current',
  },
  {
    id: 2,
    name: 'Schedule & Waivers',
    description: 'Assign template, select required waivers',
    status: 'upcoming',
  },
]

export function getStepsForCurrentStep(currentStep: number): Step[] {
  return CAMP_CREATE_STEPS.map((step) => ({
    ...step,
    status:
      step.id < currentStep
        ? 'complete'
        : step.id === currentStep
        ? 'current'
        : 'upcoming',
  }))
}
