'use client'

/**
 * Shop Cart Context
 *
 * Client-side cart state management for the Empowered Locker.
 * Persists cart to localStorage so items survive page refreshes.
 *
 * Usage:
 *   const { cart, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal } = useShopCart()
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { type ShopProduct, type ShopProductVariant } from '@/lib/utils/shop-utils'

// ============================================================================
// TYPES
// ============================================================================

export interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
}

export interface CartItemWithProduct extends CartItem {
  product: ShopProduct
  variant: ShopProductVariant | null
}

interface ShopCartContextType {
  // Raw cart items (product/variant IDs and quantities)
  cart: CartItem[]

  // Cart items with full product data (for display)
  cartWithProducts: CartItemWithProduct[]

  // Loading state (while fetching product data)
  loading: boolean

  // Actions
  addItem: (productId: string, variantId: string | null, quantity?: number) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void
  clearCart: () => void

  // Computed values
  itemCount: number
  subtotal: number

  // Cart visibility (for mini-cart)
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CART_STORAGE_KEY = 'empowered_locker_cart'

// ============================================================================
// CONTEXT
// ============================================================================

const ShopCartContext = createContext<ShopCartContextType | undefined>(undefined)

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartWithProducts, setCartWithProducts] = useState<CartItemWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setCart(parsed)
          }
        } catch (e) {
          console.error('Failed to parse cart from localStorage:', e)
        }
      }
      setIsInitialized(true)
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    }
  }, [cart, isInitialized])

  // Fetch product data whenever cart changes
  useEffect(() => {
    async function fetchProducts() {
      if (cart.length === 0) {
        setCartWithProducts([])
        setLoading(false)
        return
      }

      setLoading(true)

      const productIds = [...new Set(cart.map((item) => item.productId))]

      try {
        const response = await fetch(`/api/shop/products?ids=${productIds.join(',')}`)
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }
        const products: ShopProduct[] = await response.json()

        if (!products || products.length === 0) {
          console.error('No products found for cart')
          setLoading(false)
          return
        }

        // Build cart with products
        const cartItems: CartItemWithProduct[] = []

        for (const item of cart) {
          const product = products.find((p) => p.id === item.productId)
          if (!product) continue

          const variant = item.variantId
            ? product.variants?.find((v) => v.id === item.variantId) || null
            : null

          cartItems.push({
            ...item,
            product,
            variant,
          })
        }

        setCartWithProducts(cartItems)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch cart products:', error)
        setLoading(false)
      }
    }

    fetchProducts()
  }, [cart])

  // Add item to cart
  const addItem = useCallback((productId: string, variantId: string | null, quantity: number = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === productId && item.variantId === variantId
      )

      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        }
        return updated
      }

      // Add new item
      return [...prev, { productId, variantId, quantity }]
    })
  }, [])

  // Remove item from cart
  const removeItem = useCallback((productId: string, variantId: string | null) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
    )
  }, [])

  // Update item quantity
  const updateQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, variantId)
      return
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity }
          : item
      )
    )
  }, [removeItem])

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([])
    setCartWithProducts([])
  }, [])

  // Calculate item count
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Calculate subtotal
  const subtotal = cartWithProducts.reduce((sum, item) => {
    const price = item.variant?.price_cents ?? item.product.price_cents
    return sum + price * item.quantity
  }, 0)

  // Cart visibility controls
  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), [])

  return (
    <ShopCartContext.Provider
      value={{
        cart,
        cartWithProducts,
        loading,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </ShopCartContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useShopCart() {
  const context = useContext(ShopCartContext)
  if (context === undefined) {
    throw new Error('useShopCart must be used within a ShopCartProvider')
  }
  return context
}
