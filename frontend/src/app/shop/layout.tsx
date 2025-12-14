'use client'

/**
 * Shop Layout
 *
 * Wraps all shop pages with the ShopCartProvider.
 * Uses the public site layout (header/footer).
 */

import { ShopCartProvider } from '@/lib/shop/cart-context'

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ShopCartProvider>
      {children}
    </ShopCartProvider>
  )
}
