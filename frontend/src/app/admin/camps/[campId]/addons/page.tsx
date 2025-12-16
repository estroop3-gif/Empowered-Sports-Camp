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
  created_at: string
  variants: Array<{
    id: string
    name: string
    price_adjustment_cents: number
    inventory: number | null
    is_active: boolean
  }>
}

interface Camp {
  id: string
  name: string
  tenant_id: string
}

export default function CampAddonsPage({ params }: { params: Promise<{ campId: string }> }) {
  const { campId } = use(params)
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [camp, setCamp] = useState<Camp | null>(null)
  const [addons, setAddons] = useState<Addon[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAddon, setEditingAddon] = useState<string | null>(null)

  // New add-on form state
  const [newAddon, setNewAddon] = useState({
    name: '',
    description: '',
    priceCents: 0,
    isRequired: false,
    maxQuantity: 1,
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
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

      // Load add-ons for this camp
      const addonsRes = await fetch(`/api/admin/camps/addons?campId=${campId}`)
      if (addonsRes.ok) {
        const addonsData = await addonsRes.json()
        setAddons(addonsData.addons || [])
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

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

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

      {/* Add-Ons List */}
      <ContentCard title="Camp Add-Ons" accent="purple">
        {addons.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Add-Ons Yet</h3>
            <p className="text-white/50 mb-6">
              Create add-ons that campers can purchase during registration.
            </p>
            <Button variant="neon" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Add-On
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
    </AdminLayout>
  )
}
