'use client'

/**
 * CartSummary Component
 *
 * Displays cart contents with ability to update quantities.
 * Used on the cart page and in the mini-cart sidebar.
 */

import Link from 'next/link'
import Image from 'next/image'
import { useShopCart, type CartItemWithProduct } from '@/lib/shop/cart-context'
import { formatPrice } from '@/lib/utils/shop-utils'
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Loader2,
} from 'lucide-react'

interface CartSummaryProps {
  showCheckout?: boolean
  compact?: boolean
}

export function CartSummary({ showCheckout = true, compact = false }: CartSummaryProps) {
  const {
    cartWithProducts,
    loading,
    removeItem,
    updateQuantity,
    itemCount,
    subtotal,
  } = useShopCart()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  if (cartWithProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-16 w-16 text-white/20 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Your bag is empty</h3>
        <p className="text-white/50 mb-6">
          Suit up with gear that shows you're part of the movement.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          Shop the Locker
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Cart Items */}
      <div className={`space-y-4 ${compact ? '' : 'divide-y divide-white/10'}`}>
        {cartWithProducts.map((item) => (
          <CartItemRow
            key={`${item.productId}-${item.variantId || 'base'}`}
            item={item}
            compact={compact}
            onRemove={() => removeItem(item.productId, item.variantId)}
            onUpdateQuantity={(qty) => updateQuantity(item.productId, item.variantId, qty)}
          />
        ))}
      </div>

      {/* Totals */}
      <div className={`mt-6 pt-6 border-t border-white/10 ${compact ? 'text-sm' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60">Subtotal ({itemCount} items)</span>
          <span className="text-white font-bold">{formatPrice(subtotal)}</span>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Shipping and taxes calculated at checkout
        </p>

        {showCheckout && (
          <Link
            href="/shop/cart"
            className="block w-full py-4 bg-neon text-black text-center font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors"
          >
            View Bag & Checkout
          </Link>
        )}
      </div>

      {/* Movement reminder */}
      <p className="text-center text-xs text-white/30 mt-4 uppercase tracking-wider">
        This is more than merch. This is your uniform.
      </p>
    </div>
  )
}

/**
 * Individual cart item row
 */
interface CartItemRowProps {
  item: CartItemWithProduct
  compact?: boolean
  onRemove: () => void
  onUpdateQuantity: (quantity: number) => void
}

function CartItemRow({ item, compact, onRemove, onUpdateQuantity }: CartItemRowProps) {
  const { product, variant, quantity } = item
  const price = variant?.price_cents ?? product.price_cents
  const totalPrice = price * quantity

  return (
    <div className={`flex gap-4 ${compact ? 'py-2' : 'py-4'}`}>
      {/* Image */}
      <Link
        href={`/shop/${product.slug}`}
        className={`flex-shrink-0 bg-dark-100 ${compact ? 'h-16 w-16' : 'h-24 w-24'}`}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={compact ? 64 : 96}
            height={compact ? 64 : 96}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-6 w-6 text-white/20" />
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <Link href={`/shop/${product.slug}`}>
          <h4 className={`font-bold text-white hover:text-neon transition-colors ${compact ? 'text-sm' : ''}`}>
            {product.name}
          </h4>
        </Link>
        {variant && (
          <p className="text-sm text-white/50">{variant.name}</p>
        )}
        <p className={`text-neon font-bold ${compact ? 'text-sm' : 'mt-1'}`}>
          {formatPrice(price)}
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center border border-white/20">
            <button
              onClick={() => onUpdateQuantity(quantity - 1)}
              className="p-1 hover:bg-white/10 transition-colors"
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4 text-white/60" />
            </button>
            <span className="px-3 text-sm text-white">{quantity}</span>
            <button
              onClick={() => onUpdateQuantity(quantity + 1)}
              className="p-1 hover:bg-white/10 transition-colors"
            >
              <Plus className="h-4 w-4 text-white/60" />
            </button>
          </div>
          <button
            onClick={onRemove}
            className="p-1 text-white/40 hover:text-magenta transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Line Total */}
      <div className="text-right">
        <p className={`font-bold text-white ${compact ? 'text-sm' : ''}`}>
          {formatPrice(totalPrice)}
        </p>
      </div>
    </div>
  )
}

/**
 * Mini cart icon with item count for header
 */
export function CartIcon() {
  const { itemCount, toggleCart } = useShopCart()

  return (
    <button
      onClick={toggleCart}
      className="relative p-2 text-white/60 hover:text-white transition-colors"
    >
      <ShoppingBag className="h-6 w-6" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-neon text-black text-xs font-bold flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  )
}
