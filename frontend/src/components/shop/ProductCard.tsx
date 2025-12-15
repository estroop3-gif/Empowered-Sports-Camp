'use client'

/**
 * ProductCard Component
 *
 * Displays a product in the Empowered Locker grid.
 * Shows image, name, category, price, and optional tags.
 */

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, Star, Sparkles, Heart } from 'lucide-react'
import { type ShopProduct, CATEGORY_LABELS, formatPrice } from '@/lib/utils/shop-utils'

interface ProductCardProps {
  product: ShopProduct
  onQuickAdd?: () => void
}

// Tag display configuration
const TAG_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  bestseller: { label: 'Staff Favorite', icon: Star, className: 'bg-neon/10 text-neon' },
  new: { label: 'New Drop', icon: Sparkles, className: 'bg-purple/10 text-purple' },
  scholarship: { label: 'Supports Scholarships', icon: Heart, className: 'bg-magenta/10 text-magenta' },
}

export function ProductCard({ product, onQuickAdd }: ProductCardProps) {
  const categoryLabel = CATEGORY_LABELS[product.category] || product.category

  // Get the first matching tag for display
  const displayTag = product.tags?.find((tag) => TAG_CONFIG[tag])
  const tagConfig = displayTag ? TAG_CONFIG[displayTag] : null

  return (
    <div className="group bg-black border border-white/10 hover:border-neon/50 transition-all duration-300">
      {/* Image Container */}
      <Link href={`/shop/${product.slug}`} className="block relative aspect-square overflow-hidden bg-dark-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple/20 to-magenta/20">
            <ShoppingBag className="h-16 w-16 text-white/20" />
          </div>
        )}

        {/* Featured Badge */}
        {product.is_featured && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-neon text-black text-xs font-bold uppercase tracking-wider">
            Featured
          </div>
        )}

        {/* Tag Badge */}
        {tagConfig && (
          <div className={`absolute top-3 right-3 px-2 py-1 text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${tagConfig.className}`}>
            <tagConfig.icon className="h-3 w-3" />
            {tagConfig.label}
          </div>
        )}

        {/* Quick Add Button - appears on hover */}
        {onQuickAdd && (
          <button
            onClick={(e) => {
              e.preventDefault()
              onQuickAdd()
            }}
            className="absolute bottom-3 left-3 right-3 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to Bag
          </button>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
          {categoryLabel}
        </p>

        {/* Name */}
        <Link href={`/shop/${product.slug}`}>
          <h3 className="font-bold text-white group-hover:text-neon transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <p className="mt-2 text-lg font-black text-neon">
          {formatPrice(product.price_cents, product.currency)}
        </p>

        {/* Variants indicator */}
        {product.variants && product.variants.length > 0 && (
          <p className="text-xs text-white/40 mt-1">
            {product.variants.length} sizes available
          </p>
        )}
      </div>
    </div>
  )
}
