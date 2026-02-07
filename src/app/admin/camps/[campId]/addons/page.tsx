'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Loader2,
  AlertCircle,
  Check,
  X,
  Star,
  Library,
  Copy,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Addon {
  id: string
  tenant_id: string
  camp_id: string | null
  name: string
  description: string | null
  price_cents: number
  is_required: boolean
  max_quantity: number
  is_active: boolean
  is_default: boolean
  created_at: string
  variants: Array<{
    id: string
    name: string
    price_adjustment_cents: number
    inventory: number | null
    is_active: boolean
  }>
}

interface ShopAddon {
  id: string
  licensee_id: string | null
  name: string
  slug: string
  description: string | null
  price_cents: number
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  variants?: Array<{
    id: string
    name: string
    price_cents: number | null
    inventory_quantity: number | null
  }>
}

interface Camp {
  id: string
  name: string
  tenant_id: string | null
}

export default function CampAddonsPage({ params }: { params: Promise<{ campId: string }> }) {
  const { campId } = use(params)
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [camp, setCamp] = useState<Camp | null>(null)
  const [addons, setAddons] = useState<Addon[]>([])
  const [shopAddons, setShopAddons] = useState<ShopAddon[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAddon, setEditingAddon] = useState<string | null>(null)

  // Library state
  const [libraryAddons, setLibraryAddons] = useState<Addon[]>([])
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [addingFromLibrary, setAddingFromLibrary] = useState<string | null>(null)
  const [editingLibraryAddon, setEditingLibraryAddon] = useState<string | null>(null)

  // New add-on form state
  const [newAddon, setNewAddon] = useState({
    name: '',
    description: '',
    priceCents: 0,
    isRequired: false,
    maxQuantity: 1,
  })

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    priceCents: 0,
    isRequired: false,
    maxQuantity: 1,
    isDefault: false,
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    priceCents: 0,
    isRequired: false,
    maxQuantity: 1,
  })

  // Library edit form state
  const [libraryEditForm, setLibraryEditForm] = useState({
    name: '',
    description: '',
    priceCents: 0,
    isRequired: false,
    maxQuantity: 1,
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, campId])

  async function loadData() {
    try {
      // Load camp data
      const campRes = await fetch(`/api/admin/camps/${campId}`)
      if (!campRes.ok) {
        throw new Error('Failed to load camp')
      }
      const campData = await campRes.json()
      setCamp(campData.camp)

      // Load add-ons for this camp (from addons table)
      const addonsRes = await fetch(`/api/admin/camps/addons?campId=${campId}`)
      if (addonsRes.ok) {
        const addonsData = await addonsRes.json()
        setAddons(addonsData.addons || [])
      }

      // Load shop product add-ons (these are the ones that appear during registration)
      const tenantId = campData.camp?.tenant_id
      const shopUrl = tenantId
        ? `/api/shop/products?category=addons&tenantId=${tenantId}`
        : '/api/shop/products?category=addons'
      const shopRes = await fetch(shopUrl)
      if (shopRes.ok) {
        const shopData = await shopRes.json()
        // API returns array directly or wrapped in data
        const products = Array.isArray(shopData) ? shopData : shopData.data || []
        setShopAddons(products)
      }

      // Load library add-ons (tenant-scoped templates)
      if (tenantId) {
        const libraryRes = await fetch(
          `/api/admin/camps/addons?tenantId=${tenantId}&library=true`
        )
        if (libraryRes.ok) {
          const libraryData = await libraryRes.json()
          setLibraryAddons(libraryData.addons || [])
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load camp data')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAddon(e: React.FormEvent) {
    e.preventDefault()
    if (!camp) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/camps/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: camp.id,
          tenantId: camp.tenant_id,
          name: newAddon.name,
          description: newAddon.description || null,
          priceCents: Math.round(newAddon.priceCents * 100),
          isRequired: newAddon.isRequired,
          maxQuantity: newAddon.maxQuantity,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create add-on')
      }

      const data = await res.json()
      setAddons([data.addon, ...addons])
      setShowAddForm(false)
      setNewAddon({
        name: '',
        description: '',
        priceCents: 0,
        isRequired: false,
        maxQuantity: 1,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create add-on')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!camp) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/camps/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: null,
          tenantId: camp.tenant_id,
          name: newTemplate.name,
          description: newTemplate.description || null,
          priceCents: Math.round(newTemplate.priceCents * 100),
          isRequired: newTemplate.isRequired,
          maxQuantity: newTemplate.maxQuantity,
          isDefault: newTemplate.isDefault,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create template')
      }

      const data = await res.json()
      setLibraryAddons([data.addon, ...libraryAddons])
      setShowCreateTemplate(false)
      setNewTemplate({
        name: '',
        description: '',
        priceCents: 0,
        isRequired: false,
        maxQuantity: 1,
        isDefault: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddFromLibrary(libraryAddon: Addon) {
    if (!camp) return

    setAddingFromLibrary(libraryAddon.id)
    setError(null)

    try {
      const res = await fetch('/api/admin/camps/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId: camp.id,
          tenantId: camp.tenant_id,
          name: libraryAddon.name,
          description: libraryAddon.description,
          priceCents: libraryAddon.price_cents,
          isRequired: libraryAddon.is_required,
          maxQuantity: libraryAddon.max_quantity,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add to camp')
      }

      const data = await res.json()
      setAddons([data.addon, ...addons])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to camp')
    } finally {
      setAddingFromLibrary(null)
    }
  }

  async function handleToggleDefault(addon: Addon) {
    setError(null)

    try {
      const res = await fetch('/api/admin/camps/addons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId: addon.id,
          isDefault: !addon.is_default,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update default status')
      }

      const data = await res.json()
      setLibraryAddons(libraryAddons.map(a => a.id === addon.id ? data.addon : a))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update default status')
    }
  }

  async function handleUpdateAddon(addonId: string) {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/camps/addons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId,
          name: editForm.name,
          description: editForm.description || null,
          priceCents: Math.round(editForm.priceCents * 100),
          isRequired: editForm.isRequired,
          maxQuantity: editForm.maxQuantity,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update add-on')
      }

      const data = await res.json()
      setAddons(addons.map(a => a.id === addonId ? data.addon : a))
      setEditingAddon(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update add-on')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateLibraryAddon(addonId: string) {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/camps/addons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId,
          name: libraryEditForm.name,
          description: libraryEditForm.description || null,
          priceCents: Math.round(libraryEditForm.priceCents * 100),
          isRequired: libraryEditForm.isRequired,
          maxQuantity: libraryEditForm.maxQuantity,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update template')
      }

      const data = await res.json()
      setLibraryAddons(libraryAddons.map(a => a.id === addonId ? data.addon : a))
      setEditingLibraryAddon(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAddon(addonId: string) {
    if (!confirm('Are you sure you want to delete this add-on?')) return

    try {
      const res = await fetch(`/api/admin/camps/addons?addonId=${addonId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete add-on')
      }

      setAddons(addons.filter(a => a.id !== addonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete add-on')
    }
  }

  async function handleDeleteLibraryAddon(addonId: string) {
    if (!confirm('Are you sure you want to delete this template? This will not affect camps that already have a copy.')) return

    try {
      const res = await fetch(`/api/admin/camps/addons?addonId=${addonId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete template')
      }

      setLibraryAddons(libraryAddons.filter(a => a.id !== addonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  async function handleToggleActive(addon: Addon) {
    try {
      const res = await fetch('/api/admin/camps/addons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId: addon.id,
          isActive: !addon.is_active,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update add-on')
      }

      const data = await res.json()
      setAddons(addons.map(a => a.id === addon.id ? data.addon : a))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update add-on')
    }
  }

  function startEditing(addon: Addon) {
    setEditingAddon(addon.id)
    setEditForm({
      name: addon.name,
      description: addon.description || '',
      priceCents: addon.price_cents / 100,
      isRequired: addon.is_required,
      maxQuantity: addon.max_quantity,
    })
  }

  function startEditingLibrary(addon: Addon) {
    setEditingLibraryAddon(addon.id)
    setLibraryEditForm({
      name: addon.name,
      description: addon.description || '',
      priceCents: addon.price_cents / 100,
      isRequired: addon.is_required,
      maxQuantity: addon.max_quantity,
    })
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  // Check if a library addon name already exists on this camp
  const campAddonNames = new Set(addons.map(a => a.name.toLowerCase()))

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  if (!camp) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Camp Not Found</h2>
          <Link
            href="/admin/camps"
            className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Camps
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="mb-6">
        <Link
          href={`/admin/camps/${campId}`}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {camp.name}
        </Link>
      </div>

      <PageHeader title="Manage Add-Ons" description={`Configure add-ons for ${camp.name}`}>
        <Button variant="neon" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta flex-shrink-0" />
          <p className="text-magenta">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-white/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Registration Add-Ons (from Shop Products) */}
      {shopAddons.length > 0 && (
        <ContentCard title="Registration Add-Ons" accent="neon" className="mb-8">
          <div className="mb-4 flex items-start justify-between">
            <p className="text-sm text-white/50">
              These add-ons appear during registration checkout for all camps. Managed in the Shop.
            </p>
            <Link
              href="/admin/shop"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors whitespace-nowrap ml-4"
            >
              Manage in Shop
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-4">
            {shopAddons.map((product) => (
              <div
                key={product.id}
                className={`p-4 border transition-all ${
                  product.is_active
                    ? 'bg-black/50 border-white/10'
                    : 'bg-black/30 border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-4 w-4 text-neon/60" />
                      <h4 className="font-bold text-white">{product.name}</h4>
                      {product.is_featured && (
                        <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-neon/20 text-neon border border-neon/30">
                          Featured
                        </span>
                      )}
                      {!product.is_active && (
                        <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-white/10 text-white/40 border border-white/20">
                          Inactive
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        Shop Product
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-sm text-white/50 mt-1">{product.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-neon">
                        <DollarSign className="h-4 w-4" />
                        {formatPrice(product.price_cents)}
                      </span>
                      {product.variants && product.variants.length > 0 && (
                        <span className="text-white/40">
                          {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                          {' '}({product.variants.map(v => v.name).join(', ')})
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/admin/shop/products/${product.id}`}
                    className="p-2 text-white/50 hover:text-neon transition-colors"
                    title="Edit in Shop"
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {/* New Add-On Form */}
      {showAddForm && (
        <ContentCard title="New Add-On" accent="neon" className="mb-8">
          <form onSubmit={handleCreateAddon} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  Name *
                </label>
                <Input
                  required
                  value={newAddon.name}
                  onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                  placeholder="e.g., Lunch Package"
                />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  Price ($)
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newAddon.priceCents}
                  onChange={(e) => setNewAddon({ ...newAddon, priceCents: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                Description
              </label>
              <textarea
                value={newAddon.description}
                onChange={(e) => setNewAddon({ ...newAddon, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                placeholder="Optional description..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  Max Quantity
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newAddon.maxQuantity}
                  onChange={(e) => setNewAddon({ ...newAddon, maxQuantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="newRequired"
                  checked={newAddon.isRequired}
                  onChange={(e) => setNewAddon({ ...newAddon, isRequired: e.target.checked })}
                  className="h-5 w-5"
                />
                <label htmlFor="newRequired" className="text-white cursor-pointer">
                  Required add-on
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline-white" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="neon" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Add-On
              </Button>
            </div>
          </form>
        </ContentCard>
      )}

      {/* This Camp's Add-Ons */}
      <ContentCard title="Camp-Specific Add-Ons" accent="purple" className="mb-8">
        {addons.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Camp-Specific Add-Ons</h3>
            <p className="text-white/50 mb-6">
              Create add-ons unique to this camp, or add from the library below.
            </p>
            <Button variant="neon" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Add-On
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {addons.map((addon) => (
              <div
                key={addon.id}
                className={`p-4 border transition-all ${
                  addon.is_active
                    ? 'bg-black/50 border-white/10'
                    : 'bg-black/30 border-white/5 opacity-60'
                }`}
              >
                {editingAddon === addon.id ? (
                  // Edit Form
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Name</label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Price ($)</label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={editForm.priceCents}
                          onChange={(e) => setEditForm({ ...editForm, priceCents: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-white/40">Max Qty:</label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={editForm.maxQuantity}
                            onChange={(e) => setEditForm({ ...editForm, maxQuantity: parseInt(e.target.value) || 1 })}
                            className="w-20"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isRequired}
                            onChange={(e) => setEditForm({ ...editForm, isRequired: e.target.checked })}
                          />
                          <span className="text-xs text-white/60">Required</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-white"
                          onClick={() => setEditingAddon(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="neon"
                          onClick={() => handleUpdateAddon(addon.id)}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display View
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-white">{addon.name}</h4>
                        {addon.is_required && (
                          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-magenta/20 text-magenta border border-magenta/30">
                            Required
                          </span>
                        )}
                        {!addon.is_active && (
                          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-white/10 text-white/40 border border-white/20">
                            Inactive
                          </span>
                        )}
                      </div>
                      {addon.description && (
                        <p className="text-sm text-white/50 mt-1">{addon.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-neon">
                          <DollarSign className="h-4 w-4" />
                          {formatPrice(addon.price_cents)}
                        </span>
                        <span className="text-white/40">
                          Max qty: {addon.max_quantity}
                        </span>
                        {addon.variants.length > 0 && (
                          <span className="text-white/40">
                            {addon.variants.length} variant{addon.variants.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(addon)}
                        className={`p-2 transition-colors ${
                          addon.is_active
                            ? 'text-neon hover:text-neon/70'
                            : 'text-white/30 hover:text-white/50'
                        }`}
                        title={addon.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => startEditing(addon)}
                        className="p-2 text-white/50 hover:text-white transition-colors"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddon(addon.id)}
                        className="p-2 text-white/50 hover:text-magenta transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ContentCard>

      {/* Add-On Library */}
      <ContentCard title="Add-On Library" accent="neon">
        <div className="mb-4">
          <p className="text-sm text-white/50 mb-4">
            Template add-ons shared across all camps. Add them to this camp with one click, or mark as default to auto-add to new camps.
          </p>
          <Button variant="outline-white" onClick={() => setShowCreateTemplate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Create Template Form */}
        {showCreateTemplate && (
          <div className="mb-6 p-4 border border-neon/30 bg-neon/5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neon mb-4">New Template</h4>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Name *
                  </label>
                  <Input
                    required
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Water Bottle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Price ($)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={newTemplate.priceCents}
                    onChange={(e) => setNewTemplate({ ...newTemplate, priceCents: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  Description
                </label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                  placeholder="Optional description..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Max Quantity
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={newTemplate.maxQuantity}
                    onChange={(e) => setNewTemplate({ ...newTemplate, maxQuantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <input
                    type="checkbox"
                    id="templateRequired"
                    checked={newTemplate.isRequired}
                    onChange={(e) => setNewTemplate({ ...newTemplate, isRequired: e.target.checked })}
                    className="h-5 w-5"
                  />
                  <label htmlFor="templateRequired" className="text-white cursor-pointer">
                    Required
                  </label>
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <input
                    type="checkbox"
                    id="templateDefault"
                    checked={newTemplate.isDefault}
                    onChange={(e) => setNewTemplate({ ...newTemplate, isDefault: e.target.checked })}
                    className="h-5 w-5 accent-neon"
                  />
                  <label htmlFor="templateDefault" className="text-white cursor-pointer">
                    Default for new camps
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline-white" onClick={() => setShowCreateTemplate(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="neon" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Template
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Library Add-Ons List */}
        {libraryAddons.length === 0 && !showCreateTemplate ? (
          <div className="py-8 text-center">
            <Library className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white/60 mb-1">No Templates Yet</h3>
            <p className="text-sm text-white/40">
              Create reusable add-on templates to quickly add to any camp.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {libraryAddons.map((addon) => {
              const alreadyOnCamp = campAddonNames.has(addon.name.toLowerCase())

              return (
                <div
                  key={addon.id}
                  className={`p-4 border transition-all ${
                    alreadyOnCamp
                      ? 'bg-black/20 border-white/5 opacity-50'
                      : 'bg-black/50 border-white/10'
                  }`}
                >
                  {editingLibraryAddon === addon.id ? (
                    // Library Edit Form
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Name</label>
                          <Input
                            value={libraryEditForm.name}
                            onChange={(e) => setLibraryEditForm({ ...libraryEditForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Price ($)</label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={libraryEditForm.priceCents}
                            onChange={(e) => setLibraryEditForm({ ...libraryEditForm, priceCents: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Description</label>
                        <textarea
                          value={libraryEditForm.description}
                          onChange={(e) => setLibraryEditForm({ ...libraryEditForm, description: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-white/40">Max Qty:</label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={libraryEditForm.maxQuantity}
                              onChange={(e) => setLibraryEditForm({ ...libraryEditForm, maxQuantity: parseInt(e.target.value) || 1 })}
                              className="w-20"
                            />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={libraryEditForm.isRequired}
                              onChange={(e) => setLibraryEditForm({ ...libraryEditForm, isRequired: e.target.checked })}
                            />
                            <span className="text-xs text-white/60">Required</span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-white"
                            onClick={() => setEditingLibraryAddon(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="neon"
                            onClick={() => handleUpdateLibraryAddon(addon.id)}
                            disabled={saving}
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Library Display View
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-white">{addon.name}</h4>
                            {addon.is_default && (
                              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-neon/20 text-neon border border-neon/30">
                                Default
                              </span>
                            )}
                            {addon.is_required && (
                              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-magenta/20 text-magenta border border-magenta/30">
                                Required
                              </span>
                            )}
                            {alreadyOnCamp && (
                              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-white/10 text-white/40 border border-white/20">
                                Already Added
                              </span>
                            )}
                          </div>
                          {addon.description && (
                            <p className="text-sm text-white/50 mt-1">{addon.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-neon">
                              <DollarSign className="h-4 w-4" />
                              {formatPrice(addon.price_cents)}
                            </span>
                            <span className="text-white/40">
                              Max qty: {addon.max_quantity}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!alreadyOnCamp && (
                            <Button
                              size="sm"
                              variant="neon"
                              onClick={() => handleAddFromLibrary(addon)}
                              disabled={addingFromLibrary === addon.id}
                            >
                              {addingFromLibrary === addon.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Copy className="h-4 w-4 mr-1" />
                              )}
                              Add to Camp
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                        <button
                          onClick={() => handleToggleDefault(addon)}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                            addon.is_default
                              ? 'text-neon bg-neon/10 border border-neon/30 hover:bg-neon/20'
                              : 'text-white/40 bg-white/5 border border-white/10 hover:text-white/60 hover:border-white/20'
                          }`}
                          title={addon.is_default ? 'Remove from defaults' : 'Set as default for new camps'}
                        >
                          <Star className={`h-3.5 w-3.5 ${addon.is_default ? 'fill-neon' : ''}`} />
                          {addon.is_default ? 'Default' : 'Set Default'}
                        </button>
                        <button
                          onClick={() => startEditingLibrary(addon)}
                          className="p-1.5 text-white/40 hover:text-white transition-colors"
                          title="Edit template"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLibraryAddon(addon.id)}
                          className="p-1.5 text-white/40 hover:text-magenta transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ContentCard>
    </AdminLayout>
  )
}
