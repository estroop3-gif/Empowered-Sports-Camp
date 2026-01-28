'use client'

import { useState, useEffect } from 'react'
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

  // For per_order items or single variant, use simple variant selection
  const [selectedVariant, setSelectedVariant] = useState<AddOnVariant | null>(
    addon.variants.length === 1 ? addon.variants[0] : null
  )

  // Per-camper variant selection (camper ID -> variant ID)
  const [variantsPerCamper, setVariantsPerCamper] = useState<Record<string, string>>({})

  // Auto-fill variants from camper's tshirtSize when camper data changes
  useEffect(() => {
    // Map t-shirt size codes to possible variant name patterns
    const sizePatterns: Record<string, string[]> = {
      'YXS': ['YXS', 'Youth XS', 'Youth Extra Small', 'Youth Extra-Small', 'XS Youth'],
      'YS': ['YS', 'Youth S', 'Youth Small', 'S Youth', 'Youth SM'],
      'YM': ['YM', 'Youth M', 'Youth Medium', 'M Youth', 'Youth MED'],
      'YL': ['YL', 'Youth L', 'Youth Large', 'L Youth', 'Youth LG'],
      'AS': ['AS', 'Adult S', 'Adult Small', 'S Adult', 'Adult SM', 'Small', 'S'],
      'AM': ['AM', 'Adult M', 'Adult Medium', 'M Adult', 'Adult MED', 'Medium', 'M'],
      'AL': ['AL', 'Adult L', 'Adult Large', 'L Adult', 'Adult LG', 'Large', 'L'],
      'AXL': ['AXL', 'Adult XL', 'Adult Extra Large', 'Adult Extra-Large', 'XL Adult', 'XL', 'Extra Large'],
    }

    // Find a variant that matches a t-shirt size
    const findMatchingVariant = (tshirtSize: string) => {
      const patterns = sizePatterns[tshirtSize.toUpperCase()] || []
      return addon.variants.find(v => {
        const variantName = v.name.toUpperCase()
        // Check exact matches from patterns
        for (const pattern of patterns) {
          if (variantName === pattern.toUpperCase()) return true
          // Also check if variant starts with or contains the pattern
          if (variantName.startsWith(pattern.toUpperCase())) return true
        }
        // Fallback: direct match with tshirtSize
        if (variantName === tshirtSize.toUpperCase()) return true
        if (variantName.startsWith(tshirtSize.toUpperCase())) return true
        return false
      })
    }

    setVariantsPerCamper(prev => {
      const newVariants: Record<string, string> = { ...prev }
      let hasChanges = false

      campers.forEach(c => {
        // Skip if already has a variant selected for this camper
        if (newVariants[c.id]) return

        // If only one variant, pre-select it
        if (addon.variants.length === 1) {
          newVariants[c.id] = addon.variants[0].id
          hasChanges = true
        }
        // If camper has a t-shirt size and this is apparel with size variants, try to match
        else if (c.tshirtSize && addon.addonType === 'apparel' && addon.variants.length > 0) {
          const matchingVariant = findMatchingVariant(c.tshirtSize)
          if (matchingVariant) {
            newVariants[c.id] = matchingVariant.id
            hasChanges = true
          }
        }
      })

      return hasChanges ? newVariants : prev
    })
  }, [campers, addon.variants, addon.addonType])

  // Support multiple camper selection
  const [selectedCampers, setSelectedCampers] = useState<string[]>(
    addon.scope === 'per_order' || campers.length === 1
      ? (campers[0]?.id ? [campers[0].id] : [])
      : []
  )

  const hasVariants = addon.variants.length > 0
  const needsVariant = hasVariants && addon.variants.length > 1
  const needsCamperSelection = addon.scope === 'per_camper' && campers.length > 1
  const isPerCamperWithVariants = addon.scope === 'per_camper' && needsVariant

  // Get variant by ID
  const getVariantById = (variantId: string) => addon.variants.find(v => v.id === variantId)

  // Get price for display (use first selected camper's variant or base price)
  const getDisplayPrice = () => {
    if (isPerCamperWithVariants && selectedCampers.length > 0) {
      const firstCamperVariantId = variantsPerCamper[selectedCampers[0]]
      if (firstCamperVariantId) {
        const variant = getVariantById(firstCamperVariantId)
        return variant?.priceOverride ?? addon.price
      }
    }
    return selectedVariant?.priceOverride ?? addon.price
  }
  const currentPrice = getDisplayPrice()

  // Get total quantity across all selected campers (checking all variants)
  const getTotalQuantity = () => {
    if (addon.scope === 'per_order') {
      return getAddOnQuantity(addon.id, selectedVariant?.id ?? null, null)
    }
    // For per_camper items, sum quantities across all campers and variants
    let total = 0
    campers.forEach(camper => {
      addon.variants.forEach(variant => {
        total += getAddOnQuantity(addon.id, variant.id, camper.id)
      })
      // Also check for null variant (non-variant items)
      if (addon.variants.length === 0) {
        total += getAddOnQuantity(addon.id, null, camper.id)
      }
    })
    return total
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

  // Set variant for a specific camper
  const setVariantForCamper = (camperId: string, variantId: string) => {
    setVariantsPerCamper(prev => ({
      ...prev,
      [camperId]: variantId
    }))
  }

  // Check if all selected campers have variants selected
  const allCampersHaveVariants = () => {
    if (!isPerCamperWithVariants) return true
    return selectedCampers.every(camperId => variantsPerCamper[camperId])
  }

  const handleAdd = () => {
    if (needsCamperSelection && selectedCampers.length === 0) return

    // For per_order items, add once with null camperId
    if (addon.scope === 'per_order') {
      if (needsVariant && !selectedVariant) return
      addAddOn({
        addonId: addon.id,
        variantId: selectedVariant?.id ?? null,
        camperId: null,
        quantity: 1,
        unitPrice: selectedVariant?.priceOverride ?? addon.price,
      })
    } else {
      // For per_camper items, add for each selected camper with their specific variant
      selectedCampers.forEach(camperId => {
        const variantId = isPerCamperWithVariants ? variantsPerCamper[camperId] : (selectedVariant?.id ?? null)
        if (isPerCamperWithVariants && !variantId) return // Skip if no variant selected for this camper

        const variant = variantId ? getVariantById(variantId) : null
        const price = variant?.priceOverride ?? addon.price

        addAddOn({
          addonId: addon.id,
          variantId: variantId,
          camperId: camperId,
          quantity: 1,
          unitPrice: price,
        })
      })
    }
  }

  const handleQuantityChange = (delta: number) => {
    if (addon.scope === 'per_order') {
      const newQuantity = getAddOnQuantity(addon.id, selectedVariant?.id ?? null, null) + delta
      updateAddOnQuantity(addon.id, selectedVariant?.id ?? null, null, newQuantity)
    } else {
      // Update quantity for each camper with their specific variant
      campers.forEach(camper => {
        // Find if this camper has any addon with any variant
        addon.variants.forEach(variant => {
          const qty = getAddOnQuantity(addon.id, variant.id, camper.id)
          if (qty > 0) {
            updateAddOnQuantity(addon.id, variant.id, camper.id, qty + delta)
          }
        })
        // Also handle non-variant items
        if (addon.variants.length === 0) {
          const qty = getAddOnQuantity(addon.id, null, camper.id)
          if (qty > 0) {
            updateAddOnQuantity(addon.id, null, camper.id, qty + delta)
          }
        }
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

        {/* Variant Selection - for per_order items only */}
        {needsVariant && addon.scope === 'per_order' && (
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

        {/* Camper Selection (for per-camper items) - Multi-select with per-camper size */}
        {needsCamperSelection && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Select Campers {isPerCamperWithVariants && '& Sizes'}
              </label>
              <button
                onClick={selectAllCampers}
                className="text-xs text-neon hover:text-neon/80 transition-colors"
              >
                Select All
              </button>
            </div>

            {/* Per-camper selection with individual size dropdowns */}
            <div className="space-y-3">
              {campers.map((camper) => (
                <div
                  key={camper.id}
                  className={cn(
                    'border p-3 transition-all',
                    selectedCampers.includes(camper.id)
                      ? 'border-neon/50 bg-neon/5'
                      : 'border-white/10 bg-white/[0.02]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleCamperSelection(camper.id)}
                      className="flex items-center gap-2 text-left"
                    >
                      <div
                        className={cn(
                          'w-5 h-5 border flex items-center justify-center transition-all',
                          selectedCampers.includes(camper.id)
                            ? 'border-neon bg-neon'
                            : 'border-white/30'
                        )}
                      >
                        {selectedCampers.includes(camper.id) && (
                          <Check className="h-3 w-3 text-black" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm font-semibold uppercase tracking-wider',
                          selectedCampers.includes(camper.id) ? 'text-white' : 'text-white/60'
                        )}
                      >
                        {camper.firstName || 'Camper'}
                      </span>
                    </button>

                    {/* Size selector for this camper */}
                    {isPerCamperWithVariants && selectedCampers.includes(camper.id) && (
                      <div className="flex gap-1.5">
                        {addon.variants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => setVariantForCamper(camper.id, variant.id)}
                            disabled={variant.isSoldOut}
                            className={cn(
                              'px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-all',
                              variantsPerCamper[camper.id] === variant.id
                                ? 'bg-neon text-black'
                                : variant.isSoldOut
                                ? 'bg-white/5 text-white/20 cursor-not-allowed line-through'
                                : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                            )}
                          >
                            {variant.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Warning if camper selected but no size */}
                  {isPerCamperWithVariants &&
                    selectedCampers.includes(camper.id) &&
                    !variantsPerCamper[camper.id] && (
                      <p className="mt-2 text-xs text-yellow-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Select a size
                      </p>
                    )}
                </div>
              ))}
            </div>

            {selectedCampers.length > 0 && (
              <p className="mt-2 text-xs text-white/40">
                {selectedCampers.length} camper{selectedCampers.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* Simple variant selection for single camper with variants */}
        {needsVariant && addon.scope === 'per_camper' && campers.length === 1 && (
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/40 block mb-2">
              Select Size for {campers[0].firstName || 'Camper'}
            </label>
            <div className="flex flex-wrap gap-2">
              {addon.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => {
                    setSelectedVariant(variant)
                    setVariantForCamper(campers[0].id, variant.id)
                  }}
                  disabled={variant.isSoldOut}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all',
                    variantsPerCamper[campers[0].id] === variant.id
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
                (needsVariant && addon.scope === 'per_order' && !selectedVariant) ||
                (needsCamperSelection && selectedCampers.length === 0) ||
                (isPerCamperWithVariants && !allCampersHaveVariants())
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
