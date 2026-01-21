'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Flame, Shirt, Package, Sparkles, Plus, Minus, Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCheckout } from '@/lib/checkout/context'
import { Button } from '@/components/ui/button'
import type { AddOn, AddOnVariant, CamperFormData } from '@/types/registration'

/**
 * AddOnSelector
 *
 * DESIGN NOTES:
 * - Featured items at top with prominent cards
 * - Grid layout for products
 * - Size/variant selection for apparel
 * - Per-camper or per-order selection
 * - "Hype copy" for each product
 * - Low stock warnings
 */

interface AddOnSelectorProps {
  availableAddOns: AddOn[]
  onContinue: () => void
  onBack: () => void
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  fuel_pack: <Flame className="h-5 w-5" />,
  apparel: <Shirt className="h-5 w-5" />,
  merchandise: <Package className="h-5 w-5" />,
  digital: <Sparkles className="h-5 w-5" />,
  service: <Sparkles className="h-5 w-5" />,
}

interface AddOnCardProps {
  addon: AddOn
  campers: CamperFormData[]
}

function AddOnCard({ addon, campers }: AddOnCardProps) {
  const { addAddOn, removeAddOn, getAddOnQuantity, updateAddOnQuantity } = useCheckout()
  const [selectedVariant, setSelectedVariant] = useState<AddOnVariant | null>(
    addon.variants.length === 1 ? addon.variants[0] : null
  )
  // Support multiple camper selection
  const [selectedCampers, setSelectedCampers] = useState<string[]>(
    addon.scope === 'per_order' || campers.length === 1
      ? (campers[0]?.id ? [campers[0].id] : [])
      : []
  )

  const hasVariants = addon.variants.length > 0
  const needsVariant = hasVariants && addon.variants.length > 1
  const needsCamperSelection = addon.scope === 'per_camper' && campers.length > 1

  const currentPrice = selectedVariant?.priceOverride ?? addon.price

  // Get total quantity across all selected campers
  const getTotalQuantity = () => {
    if (addon.scope === 'per_order') {
      return getAddOnQuantity(addon.id, selectedVariant?.id ?? null, null)
    }
    return selectedCampers.reduce((total, camperId) => {
      return total + getAddOnQuantity(addon.id, selectedVariant?.id ?? null, camperId)
    }, 0)
  }

  const currentQuantity = getTotalQuantity()

  // Toggle camper selection
  const toggleCamperSelection = (camperId: string) => {
    setSelectedCampers(prev => {
      if (prev.includes(camperId)) {
        return prev.filter(id => id !== camperId)
      } else {
        return [...prev, camperId]
      }
    })
  }

  // Select all campers
  const selectAllCampers = () => {
    setSelectedCampers(campers.map(c => c.id))
  }

  const handleAdd = () => {
    if (needsVariant && !selectedVariant) return
    if (needsCamperSelection && selectedCampers.length === 0) return

    // For per_order items, add once with null camperId
    if (addon.scope === 'per_order') {
      addAddOn({
        addonId: addon.id,
        variantId: selectedVariant?.id ?? null,
        camperId: null,
        quantity: 1,
        unitPrice: currentPrice,
      })
    } else {
      // For per_camper items, add for each selected camper
      selectedCampers.forEach(camperId => {
        addAddOn({
          addonId: addon.id,
          variantId: selectedVariant?.id ?? null,
          camperId: camperId,
          quantity: 1,
          unitPrice: currentPrice,
        })
      })
    }
  }

  const handleQuantityChange = (delta: number) => {
    if (addon.scope === 'per_order') {
      const newQuantity = getAddOnQuantity(addon.id, selectedVariant?.id ?? null, null) + delta
      updateAddOnQuantity(addon.id, selectedVariant?.id ?? null, null, newQuantity)
    } else {
      // Update quantity for each selected camper
      selectedCampers.forEach(camperId => {
        const camperQuantity = getAddOnQuantity(addon.id, selectedVariant?.id ?? null, camperId)
        const newQuantity = camperQuantity + delta
        updateAddOnQuantity(addon.id, selectedVariant?.id ?? null, camperId, newQuantity)
      })
    }
  }

  const isLowStock = selectedVariant?.isLowStock && !selectedVariant.isSoldOut
  const isSoldOut = selectedVariant?.isSoldOut

  return (
    <div
      className={cn(
        'border bg-white/[0.02] overflow-hidden transition-all duration-300',
        addon.featured
          ? 'border-neon/30 shadow-[0_0_30px_rgba(204,255,0,0.1)]'
          : 'border-white/10'
      )}
    >
      {/* Featured Badge */}
      {addon.featured && (
        <div className="bg-gradient-to-r from-neon to-neon/80 px-4 py-1">
          <span className="text-xs font-bold uppercase tracking-wider text-black">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-4">
          {/* Image */}
          <div className="relative h-20 w-20 shrink-0 bg-white/5 overflow-hidden">
            {addon.imageUrl ? (
              <Image
                src={addon.imageUrl}
                alt={addon.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white/20">
                {TYPE_ICONS[addon.addonType] || <Package className="h-8 w-8" />}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {addon.name}
              </h3>
              <div className="text-right shrink-0">
                <span className="text-lg font-black text-neon">
                  {formatCents(currentPrice)}
                </span>
                {addon.compareAtPrice && addon.compareAtPrice > currentPrice && (
                  <span className="block text-xs text-white/40 line-through">
                    {formatCents(addon.compareAtPrice)}
                  </span>
                )}
              </div>
            </div>
            {addon.hypeCopy && (
              <p className="mt-1 text-xs text-magenta italic">{addon.hypeCopy}</p>
            )}
            {addon.description && (
              <p className="mt-1 text-xs text-white/50 line-clamp-2">{addon.description}</p>
            )}
          </div>
        </div>

        {/* Variant Selection */}
        {needsVariant && (
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/40 block mb-2">
              Select Size
            </label>
            <div className="flex flex-wrap gap-2">
              {addon.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  disabled={variant.isSoldOut}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all',
                    selectedVariant?.id === variant.id
                      ? 'bg-neon text-black'
                      : variant.isSoldOut
                      ? 'bg-white/5 text-white/20 cursor-not-allowed line-through'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Camper Selection (for per-camper items) - Multi-select */}
        {needsCamperSelection && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Select Campers
              </label>
              <button
                onClick={selectAllCampers}
                className="text-xs text-neon hover:text-neon/80 transition-colors"
              >
                Select All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {campers.map((camper) => (
                <button
                  key={camper.id}
                  onClick={() => toggleCamperSelection(camper.id)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2',
                    selectedCampers.includes(camper.id)
                      ? 'bg-neon text-black'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {selectedCampers.includes(camper.id) && <Check className="h-3 w-3" />}
                  {camper.firstName || 'Camper'}
                </button>
              ))}
            </div>
            {selectedCampers.length > 0 && (
              <p className="mt-2 text-xs text-white/40">
                {selectedCampers.length} camper{selectedCampers.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* Stock Warning */}
        {isLowStock && (
          <div className="mt-3 flex items-center gap-2 text-xs text-yellow-500">
            <AlertTriangle className="h-3 w-3" />
            <span>Only a few left!</span>
          </div>
        )}

        {/* Add to Cart / Quantity Controls */}
        <div className="mt-4 flex items-center gap-3">
          {currentQuantity === 0 ? (
            <Button
              variant="neon"
              size="sm"
              className="flex-1"
              onClick={handleAdd}
              disabled={
                isSoldOut ||
                (needsVariant && !selectedVariant) ||
                (needsCamperSelection && selectedCampers.length === 0)
              }
            >
              {isSoldOut ? 'Sold Out' : 'Add to Order'}
            </Button>
          ) : (
            <>
              <div className="flex items-center border border-white/20">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 text-sm font-bold text-white min-w-[3rem] text-center">
                  {currentQuantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-neon">
                <Check className="h-4 w-4" />
                <span>Added</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function AddOnSelector({ availableAddOns, onContinue, onBack }: AddOnSelectorProps) {
  const { state, totals } = useCheckout()

  const featuredAddOns = availableAddOns.filter((a) => a.featured)
  const otherAddOns = availableAddOns.filter((a) => !a.featured)

  // Group add-ons by type
  const groupedAddOns: Record<string, AddOn[]> = {}
  otherAddOns.forEach((addon) => {
    if (!groupedAddOns[addon.addonType]) {
      groupedAddOns[addon.addonType] = []
    }
    groupedAddOns[addon.addonType].push(addon)
  })

  const typeLabels: Record<string, string> = {
    fuel_pack: 'Fuel Packs',
    apparel: 'Apparel',
    merchandise: 'Gear & Accessories',
    digital: 'Digital Products',
    service: 'Services',
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          Gear Up for Glory
        </h1>
        <p className="mt-2 text-white/60">
          Optional extras to make camp even more epic.
        </p>
      </div>

      {/* Featured Add-Ons */}
      {featuredAddOns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-neon" />
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Coach's Picks
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {featuredAddOns.map((addon) => (
              <AddOnCard
                key={addon.id}
                addon={addon}
                campers={state.campers}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grouped Add-Ons */}
      {Object.entries(groupedAddOns).map(([type, addons]) => (
        <div key={type} className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-white/60">{TYPE_ICONS[type]}</span>
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              {typeLabels[type] || type}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addons.map((addon) => (
              <AddOnCard
                key={addon.id}
                addon={addon}
                campers={state.campers}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {availableAddOns.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No add-ons available for this camp.</p>
        </div>
      )}

      {/* Add-ons Summary */}
      {totals.addOnsSubtotal > 0 && (
        <div className="bg-neon/10 border border-neon/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-white">
              Add-Ons Total
            </span>
            <span className="text-lg font-black text-neon">
              +{formatCents(totals.addOnsSubtotal)}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4 pt-6">
        <Button
          variant="outline-neon"
          size="lg"
          className="flex-1"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          variant="neon"
          size="lg"
          className="flex-1"
          onClick={onContinue}
        >
          Continue to Waivers
        </Button>
      </div>

      {/* Skip Note */}
      <p className="text-xs text-white/40 text-center">
        Add-ons are optional. You can skip this step and proceed to payment.
      </p>
    </div>
  )
}
