'use client'

/**
 * Empowered Locker - Main Shop Page
 *
 * The public storefront for Empowered Sports Camp merchandise.
 * Features movement-focused messaging and brand-aligned design.
 *
 * Route: /shop
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ProductGrid } from '@/components/shop'
import { CartIcon } from '@/components/shop/CartSummary'
import type { ShopProduct } from '@/lib/types/shop'
import {
  ShoppingBag,
  Loader2,
  Sparkles,
  Heart,
  Users,
  Trophy,
} from 'lucide-react'

export default function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/shop/products')
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      setProducts(data || [])
    } catch (err) {
      console.error('Failed to load products:', err)
      setError('Failed to load products')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-dark-100">
      {/* Hero Section */}
      <section className="relative bg-black overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple/20 via-transparent to-black" />

        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon/10 border border-neon/30 text-neon text-sm font-bold uppercase tracking-wider mb-6">
              <ShoppingBag className="h-4 w-4" />
              Join the Movement
            </div>

            {/* Title */}
            <h1 className="text-5xl lg:text-7xl font-black text-white uppercase tracking-tight mb-6">
              Empowered
              <span className="block text-neon">Locker</span>
            </h1>

            {/* Tagline */}
            <p className="text-xl lg:text-2xl text-white/80 font-medium mb-6 max-w-2xl">
              Gear for girls who play fierce and dream bigger.
            </p>

            {/* Supporting Text */}
            <p className="text-white/50 max-w-xl mb-8">
              Every purchase supports growing Empowered Sports Camps and creates more
              opportunities for girls to discover their strength through sports.
              This isn't just merch—it's your uniform for the movement.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-white/60">
                <Users className="h-4 w-4 text-neon" />
                <span>10,000+ athletes empowered</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Trophy className="h-4 w-4 text-purple" />
                <span>50+ camps nationwide</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Heart className="h-4 w-4 text-magenta" />
                <span>100% of proceeds fuel the mission</span>
              </div>
            </div>
          </div>

          {/* Floating Cart Icon (Mobile) */}
          <div className="fixed bottom-6 right-6 z-50 lg:hidden">
            <Link
              href="/shop/cart"
              className="flex items-center justify-center h-14 w-14 bg-neon text-black shadow-lg shadow-neon/30"
            >
              <CartIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="container mx-auto px-4 py-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-neon" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-magenta mb-4">{error}</p>
            <button
              onClick={loadProducts}
              className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <ProductGrid
            products={products}
            showFilters={true}
            emptyMessage="Locker is loading. New drops coming soon."
          />
        )}
      </section>

      {/* Movement CTA Section */}
      <section className="bg-black py-20 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <Sparkles className="h-12 w-12 text-neon mx-auto mb-6" />
          <h2 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tight mb-4">
            Rep the Movement
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-8">
            When you wear Empowered gear, you're showing the world that you believe
            in building confident, fierce, team-first athletes. You're part of
            something bigger than yourself.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/camps"
              className="px-8 py-4 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors"
            >
              Find a Camp
            </Link>
            <Link
              href="/about"
              className="px-8 py-4 border border-white/20 text-white font-bold uppercase tracking-wider hover:bg-white/5 transition-colors"
            >
              Learn Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-neon/5 border-t border-neon/20 py-6">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-white/60 uppercase tracking-widest">
            "Suit up like the athletes you're raising" — Join the Empowered Crew
          </p>
        </div>
      </section>
    </div>
  )
}
