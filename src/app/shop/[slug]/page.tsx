'use client'

/**
 * Product Detail Page
 *
 * Displays full product information with variant selection and add to cart.
 *
 * Route: /shop/[slug]
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useShopCart } from '@/lib/shop/cart-context'
import {
  getProductBySlug,
  formatPrice,
  CATEGORY_LABELS,
  type ShopProduct,
  type ShopProductVariant,
} from '@/lib/services/shop'
import {
  ShoppingBag,
  Loader2,
  ArrowLeft,
  Plus,
  Minus,
  Check,
  Star,
  Sparkles,
  Heart,
  Share2,
  ChevronRight,
} from 'lucide-react'

// Tag display configuration
const TAG_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  bestseller: { label: 'Staff Favorite', icon: Star, className: 'bg-neon/10 text-neon border-neon/30' },
  new: { label: 'New Drop', icon: Sparkles, className: 'bg-purple/10 text-purple border-purple/30' },
  scholarship: { label: 'Supports Scholarships', icon: Heart, className: 'bg-magenta/10 text-magenta border-magenta/30' },
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const { addItem } = useShopCart()

  const [product, setProduct] = useState<ShopProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selection state
  const [selectedVariant, setSelectedVariant] = useState<ShopProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)

  useEffect(() => {
    if (slug) {
      loadProduct()
    }
  }, [slug])

  async function loadProduct() {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getProductBySlug(slug)

    if (fetchError || !data) {
      console.error('Failed to load product:', fetchError)
      setError('Product not found')
    } else {
      setProduct(data)
      // Auto-select first variant if available
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0])
      }
    }

    setLoading(false)
  }

  function handleAddToCart() {
    if (!product) return

    // If product has variants but none selected, show error
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      return
    }

    addItem(product.id, selectedVariant?.id || null, quantity)
    setAddedToCart(true)

    // Reset after 2 seconds
    setTimeout(() => setAddedToCart(false), 2000)
  }

  // Get active price
  const activePrice = selectedVariant?.price_cents ?? product?.price_cents ?? 0

  // Check stock
  const inStock = product?.inventory_quantity === null ||
    (product?.inventory_quantity ?? 0) > 0 ||
    (selectedVariant?.inventory_quantity === null) ||
    (selectedVariant?.inventory_quantity ?? 0) > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neon" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-dark-100 flex flex-col items-center justify-center px-4">
        <ShoppingBag className="h-16 w-16 text-white/20 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Product Not Found</h1>
        <p className="text-white/50 mb-8">This item may have been removed or doesn't exist.</p>
        <Link
          href="/shop"
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Locker
        </Link>
      </div>
    )
  }

  const categoryLabel = CATEGORY_LABELS[product.category] || product.category

  return (
    <div className="min-h-screen bg-dark-100">
      {/* Breadcrumb */}
      <div className="bg-black border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/shop" className="text-white/50 hover:text-white transition-colors">
              Empowered Locker
            </Link>
            <ChevronRight className="h-4 w-4 text-white/30" />
            <Link href={`/shop?category=${product.category}`} className="text-white/50 hover:text-white transition-colors">
              {categoryLabel}
            </Link>
            <ChevronRight className="h-4 w-4 text-white/30" />
            <span className="text-white">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="relative aspect-square bg-black">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple/20 to-magenta/20">
                <ShoppingBag className="h-24 w-24 text-white/20" />
              </div>
            )}

            {/* Featured Badge */}
            {product.is_featured && (
              <div className="absolute top-4 left-4 px-3 py-1 bg-neon text-black text-sm font-bold uppercase tracking-wider">
                Featured
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {product.tags?.map((tag) => {
                const config = TAG_CONFIG[tag]
                if (!config) return null
                return (
                  <div
                    key={tag}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-wider border ${config.className}`}
                  >
                    <config.icon className="h-3 w-3" />
                    {config.label}
                  </div>
                )
              })}
            </div>

            {/* Category */}
            <p className="text-sm text-white/40 uppercase tracking-wider mb-2">
              {categoryLabel}
            </p>

            {/* Name */}
            <h1 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tight mb-4">
              {product.name}
            </h1>

            {/* Price */}
            <p className="text-3xl font-black text-neon mb-6">
              {formatPrice(activePrice, product.currency)}
            </p>

            {/* Description */}
            {product.description && (
              <p className="text-white/60 mb-8 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Variant Selection */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-8">
                <p className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Size / Option
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id
                    const isOutOfStock = variant.inventory_quantity !== null && variant.inventory_quantity <= 0

                    return (
                      <button
                        key={variant.id}
                        onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                        disabled={isOutOfStock}
                        className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border transition-all ${
                          isOutOfStock
                            ? 'border-white/10 text-white/20 cursor-not-allowed line-through'
                            : isSelected
                              ? 'border-neon bg-neon/10 text-neon'
                              : 'border-white/20 text-white hover:border-white/40'
                        }`}
                      >
                        {variant.name}
                      </button>
                    )
                  })}
                </div>
                {selectedVariant && selectedVariant.price_cents && (
                  <p className="text-xs text-white/40 mt-2">
                    Price updated for selected option
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="mb-8">
              <p className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                Quantity
              </p>
              <div className="inline-flex items-center border border-white/20">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-white/10 transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-5 w-5 text-white/60" />
                </button>
                <span className="px-6 text-lg font-bold text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-white/10 transition-colors"
                >
                  <Plus className="h-5 w-5 text-white/60" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="space-y-4">
              <button
                onClick={handleAddToCart}
                disabled={!inStock || (product.variants && product.variants.length > 0 && !selectedVariant)}
                className={`w-full py-4 font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                  addedToCart
                    ? 'bg-neon text-black'
                    : !inStock
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-neon text-black hover:bg-neon/90'
                }`}
              >
                {addedToCart ? (
                  <>
                    <Check className="h-5 w-5" />
                    Added to Bag!
                  </>
                ) : !inStock ? (
                  'Out of Stock'
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" />
                    Add to Bag — {formatPrice(activePrice * quantity, product.currency)}
                  </>
                )}
              </button>

              <Link
                href="/shop/cart"
                className="block w-full py-4 border border-white/20 text-center text-white font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
              >
                View Bag & Checkout
              </Link>
            </div>

            {/* Movement Message */}
            <div className="mt-8 p-4 bg-black border border-white/10">
              <p className="text-sm text-white/50">
                <Heart className="h-4 w-4 text-magenta inline mr-2" />
                Every purchase helps more girls step into confident competition.
                You're part of something bigger.
              </p>
            </div>

            {/* Share */}
            <div className="mt-6 flex items-center gap-4">
              <button className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Shop */}
      <div className="container mx-auto px-4 pb-12">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Empowered Locker
        </Link>
      </div>
    </div>
  )
}
