'use client'

/**
 * Locker Room Manager - Catalog
 *
 * Admin interface for managing shop products and inventory.
 * HQ admins can manage all products; licensees see their own.
 *
 * Route: /admin/shop
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  formatPrice,
  CATEGORY_LABELS,
  type ShopProduct,
} from '@/lib/services/shop'
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  DollarSign,
  Tag,
  Loader2,
  AlertCircle,
  Star,
  MoreVertical,
  Archive,
} from 'lucide-react'

type CategoryFilter = 'all' | 'apparel' | 'gear' | 'digital' | 'addons'

export default function AdminShopPage() {
  const { user, role, tenant } = useAuth()

  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showInactive, setShowInactive] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ShopProduct | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    setError(null)

    try {
      // HQ admin sees all, licensee sees their own
      const params = new URLSearchParams()
      if (role !== 'hq_admin' && tenant?.id) {
        params.set('licenseeId', tenant.id)
      }

      const res = await fetch(`/api/admin/shop/products?${params}`)
      const { data, error: fetchError } = await res.json()

      if (fetchError) {
        console.error('Failed to load products:', fetchError)
        setError('Failed to load products')
      } else {
        setProducts(data || [])
      }
    } catch (err) {
      console.error('Failed to load products:', err)
      setError('Failed to load products')
    }

    setLoading(false)
  }

  async function handleDelete(product: ShopProduct) {
    setDeleting(true)

    try {
      const res = await fetch(`/api/admin/shop/products/${product.id}`, {
        method: 'DELETE',
      })
      const { error: deleteError } = await res.json()

      if (deleteError) {
        console.error('Failed to delete product:', deleteError)
        setError('Failed to delete product')
      } else {
        setProducts((prev) => prev.filter((p) => p.id !== product.id))
      }
    } catch (err) {
      console.error('Failed to delete product:', err)
      setError('Failed to delete product')
    }

    setDeleting(false)
    setDeleteTarget(null)
  }

  // Filter products
  const filteredProducts = products.filter((product) => {
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !product.name.toLowerCase().includes(query) &&
        !product.slug.toLowerCase().includes(query) &&
        !(product.description?.toLowerCase().includes(query))
      ) {
        return false
      }
    }

    // Category
    if (categoryFilter !== 'all' && product.category !== categoryFilter) {
      return false
    }

    // Active status
    if (!showInactive && !product.is_active) {
      return false
    }

    return true
  })

  // Stats
  const stats = {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    featured: products.filter((p) => p.is_featured).length,
    lowStock: products.filter((p) => p.inventory_quantity !== null && p.inventory_quantity <= 5).length,
  }

  if (!user || (role !== 'hq_admin' && role !== 'licensee_owner')) {
    return (
      <AdminLayout
        userRole={role || 'director'}
        userName={user?.email || 'User'}
        tenantName={tenant?.name}
      >
        <div className="flex items-center justify-center py-20">
          <p className="text-white/50">You don't have permission to access this page.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      userRole={role}
      userName={user?.email || 'Admin'}
      tenantName={tenant?.name}
    >
      <PageHeader
        title="Locker Room"
        description="Manage your Empowered Locker products and inventory"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Locker Room' },
        ]}
      >
        <Link
          href="/admin/shop/products/new"
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Product
        </Link>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Products"
          value={stats.total}
          icon={Package}
          color="neon"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={Eye}
          color="purple"
        />
        <StatCard
          label="Featured"
          value={stats.featured}
          icon={Star}
          color="magenta"
        />
        <StatCard
          label="Low Stock"
          value={stats.lowStock}
          icon={AlertCircle}
          color={stats.lowStock > 0 ? 'magenta' : 'neon'}
        />
      </div>

      {/* Filters */}
      <ContentCard className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-black border border-white/10 pl-12 pr-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-white/50" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="h-12 bg-black border border-white/10 px-4 text-white focus:border-neon focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="apparel">Player Gear</option>
              <option value="gear">Camp Essentials</option>
              <option value="digital">Coach & Director Tools</option>
              <option value="addons">Extras & Add-ons</option>
            </select>
          </div>

          {/* Show Inactive Toggle */}
          <label className="flex items-center gap-2 px-4 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 bg-black border border-white/30 checked:bg-neon checked:border-neon"
            />
            <span className="text-sm text-white/60">Show Inactive</span>
          </label>
        </div>
      </ContentCard>

      {/* Products Table */}
      <ContentCard title="Product Catalog">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neon" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <p className="text-magenta mb-4">{error}</p>
            <button
              onClick={loadProducts}
              className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 mb-4">
              {searchQuery || categoryFilter !== 'all'
                ? 'No products match your filters'
                : 'No products yet. Add your first product!'}
            </p>
            {!searchQuery && categoryFilter === 'all' && (
              <Link
                href="/admin/shop/products/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add Product
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Product
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Category
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Price
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Stock
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Status
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onDelete={() => setDeleteTarget(product)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-dark-100 border border-white/10 p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Delete Product?</h3>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 border border-white/20 text-white font-bold uppercase tracking-wider hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={deleting}
                className="flex-1 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

/**
 * Stat Card Component
 */
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: 'neon' | 'magenta' | 'purple'
}) {
  const colorClasses = {
    neon: 'bg-neon/10 border-neon/30 text-neon',
    magenta: 'bg-magenta/10 border-magenta/30 text-magenta',
    purple: 'bg-purple/10 border-purple/30 text-purple',
  }

  return (
    <div className="bg-black border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-white/50">
          {label}
        </span>
        <div className={`p-2 border ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  )
}

/**
 * Product Row Component
 */
function ProductRow({
  product,
  onDelete,
}: {
  product: ShopProduct
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const categoryLabel = CATEGORY_LABELS[product.category] || product.category

  const stockDisplay =
    product.inventory_quantity === null
      ? 'Unlimited'
      : product.inventory_quantity <= 0
        ? 'Out of Stock'
        : product.inventory_quantity <= 5
          ? `${product.inventory_quantity} (Low)`
          : product.inventory_quantity.toString()

  const stockColor =
    product.inventory_quantity === null
      ? 'text-white/50'
      : product.inventory_quantity <= 0
        ? 'text-magenta'
        : product.inventory_quantity <= 5
          ? 'text-yellow-500'
          : 'text-white'

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      {/* Product */}
      <td className="py-4 pr-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-dark-100 flex-shrink-0">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-white/20" />
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-white">{product.name}</p>
            <p className="text-xs text-white/40">{product.slug}</p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="py-4 pr-4">
        <span className="text-sm text-white/60">{categoryLabel}</span>
      </td>

      {/* Price */}
      <td className="py-4 pr-4">
        <span className="font-bold text-neon">{formatPrice(product.price_cents)}</span>
        {product.variants && product.variants.length > 0 && (
          <span className="text-xs text-white/40 ml-2">
            +{product.variants.length} variants
          </span>
        )}
      </td>

      {/* Stock */}
      <td className="py-4 pr-4">
        <span className={`text-sm font-medium ${stockColor}`}>{stockDisplay}</span>
      </td>

      {/* Status */}
      <td className="py-4 pr-4">
        <div className="flex items-center gap-2">
          {product.is_active ? (
            <span className="flex items-center gap-1 text-xs text-neon">
              <Eye className="h-3 w-3" />
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-white/40">
              <EyeOff className="h-3 w-3" />
              Inactive
            </span>
          )}
          {product.is_featured && (
            <span className="flex items-center gap-1 text-xs text-yellow-500">
              <Star className="h-3 w-3" />
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 text-right relative">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/shop/${product.slug}`}
            target="_blank"
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="View in Store"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`/admin/shop/products/${product.id}`}
            className="p-2 text-white/40 hover:text-neon hover:bg-neon/10 transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button
            onClick={onDelete}
            className="p-2 text-white/40 hover:text-magenta hover:bg-magenta/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
