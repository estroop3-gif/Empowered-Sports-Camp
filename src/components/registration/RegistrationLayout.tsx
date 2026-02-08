'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { RegistrationStepper } from './RegistrationStepper'
import { OrderSummary } from './OrderSummary'
import { useBannerOffset } from '@/hooks/useBannerOffset'
import type { CheckoutStep, CampSession, AddOn } from '@/types/registration'

/**
 * RegistrationLayout
 *
 * DESIGN NOTES:
 * - Full-bleed black background matching brand
 * - Fixed header with logo and back navigation
 * - Three-column layout on desktop: stepper | content | summary
 * - Stacked layout on mobile with collapsible summary
 * - Gradient accents and neon highlights throughout
 */

interface RegistrationLayoutProps {
  children: ReactNode
  currentStep: CheckoutStep
  campSession: CampSession | null
  availableAddOns: AddOn[]
  hideAccountStep?: boolean
  isWaitlistMode?: boolean
}

export function RegistrationLayout({
  children,
  currentStep,
  campSession,
  availableAddOns,
  hideAccountStep = false,
  isWaitlistMode = false,
}: RegistrationLayoutProps) {
  const { topWithNavbar } = useBannerOffset()
  // Height of this sub-header (h-16 = 64px)
  const subHeaderHeight = 64
  const stickyContentTop = topWithNavbar + subHeaderHeight

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header
        className="sticky z-40 bg-black border-b border-white/10"
        style={{ top: `${topWithNavbar}px` }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon via-magenta to-purple" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Back link */}
            <Link
              href={campSession ? `/camps/${campSession.slug}` : '/camps'}
              className="flex items-center gap-2 text-white/60 hover:text-neon transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider hidden sm:inline">
                Back to Camp
              </span>
            </Link>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-8 w-8">
                <Image
                  src="/images/logo.png"
                  alt="Empowered Athletes"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-lg font-black uppercase tracking-wider text-white hidden sm:inline">
                Register
              </span>
            </Link>

            {/* Secure badge */}
            <div className="flex items-center gap-2 text-white/40">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs uppercase tracking-wider hidden sm:inline">
                Secure Checkout
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Stepper (Desktop) */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky" style={{ top: `${stickyContentTop + 16}px` }}>
              <RegistrationStepper currentStep={currentStep} hideAccountStep={hideAccountStep} isWaitlistMode={isWaitlistMode} />
            </div>
          </div>

          {/* Mobile Stepper */}
          <div className="lg:hidden mb-8">
            <RegistrationStepper currentStep={currentStep} variant="horizontal" hideAccountStep={hideAccountStep} isWaitlistMode={isWaitlistMode} />
          </div>

          {/* Center Column - Form Content */}
          <div className="lg:col-span-6">
            {children}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="sticky" style={{ top: `${stickyContentTop + 16}px` }}>
              <OrderSummary
                campSession={campSession}
                availableAddOns={availableAddOns}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Trust Footer */}
      <footer className="border-t border-white/10 py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-white/40">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs uppercase tracking-wider">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 text-white/40">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs uppercase tracking-wider">Trusted by 5,000+ families</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Card icons */}
              <div className="flex items-center gap-1">
                <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center">
                  <span className="text-[8px] text-white/60 font-bold">VISA</span>
                </div>
                <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center">
                  <span className="text-[8px] text-white/60 font-bold">MC</span>
                </div>
                <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center">
                  <span className="text-[8px] text-white/60 font-bold">AMEX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
