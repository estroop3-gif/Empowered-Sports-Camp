'use client'

/**
 * Licensee Shop Page
 *
 * View shop items and local sales for the territory.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  ShoppingBag,
  Loader2,
  AlertCircle,
  DollarSign,
  Package,
  TrendingUp,
  ExternalLink,
  Eye,
} from 'lucide-react'

interface ShopProduct {
  id: string
  name: string
  price: number
  category: string
  status: 'active' | 'inactive' | 'out_of_stock'
  local_sales: number
  image_url: string | null
}

interface ShopStats {
  localRevenue: number
  ordersThisMonth: number
  totalOrders: number
  topProducts: Array<{
    productId: string
    productName: string
    category: string
    unitsSold: number
    revenue: number
    imageUrl: string | null
  }>
}

interface ShopSummary {
  total_products: number
  local_revenue: number
  orders_this_month: number
  products: ShopProduct[]
}

export default function LicenseeShopPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ShopSummary | null>(null)

  useEffect(() => {
    loadShop()
  }, [])

  async function loadShop() {
    try {
      setLoading(true)
      setError(null)

      // Fetch both products and stats in parallel
      const [productsRes, statsRes] = await Promise.all([
        fetch('/api/shop/products'),
        fetch('/api/licensee/shop', { credentials: 'include' }),
      ])

      const productsJson = await productsRes.json()
      const statsJson = await statsRes.json()

      if (!productsRes.ok) {
        throw new Error(productsJson.error || 'Failed to load products')
      }

      // Stats may fail if user doesn't have permission, but products should still show
      const stats: ShopStats | null = statsRes.ok ? statsJson.data : null

      // Build a map of product sales from stats
      const salesMap = new Map<string, number>()
      if (stats?.topProducts) {
        for (const p of stats.topProducts) {
          salesMap.set(p.productId, p.unitsSold)
        }
      }

      // Transform response
      const products = (productsJson.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price_cents || p.priceCents || 0,
        category: p.category || 'General',
        status: p.is_active || p.isActive ? 'active' : 'inactive',
        local_sales: salesMap.get(p.id) || 0,
        image_url: p.image_url || p.imageUrl,
      }))

      setData({
        total_products: products.length,
        local_revenue: stats?.localRevenue || 0,
        orders_this_month: stats?.ordersThisMonth || 0,
        products,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  return (
    <LmsGate featureName="shop management">
      <div>
        <PortalPageHeader
          title="Shop"
          description="View products and track local sales"
          actions={
            <Link
              href="/shop"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View Public Shop
            </Link>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 text-neon animate-spin" />
          </div>
        ) : error ? (
          <PortalCard>
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Error Loading Shop</h3>
              <p className="text-white/50 mb-4">{error}</p>
              <button
                onClick={loadShop}
                className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </PortalCard>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <PortalCard accent="neon">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                    <Package className="h-6 w-6 text-neon" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {data?.total_products || 0}
                    </div>
                    <div className="text-sm text-white/50 uppercase">Products</div>
                  </div>
                </div>
              </PortalCard>

              <PortalCard>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-purple" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(data?.local_revenue || 0)}
                    </div>
                    <div className="text-sm text-white/50 uppercase">Local Revenue</div>
                  </div>
                </div>
              </PortalCard>

              <PortalCard>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-magenta" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {data?.orders_this_month || 0}
                    </div>
                    <div className="text-sm text-white/50 uppercase">Orders This Month</div>
                  </div>
                </div>
              </PortalCard>
            </div>

            {/* Products Grid */}
            <PortalCard title="Available Products">
              {!data?.products || data.products.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">No Products Available</h3>
                  <p className="text-white/50">
                    Products are managed by HQ. Contact support to add new merchandise.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {data.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </PortalCard>

            {/* Info Footer */}
            <div className="mt-8 p-4 bg-white/5 border border-white/10">
              <p className="text-sm text-white/50">
                <span className="font-bold text-white">Shop Management:</span> Products are managed
                centrally by HQ. You can view available products and track sales in your territory.
                For product additions or changes, contact the HQ team.
              </p>
            </div>
          </>
        )}
      </div>
    </LmsGate>
  )
}

function ProductCard({ product }: { product: ShopProduct }) {
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'bg-neon/20 text-neon' },
    inactive: { label: 'Inactive', color: 'bg-white/10 text-white/50' },
    out_of_stock: { label: 'Out of Stock', color: 'bg-magenta/20 text-magenta' },
  }

  const config = statusConfig[product.status] || statusConfig.active

  return (
    <div className="p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      {/* Image placeholder */}
      <div className="aspect-square bg-white/5 mb-4 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ShoppingBag className="h-12 w-12 text-white/20" />
        )}
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-white">{product.name}</h3>
        <span className={cn('px-2 py-0.5 text-[10px] font-bold uppercase', config.color)}>
          {config.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-white/50">{product.category}</span>
        <span className="font-bold text-neon">{formatCurrency(product.price)}</span>
      </div>

      {product.local_sales > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10 text-sm text-white/50">
          {product.local_sales} sold locally
        </div>
      )}
    </div>
  )
}
