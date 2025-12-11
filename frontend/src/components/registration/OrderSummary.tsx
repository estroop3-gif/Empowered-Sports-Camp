'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Calendar, MapPin, Tag, Percent, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCheckout } from '@/lib/checkout/context'
import type { CampSession, AddOn } from '@/types/registration'

/**
 * OrderSummary
 *
 * DESIGN NOTES:
 * - Sticky sidebar on desktop
 * - Collapsible on mobile (shows just total when collapsed)
 * - Live updates as items are added/removed
 * - Brand-consistent styling with neon accents
 */

interface OrderSummaryProps {
  campSession: CampSession | null
  availableAddOns: AddOn[]
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function OrderSummary({ campSession, availableAddOns }: OrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { state, totals } = useCheckout()

  const getAddOnName = (addonId: string): string => {
    const addon = availableAddOns.find((a) => a.id === addonId)
    return addon?.name ?? 'Add-on'
  }

  const getVariantName = (addonId: string, variantId: string | null): string => {
    if (!variantId) return ''
    const addon = availableAddOns.find((a) => a.id === addonId)
    const variant = addon?.variants.find((v) => v.id === variantId)
    return variant?.name ?? ''
  }

  const getCamperName = (camperId: string | null): string => {
    if (!camperId) return ''
    const camper = state.campers.find((c) => c.id === camperId)
    if (!camper || !camper.firstName) return ''
    return `for ${camper.firstName}`
  }

  return (
    <div className="bg-white/5 border border-white/10 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 lg:cursor-default"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-neon" />
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Order Summary
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-neon">
            {formatCents(totals.total)}
          </span>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-white/40 transition-transform lg:hidden',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Collapsible content */}
      <div
        className={cn(
          'transition-all duration-300 overflow-hidden',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 lg:max-h-[2000px] lg:opacity-100'
        )}
      >
        <div className="px-4 pb-4 space-y-4">
          {/* Camp Info */}
          {campSession && (
            <div className="border-b border-white/10 pb-4">
              <div className="flex gap-3">
                {campSession.imageUrl && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden">
                    <Image
                      src={campSession.imageUrl}
                      alt={campSession.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide truncate">
                    {campSession.name}
                  </h3>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-white/50">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDate(campSession.startDate)} - {formatDate(campSession.endDate)}
                      </span>
                    </div>
                    {campSession.location && (
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{campSession.location.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campers */}
          {state.campers.length > 0 && (
            <div className="border-b border-white/10 pb-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                Campers ({state.campers.length})
              </h4>
              <div className="space-y-2">
                {state.campers.map((camper, index) => (
                  <div key={camper.id} className="flex items-center justify-between">
                    <span className="text-sm text-white/80">
                      {camper.firstName || `Camper ${index + 1}`}
                      {camper.lastName && ` ${camper.lastName.charAt(0)}.`}
                    </span>
                    <span className="text-sm text-white/60">
                      {campSession && formatCents(
                        campSession.isEarlyBird && campSession.earlyBirdPrice
                          ? campSession.earlyBirdPrice
                          : campSession.price
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Add-ons */}
          {state.selectedAddOns.length > 0 && (
            <div className="border-b border-white/10 pb-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                Add-Ons
              </h4>
              <div className="space-y-2">
                {state.selectedAddOns.map((addon) => (
                  <div
                    key={`${addon.addonId}-${addon.variantId}-${addon.camperId}`}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-white/80 block truncate">
                        {getAddOnName(addon.addonId)}
                        {addon.quantity > 1 && ` (×${addon.quantity})`}
                      </span>
                      <span className="text-xs text-white/40 block">
                        {getVariantName(addon.addonId, addon.variantId)}
                        {getCamperName(addon.camperId) && ` ${getCamperName(addon.camperId)}`}
                      </span>
                    </div>
                    <span className="text-sm text-white/60 shrink-0">
                      {formatCents(addon.unitPrice * addon.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtotals & Discounts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Camp Subtotal</span>
              <span className="text-white/80">{formatCents(totals.campSubtotal)}</span>
            </div>

            {totals.addOnsSubtotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Add-Ons</span>
                <span className="text-white/80">{formatCents(totals.addOnsSubtotal)}</span>
              </div>
            )}

            {totals.siblingDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-magenta flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Sibling Discount
                </span>
                <span className="text-magenta">-{formatCents(totals.siblingDiscount)}</span>
              </div>
            )}

            {state.promoCode && totals.promoDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {state.promoCode.code}
                </span>
                <span className="text-purple">-{formatCents(totals.promoDiscount)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold uppercase tracking-wider text-white">
                Total
              </span>
              <span className="text-2xl font-black text-neon">
                {formatCents(totals.total)}
              </span>
            </div>
            {totals.tax > 0 && (
              <p className="text-xs text-white/40 mt-1">
                Including {formatCents(totals.tax)} tax
              </p>
            )}
          </div>

          {/* Early Bird Badge */}
          {campSession?.isEarlyBird && (
            <div className="bg-neon/10 border border-neon/30 p-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-neon" />
                <span className="text-xs font-semibold uppercase tracking-wider text-neon">
                  Early Bird Pricing Active
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                You're saving {formatCents((campSession.price - (campSession.earlyBirdPrice || 0)) * state.campers.length)} with early registration!
              </p>
            </div>
          )}

          {/* Trust Badges */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-white/40">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs">Secure 256-bit encryption</span>
            </div>
            <div className="flex items-center gap-2 text-white/40">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs">Instant confirmation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
