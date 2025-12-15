'use client'

/**
 * Cart Page
 *
 * Full cart view with checkout functionality.
 *
 * Route: /shop/cart
 */

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useShopCart, type CartItemWithProduct } from '@/lib/shop/cart-context'
import { useAuth } from '@/lib/auth/context'
import { formatPrice } from '@/lib/utils/shop-utils'
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Lock,
  CreditCard,
  Info,
} from 'lucide-react'

export default function CartPage() {
  const router = useRouter()
  const { user, tenant } = useAuth()
  const {
    cartWithProducts,
    loading,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
  } = useShopCart()

  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)

  async function handleCheckout() {
    setCheckingOut(true)
    setCheckoutError(null)
    setCheckoutMessage(null)

    try {
      // Build cart payload
      const cartPayload = cartWithProducts.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      }))

      // Call checkout API
      const response = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: cartPayload,
          profileId: user?.id || null,
          licenseeId: tenant?.id || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed')
      }

      if (data.configured && data.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.sessionUrl
      } else {
        // Stripe not configured - show message
        setCheckoutMessage(data.message || 'Stripe checkout will be wired soon.')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neon" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-100">
      {/* Header */}
      <div className="bg-black border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Continue Shopping
              </Link>
              <h1 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tight">
                Your Bag
              </h1>
            </div>
            {itemCount > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-white/40 hover:text-magenta transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {cartWithProducts.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-20">
            <ShoppingBag className="h-20 w-20 text-white/20 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Your bag is empty</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Suit up with gear that shows you're part of the movement.
              Every purchase fuels more girls stepping onto the court.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-4 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              Shop the Locker
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        ) : (
          /* Cart Content */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Items */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {cartWithProducts.map((item) => (
                  <CartItemCard
                    key={`${item.productId}-${item.variantId || 'base'}`}
                    item={item}
                    onRemove={() => removeItem(item.productId, item.variantId)}
                    onUpdateQuantity={(qty) => updateQuantity(item.productId, item.variantId, qty)}
                  />
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-black border border-white/10 p-6 sticky top-24">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6">
                  Order Summary
                </h2>

                {/* Totals */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Subtotal ({itemCount} items)</span>
                    <span className="text-white font-bold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Shipping</span>
                    <span className="text-white/40">Calculated at checkout</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Tax</span>
                    <span className="text-white/40">Calculated at checkout</span>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">Estimated Total</span>
                      <span className="text-2xl font-black text-neon">{formatPrice(subtotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Error/Message */}
                {checkoutError && (
                  <div className="mb-4 p-3 bg-magenta/10 border border-magenta/30 text-sm text-magenta">
                    {checkoutError}
                  </div>
                )}
                {checkoutMessage && (
                  <div className="mb-4 p-3 bg-neon/10 border border-neon/30 text-sm text-neon">
                    <Info className="h-4 w-4 inline mr-2" />
                    {checkoutMessage}
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut || cartWithProducts.length === 0}
                  className="w-full py-4 bg-neon text-black font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Proceed to Checkout
                    </>
                  )}
                </button>

                {/* Security Note */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
                  <Lock className="h-3 w-3" />
                  Secure checkout powered by Stripe
                </div>

                {/* Movement Message */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-xs text-white/40 text-center">
                    Every purchase helps more girls step into confident competition.
                    You're part of something bigger.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Individual cart item card
 */
interface CartItemCardProps {
  item: CartItemWithProduct
  onRemove: () => void
  onUpdateQuantity: (quantity: number) => void
}

function CartItemCard({ item, onRemove, onUpdateQuantity }: CartItemCardProps) {
  const { product, variant, quantity } = item
  const price = variant?.price_cents ?? product.price_cents
  const totalPrice = price * quantity

  return (
    <div className="bg-black border border-white/10 p-6">
      <div className="flex gap-6">
        {/* Image */}
        <Link
          href={`/shop/${product.slug}`}
          className="flex-shrink-0 w-24 h-24 lg:w-32 lg:h-32 bg-dark-100"
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={128}
              height={128}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-white/20" />
            </div>
          )}
        </Link>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link href={`/shop/${product.slug}`}>
                <h3 className="font-bold text-white hover:text-neon transition-colors">
                  {product.name}
                </h3>
              </Link>
              {variant && (
                <p className="text-sm text-white/50 mt-1">{variant.name}</p>
              )}
              <p className="text-neon font-bold mt-2">
                {formatPrice(price)}
              </p>
            </div>
            <button
              onClick={onRemove}
              className="p-2 text-white/40 hover:text-magenta hover:bg-magenta/10 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>

          {/* Quantity & Total */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center border border-white/20">
              <button
                onClick={() => onUpdateQuantity(quantity - 1)}
                className="p-2 hover:bg-white/10 transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4 text-white/60" />
              </button>
              <span className="px-4 text-white">{quantity}</span>
              <button
                onClick={() => onUpdateQuantity(quantity + 1)}
                className="p-2 hover:bg-white/10 transition-colors"
              >
                <Plus className="h-4 w-4 text-white/60" />
              </button>
            </div>
            <p className="text-lg font-bold text-white">
              {formatPrice(totalPrice)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
