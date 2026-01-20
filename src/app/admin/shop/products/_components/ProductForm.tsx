'use client'

/**
 * Product Form Component
 *
 * Shared form for creating and editing products.
 * Handles variants, images, and all product settings.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  generateSlug,
  type ShopProductVariant,
} from '@/lib/utils/shop-utils'
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Star,
  Tag,
  Package,
  DollarSign,
  Layers,
  X,
} from 'lucide-react'

interface ProductFormProps {
  mode: 'create' | 'edit'
  productId?: string
}

interface ProductFormData {
  name: string
  slug: string
  description: string
  category: 'apparel' | 'gear' | 'digital' | 'addons'
  price_cents: number
  image_url: string
  is_active: boolean
  is_featured: boolean
  inventory_quantity: number | null
  tags: string[]
}

interface VariantFormData {
  id?: string
  name: string
  sku: string
  price_cents: number | null
  inventory_quantity: number | null
  sort_order: number
}

const DEFAULT_PRODUCT: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  category: 'apparel',
  price_cents: 0,
  image_url: '',
  is_active: true,
  is_featured: false,
  inventory_quantity: null,
  tags: [],
}

const AVAILABLE_TAGS = ['bestseller', 'new', 'scholarship']

export default function ProductForm({ mode, productId }: ProductFormProps) {
  const router = useRouter()
  const { user, role, tenant } = useAuth()

  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [product, setProduct] = useState<ProductFormData>(DEFAULT_PRODUCT)
  const [variants, setVariants] = useState<VariantFormData[]>([])
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([])

  // Auto-generate slug from name
  const [autoSlug, setAutoSlug] = useState(true)

  useEffect(() => {
    if (mode === 'edit' && productId) {
      loadProduct()
    }
  }, [mode, productId])

  async function loadProduct() {
    setLoading(true)
    setError(null)

    try {
      if (!productId) {
        throw new Error('Product ID missing')
      }

      const res = await fetch(`/api/admin/shop/products/${productId}`)
      const { data, error: fetchError } = await res.json()

      if (fetchError || !data) {
        throw new Error('Product not found')
      }

      setProduct({
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        category: data.category as ProductFormData['category'],
        price_cents: data.price_cents,
        image_url: data.image_url || '',
        is_active: data.is_active,
        is_featured: data.is_featured,
        inventory_quantity: data.inventory_quantity,
        tags: data.tags || [],
      })

      if (data.variants && data.variants.length > 0) {
        setVariants(
          data.variants.map((v: ShopProductVariant) => ({
            id: v.id,
            name: v.name,
            sku: v.sku || '',
            price_cents: v.price_cents,
            inventory_quantity: v.inventory_quantity,
            sort_order: v.sort_order,
          }))
        )
      }

      setAutoSlug(false) // Don't auto-update slug for existing products
    } catch (err) {
      console.error('Failed to load product:', err)
      setError(err instanceof Error ? err.message : 'Failed to load product')
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Validate
      if (!product.name.trim()) {
        throw new Error('Product name is required')
      }
      if (!product.slug.trim()) {
        throw new Error('Product slug is required')
      }
      if (product.price_cents < 0) {
        throw new Error('Price must be 0 or greater')
      }

      const productData = {
        name: product.name.trim(),
        slug: product.slug.trim(),
        description: product.description.trim() || null,
        category: product.category,
        price_cents: Math.round(product.price_cents),
        image_url: product.image_url.trim() || null,
        is_active: product.is_active,
        is_featured: product.is_featured,
        inventory_quantity: product.inventory_quantity,
        tags: product.tags,
        licensee_id: role === 'hq_admin' ? null : tenant?.id,
      }

      let savedProductId: string

      if (mode === 'create') {
        const res = await fetch('/api/admin/shop/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        })
        const { data, error: createError } = await res.json()
        if (createError || !data) {
          throw new Error(createError || 'Failed to create product')
        }
        savedProductId = data.id
      } else {
        if (!productId) throw new Error('Product ID missing')
        const res = await fetch(`/api/admin/shop/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        })
        const { error: updateError } = await res.json()
        if (updateError) {
          throw new Error(updateError || 'Failed to update product')
        }
        savedProductId = productId
      }

      // Handle variants
      // Delete removed variants
      for (const variantId of deletedVariantIds) {
        await fetch(`/api/admin/shop/variants/${variantId}`, { method: 'DELETE' })
      }

      // Create/update variants
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i]
        const variantData = {
          product_id: savedProductId,
          name: variant.name.trim(),
          sku: variant.sku.trim() || null,
          price_cents: variant.price_cents,
          inventory_quantity: variant.inventory_quantity,
          sort_order: i,
        }

        if (variant.id) {
          await fetch(`/api/admin/shop/variants/${variant.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variantData),
          })
        } else {
          await fetch('/api/admin/shop/variants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variantData),
          })
        }
      }

      // Redirect to catalog
      router.push('/admin/shop')
    } catch (err) {
      console.error('Failed to save product:', err)
      setError(err instanceof Error ? err.message : 'Failed to save product')
    }

    setSaving(false)
  }

  function handleNameChange(name: string) {
    setProduct((prev) => ({
      ...prev,
      name,
      slug: autoSlug ? generateSlug(name) : prev.slug,
    }))
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        name: '',
        sku: '',
        price_cents: null,
        inventory_quantity: null,
        sort_order: prev.length,
      },
    ])
  }

  function updateVariantField<K extends keyof VariantFormData>(
    index: number,
    field: K,
    value: VariantFormData[K]
  ) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    )
  }

  function removeVariant(index: number) {
    const variant = variants[index]
    if (variant.id) {
      setDeletedVariantIds((prev) => [...prev, variant.id!])
    }
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleTag(tag: string) {
    setProduct((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
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

  if (loading) {
    return (
      <AdminLayout
        userRole={role}
        userName={user?.email || 'Admin'}
        tenantName={tenant?.name}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
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
        title={mode === 'create' ? 'Add Product' : 'Edit Product'}
        description={mode === 'create' ? 'Create a new product for the Empowered Locker' : 'Update product details and variants'}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Locker Room', href: '/admin/shop' },
          { label: mode === 'create' ? 'Add Product' : 'Edit Product' },
        ]}
      >
        <Link
          href="/admin/shop"
          className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white font-bold uppercase tracking-wider hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </PageHeader>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta" />
          <p className="text-magenta">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <ContentCard title="Product Details" accent="neon">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    placeholder="e.g., Empowered Champion Tee"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                      URL Slug *
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSlug}
                        onChange={(e) => setAutoSlug(e.target.checked)}
                        className="h-3 w-3"
                      />
                      Auto-generate
                    </label>
                  </div>
                  <input
                    type="text"
                    value={product.slug}
                    onChange={(e) => {
                      setAutoSlug(false)
                      setProduct((prev) => ({ ...prev, slug: e.target.value }))
                    }}
                    className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none font-mono"
                    placeholder="empowered-champion-tee"
                    required
                  />
                  <p className="text-xs text-white/40 mt-1">
                    /shop/{product.slug || 'your-product-slug'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Description
                  </label>
                  <textarea
                    value={product.description}
                    onChange={(e) => setProduct((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full bg-black border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                    placeholder="Describe your product..."
                  />
                </div>
              </div>
            </ContentCard>

            {/* Pricing & Inventory */}
            <ContentCard title="Pricing & Inventory" accent="purple">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    <DollarSign className="h-3 w-3 inline mr-1" />
                    Price (cents) *
                  </label>
                  <input
                    type="number"
                    value={product.price_cents}
                    onChange={(e) => setProduct((prev) => ({ ...prev, price_cents: parseInt(e.target.value) || 0 }))}
                    min="0"
                    className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    placeholder="2999"
                    required
                  />
                  <p className="text-xs text-white/40 mt-1">
                    e.g., 2999 = $29.99
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    <Package className="h-3 w-3 inline mr-1" />
                    Inventory Quantity
                  </label>
                  <input
                    type="number"
                    value={product.inventory_quantity ?? ''}
                    onChange={(e) => setProduct((prev) => ({
                      ...prev,
                      inventory_quantity: e.target.value === '' ? null : parseInt(e.target.value),
                    }))}
                    min="0"
                    className="w-full h-12 bg-black border border-white/10 px-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                    placeholder="Leave empty for unlimited"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Leave blank for unlimited stock
                  </p>
                </div>
              </div>
            </ContentCard>

            {/* Variants */}
            <ContentCard
              title="Variants"
              description="Add sizes, colors, or other options"
              accent="magenta"
              action={
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neon border border-neon/30 hover:bg-neon/10 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Variant
                </button>
              }
            >
              {variants.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="h-8 w-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">
                    No variants. Add variants if this product has multiple sizes or options.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div
                      key={index}
                      className="p-4 bg-black border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                          Variant {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="p-1 text-white/40 hover:text-magenta hover:bg-magenta/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs text-white/40 mb-1">Name *</label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => updateVariantField(index, 'name', e.target.value)}
                            className="w-full h-10 bg-dark-100 border border-white/10 px-3 text-sm text-white focus:border-neon focus:outline-none"
                            placeholder="e.g., Small, Medium, Large"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Price Override (cents)</label>
                          <input
                            type="number"
                            value={variant.price_cents ?? ''}
                            onChange={(e) => updateVariantField(index, 'price_cents', e.target.value === '' ? null : parseInt(e.target.value))}
                            className="w-full h-10 bg-dark-100 border border-white/10 px-3 text-sm text-white focus:border-neon focus:outline-none"
                            placeholder="Base price"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Stock</label>
                          <input
                            type="number"
                            value={variant.inventory_quantity ?? ''}
                            onChange={(e) => updateVariantField(index, 'inventory_quantity', e.target.value === '' ? null : parseInt(e.target.value))}
                            className="w-full h-10 bg-dark-100 border border-white/10 px-3 text-sm text-white focus:border-neon focus:outline-none"
                            placeholder="Unlimited"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <ContentCard title="Status" accent="neon">
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-black border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-3">
                    {product.is_active ? (
                      <Eye className="h-5 w-5 text-neon" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-white/40" />
                    )}
                    <span className="font-bold text-white">Active</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={product.is_active}
                    onChange={(e) => setProduct((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-black border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <Star className={`h-5 w-5 ${product.is_featured ? 'text-yellow-500' : 'text-white/40'}`} />
                    <span className="font-bold text-white">Featured</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={product.is_featured}
                    onChange={(e) => setProduct((prev) => ({ ...prev, is_featured: e.target.checked }))}
                    className="h-5 w-5"
                  />
                </label>
              </div>
            </ContentCard>

            {/* Category */}
            <ContentCard title="Category" accent="purple">
              <select
                value={product.category}
                onChange={(e) => setProduct((prev) => ({ ...prev, category: e.target.value as ProductFormData['category'] }))}
                className="w-full h-12 bg-black border border-white/10 px-4 text-white focus:border-neon focus:outline-none"
              >
                <option value="apparel">Player Gear</option>
                <option value="gear">Camp Essentials</option>
                <option value="digital">Coach & Director Tools</option>
                <option value="addons">Extras & Add-ons</option>
              </select>
            </ContentCard>

            {/* Tags */}
            <ContentCard title="Tags" accent="magenta">
              <div className="space-y-2">
                {AVAILABLE_TAGS.map((tag) => (
                  <label
                    key={tag}
                    className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
                      product.tags.includes(tag)
                        ? 'bg-neon/10 border-neon/30'
                        : 'bg-black border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={product.tags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="h-4 w-4"
                    />
                    <span className="text-white capitalize">{tag === 'bestseller' ? 'Staff Favorite' : tag === 'new' ? 'New Drop' : 'Supports Scholarships'}</span>
                  </label>
                ))}
              </div>
            </ContentCard>

            {/* Image */}
            <ContentCard title="Image" accent="neon">
              <div className="space-y-4">
                {product.image_url ? (
                  <div className="relative aspect-square bg-black">
                    <Image
                      src={product.image_url}
                      alt="Product preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setProduct((prev) => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 p-2 bg-black/80 text-white hover:bg-magenta transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="aspect-square bg-black border border-dashed border-white/20 flex flex-col items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-white/20 mb-2" />
                    <p className="text-xs text-white/40">No image</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-white/40 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={product.image_url}
                    onChange={(e) => setProduct((prev) => ({ ...prev, image_url: e.target.value }))}
                    className="w-full h-10 bg-black border border-white/10 px-3 text-sm text-white focus:border-neon focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </ContentCard>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-neon text-black font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {mode === 'create' ? 'Create Product' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
