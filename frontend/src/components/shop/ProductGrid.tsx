'use client'

/**
 * ProductGrid Component
 *
 * Displays a grid of products with optional filtering.
 * Used on the main Empowered Locker page.
 */

import { useState } from 'react'
import { ProductCard } from './ProductCard'
import { type ShopProduct, CATEGORY_LABELS } from '@/lib/utils/shop-utils'
import { useShopCart } from '@/lib/shop/cart-context'
import { Filter, Grid, List, ShoppingBag } from 'lucide-react'

interface ProductGridProps {
  products: ShopProduct[]
  showFilters?: boolean
  title?: string
  emptyMessage?: string
}

const CATEGORY_FILTERS = [
  { value: '', label: 'All Gear' },
  { value: 'apparel', label: 'Player Gear' },
  { value: 'gear', label: 'Camp Essentials' },
  { value: 'digital', label: 'Coach & Director Tools' },
  { value: 'addons', label: 'Extras & Add-ons' },
]

export function ProductGrid({
  products,
  showFilters = true,
  title,
  emptyMessage = 'Locker is loading. New drops coming soon.',
}: ProductGridProps) {
  const [categoryFilter, setCategoryFilter] = useState('')
  const { addItem } = useShopCart()

  // Filter products
  const filteredProducts = categoryFilter
    ? products.filter((p) => p.category === categoryFilter)
    : products

  // Separate featured products
  const featuredProducts = filteredProducts.filter((p) => p.is_featured)
  const regularProducts = filteredProducts.filter((p) => !p.is_featured)

  function handleQuickAdd(product: ShopProduct) {
    // If product has variants, don't quick add (user needs to select)
    if (product.variants && product.variants.length > 0) {
      // Navigate to product page instead
      window.location.href = `/shop/${product.slug}`
      return
    }

    addItem(product.id, null, 1)
  }

  return (
    <div>
      {/* Filters */}
      {showFilters && (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Filter className="h-5 w-5 text-white/40" />
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setCategoryFilter(filter.value)}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border transition-colors ${
                categoryFilter === filter.value
                  ? 'bg-neon/10 border-neon text-neon'
                  : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Title */}
      {title && (
        <h2 className="text-xl font-black text-white uppercase tracking-wider mb-6">
          {title}
        </h2>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-20 px-4">
          <div className="inline-flex items-center justify-center h-20 w-20 bg-purple/10 mb-6">
            <ShoppingBag className="h-10 w-10 text-purple" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{emptyMessage}</h3>
          <p className="text-white/50 max-w-md mx-auto">
            We're curating the perfect gear for athletes like you.
            Check back soon for new drops.
          </p>
        </div>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && !categoryFilter && (
        <div className="mb-12">
          <h3 className="text-lg font-bold text-neon uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="h-1 w-8 bg-neon" />
            Featured Drops
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickAdd={() => handleQuickAdd(product)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Products */}
      {regularProducts.length > 0 && (
        <div>
          {!categoryFilter && featuredProducts.length > 0 && (
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="h-1 w-8 bg-white/20" />
              All Gear
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {regularProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickAdd={() => handleQuickAdd(product)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Movement Message */}
      {filteredProducts.length > 0 && (
        <div className="mt-12 text-center py-8 border-t border-white/10">
          <p className="text-white/40 text-sm uppercase tracking-widest">
            Every purchase helps more girls step into confident competition
          </p>
        </div>
      )}
    </div>
  )
}
