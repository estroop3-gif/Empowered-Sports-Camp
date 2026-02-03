'use client'

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Percent,
  DollarSign,
  Calendar,
  Loader2,
  AlertCircle,
  Check,
  X,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromoCode {
  id: string
  tenant_id: string
  tenant_name: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  applies_to: 'registration' | 'addons' | 'both'
  max_uses: number | null
  current_uses: number
  usage_count: number
  min_purchase_cents: number | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

interface Tenant {
  id: string
  name: string
}

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCode, setEditingCode] = useState<string | null>(null)

  // New promo code form
  const [newCode, setNewCode] = useState({
    tenantId: '',
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    appliesTo: 'both' as 'registration' | 'addons' | 'both',
    maxUses: '',
    minPurchaseCents: '',
    validFrom: '',
    validUntil: '',
  })

  // Edit form
  const [editForm, setEditForm] = useState({
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    appliesTo: 'both' as 'registration' | 'addons' | 'both',
    maxUses: '',
    minPurchaseCents: '',
    validFrom: '',
    validUntil: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Fetch promo codes
      const codesRes = await fetch('/api/admin/promo-codes')
      if (codesRes.ok) {
        const data = await codesRes.json()
        setPromoCodes(data.promoCodes || [])
      }

      // Fetch tenants
      const tenantsRes = await fetch('/api/admin/camps/tenants')
      if (tenantsRes.ok) {
        const data = await tenantsRes.json()
        setTenants(data.tenants || [])
        if (data.tenants?.length > 0 && !newCode.tenantId) {
          setNewCode(prev => ({ ...prev, tenantId: data.tenants[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load promo codes')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newCode.tenantId || !newCode.code || !newCode.discountValue) {
      setError('Please fill in required fields')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: newCode.tenantId,
          code: newCode.code,
          description: newCode.description || null,
          discountType: newCode.discountType,
          discountValue: newCode.discountType === 'percentage'
            ? newCode.discountValue
            : Math.round(newCode.discountValue * 100),
          appliesTo: newCode.appliesTo,
          maxUses: newCode.maxUses ? parseInt(newCode.maxUses) : null,
          minPurchaseCents: newCode.minPurchaseCents
            ? Math.round(parseFloat(newCode.minPurchaseCents) * 100)
            : null,
          validFrom: newCode.validFrom || null,
          validUntil: newCode.validUntil || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create promo code')
      }

      const data = await res.json()
      // Add tenant name to the new code
      const tenant = tenants.find(t => t.id === newCode.tenantId)
      setPromoCodes([{ ...data.promoCode, tenant_name: tenant?.name || '' }, ...promoCodes])
      setShowAddForm(false)
      setNewCode({
        tenantId: newCode.tenantId,
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        appliesTo: 'both',
        maxUses: '',
        minPurchaseCents: '',
        validFrom: '',
        validUntil: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create promo code')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(promoCodeId: string) {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoCodeId,
          description: editForm.description || null,
          discountType: editForm.discountType,
          discountValue: editForm.discountType === 'percentage'
            ? editForm.discountValue
            : Math.round(editForm.discountValue * 100),
          appliesTo: editForm.appliesTo,
          maxUses: editForm.maxUses ? parseInt(editForm.maxUses) : null,
          minPurchaseCents: editForm.minPurchaseCents
            ? Math.round(parseFloat(editForm.minPurchaseCents) * 100)
            : null,
          validFrom: editForm.validFrom || null,
          validUntil: editForm.validUntil || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update promo code')
      }

      const data = await res.json()
      setPromoCodes(promoCodes.map(pc =>
        pc.id === promoCodeId ? { ...pc, ...data.promoCode } : pc
      ))
      setEditingCode(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update promo code')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(promoCodeId: string) {
    if (!confirm('Are you sure you want to delete this promo code?')) return

    try {
      const res = await fetch(`/api/admin/promo-codes?promoCodeId=${promoCodeId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete promo code')
      }

      setPromoCodes(promoCodes.filter(pc => pc.id !== promoCodeId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete promo code')
    }
  }

  async function handleToggleActive(pc: PromoCode) {
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoCodeId: pc.id,
          isActive: !pc.is_active,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update promo code')
      }

      const data = await res.json()
      setPromoCodes(promoCodes.map(p =>
        p.id === pc.id ? { ...p, ...data.promoCode } : p
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update promo code')
    }
  }

  function startEditing(pc: PromoCode) {
    setEditingCode(pc.id)
    setEditForm({
      description: pc.description || '',
      discountType: pc.discount_type,
      discountValue: pc.discount_type === 'percentage' ? pc.discount_value : pc.discount_value / 100,
      appliesTo: pc.applies_to || 'both',
      maxUses: pc.max_uses?.toString() || '',
      minPurchaseCents: pc.min_purchase_cents ? (pc.min_purchase_cents / 100).toString() : '',
      validFrom: pc.valid_from || '',
      validUntil: pc.valid_until || '',
    })
  }

  const formatDiscount = (pc: PromoCode) => {
    if (pc.discount_type === 'percentage') {
      return `${pc.discount_value}% off`
    }
    return `$${(pc.discount_value / 100).toFixed(0)} off`
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

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <PageHeader title="Promo Codes" description="Manage promotional codes and discounts">
        <Button variant="neon" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Code
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

      {/* Create New Form */}
      {showAddForm && (
        <ContentCard title="Create Promo Code" accent="neon" className="mb-8">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Territory *
                </label>
                <select
                  value={newCode.tenantId}
                  onChange={(e) => setNewCode({ ...newCode, tenantId: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  required
                >
                  <option value="">Select territory...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Code *
                </label>
                <Input
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SUMMER25"
                  className="uppercase"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Description
              </label>
              <Input
                value={newCode.description}
                onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                placeholder="e.g., Summer 2025 early bird discount"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Discount Type *
                </label>
                <select
                  value={newCode.discountType}
                  onChange={(e) => setNewCode({ ...newCode, discountType: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Discount Value *
                </label>
                <div className="relative">
                  {newCode.discountType === 'fixed' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  )}
                  <Input
                    type="number"
                    min={0}
                    max={newCode.discountType === 'percentage' ? 100 : undefined}
                    value={newCode.discountValue}
                    onChange={(e) => setNewCode({ ...newCode, discountValue: parseFloat(e.target.value) || 0 })}
                    className={newCode.discountType === 'fixed' ? 'pl-8' : ''}
                    required
                  />
                  {newCode.discountType === 'percentage' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">%</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Applies To
                </label>
                <select
                  value={newCode.appliesTo}
                  onChange={(e) => setNewCode({ ...newCode, appliesTo: e.target.value as 'registration' | 'addons' | 'both' })}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                >
                  <option value="both">Registration & Add-ons</option>
                  <option value="registration">Registration Only</option>
                  <option value="addons">Add-ons Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Max Uses
                </label>
                <Input
                  type="number"
                  min={1}
                  value={newCode.maxUses}
                  onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Min Purchase ($)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={newCode.minPurchaseCents}
                  onChange={(e) => setNewCode({ ...newCode, minPurchaseCents: e.target.value })}
                  placeholder="No minimum"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Valid From
                </label>
                <Input
                  type="date"
                  value={newCode.validFrom}
                  onChange={(e) => setNewCode({ ...newCode, validFrom: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Valid Until
                </label>
                <Input
                  type="date"
                  value={newCode.validUntil}
                  onChange={(e) => setNewCode({ ...newCode, validUntil: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline-white" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="neon" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Code
              </Button>
            </div>
          </form>
        </ContentCard>
      )}

      {/* Promo Codes List */}
      <ContentCard title="All Promo Codes" accent="purple">
        {promoCodes.length === 0 ? (
          <div className="py-12 text-center">
            <Tag className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Promo Codes Yet</h3>
            <p className="text-white/50 mb-6">
              Create promo codes to offer discounts to your campers.
            </p>
            <Button variant="neon" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Code
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {promoCodes.map((pc) => (
              <div
                key={pc.id}
                className={cn(
                  'p-4 border transition-all',
                  pc.is_active
                    ? 'bg-black/50 border-white/10'
                    : 'bg-black/30 border-white/5 opacity-60'
                )}
              >
                {editingCode === pc.id ? (
                  // Edit Form
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Description</label>
                        <Input
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Type</label>
                        <select
                          value={editForm.discountType}
                          onChange={(e) => setEditForm({ ...editForm, discountType: e.target.value as 'percentage' | 'fixed' })}
                          className="w-full px-3 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none"
                        >
                          <option value="percentage">Percent</option>
                          <option value="fixed">Fixed ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Value</label>
                        <Input
                          type="number"
                          value={editForm.discountValue}
                          onChange={(e) => setEditForm({ ...editForm, discountValue: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Applies To</label>
                        <select
                          value={editForm.appliesTo}
                          onChange={(e) => setEditForm({ ...editForm, appliesTo: e.target.value as 'registration' | 'addons' | 'both' })}
                          className="w-full px-3 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none"
                        >
                          <option value="both">Reg & Add-ons</option>
                          <option value="registration">Reg Only</option>
                          <option value="addons">Add-ons Only</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Max Uses</label>
                        <Input
                          type="number"
                          value={editForm.maxUses}
                          onChange={(e) => setEditForm({ ...editForm, maxUses: e.target.value })}
                          placeholder="Unlimited"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Min Purchase ($)</label>
                        <Input
                          type="number"
                          value={editForm.minPurchaseCents}
                          onChange={(e) => setEditForm({ ...editForm, minPurchaseCents: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Valid From</label>
                        <Input
                          type="date"
                          value={editForm.validFrom}
                          onChange={(e) => setEditForm({ ...editForm, validFrom: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Valid Until</label>
                        <Input
                          type="date"
                          value={editForm.validUntil}
                          onChange={(e) => setEditForm({ ...editForm, validUntil: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline-white" onClick={() => setEditingCode(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="neon" onClick={() => handleUpdate(pc.id)} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display View
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <code className="px-3 py-1 bg-neon/20 text-neon font-mono font-bold tracking-wider">
                          {pc.code}
                        </code>
                        <span className="flex items-center gap-1 text-sm">
                          {pc.discount_type === 'percentage' ? (
                            <Percent className="h-4 w-4 text-purple" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-purple" />
                          )}
                          <span className="text-purple font-bold">{formatDiscount(pc)}</span>
                        </span>
                        {pc.applies_to && pc.applies_to !== 'both' && (
                          <span className="px-2 py-0.5 text-xs font-bold uppercase bg-purple/10 text-purple border border-purple/30">
                            {pc.applies_to === 'registration' ? 'Reg Only' : 'Add-ons Only'}
                          </span>
                        )}
                        {!pc.is_active && (
                          <span className="px-2 py-0.5 text-xs font-bold uppercase bg-white/10 text-white/40 border border-white/20">
                            Inactive
                          </span>
                        )}
                      </div>
                      {pc.description && (
                        <p className="text-sm text-white/50 mt-1">{pc.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/40 flex-wrap">
                        <span>{pc.tenant_name}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {pc.usage_count} / {pc.max_uses || '∞'} uses
                        </span>
                        {pc.valid_from && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            From {pc.valid_from}
                          </span>
                        )}
                        {pc.valid_until && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Until {pc.valid_until}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(pc)}
                        className={cn(
                          'p-2 transition-colors',
                          pc.is_active ? 'text-neon hover:text-neon/70' : 'text-white/30 hover:text-white/50'
                        )}
                        title={pc.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => startEditing(pc)}
                        className="p-2 text-white/50 hover:text-white transition-colors"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pc.id)}
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
