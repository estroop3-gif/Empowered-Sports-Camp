'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { Package, Search, ChevronDown, ChevronRight, Loader2, DollarSign, Users, ShoppingBag } from 'lucide-react'
import { PortalCard } from '@/components/portal'

interface AddonItem {
  name: string
  variant: string | null
  quantity: number
  priceCents: number
}

interface CamperAddon {
  athleteId: string
  firstName: string
  lastName: string
  registrationId: string
  addons: AddonItem[]
  addonsTotal: number
}

interface AddonPurchasesData {
  campers: CamperAddon[]
  summary: {
    totalRevenueCents: number
    totalCampersWithAddons: number
    totalItems: number
  }
}

interface CampAddonPurchasesTabProps {
  campId: string
  routePrefix: string
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function CampAddonPurchasesTab({ campId, routePrefix }: CampAddonPurchasesTabProps) {
  const [data, setData] = useState<AddonPurchasesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/camps/${campId}/addon-purchases`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to load add-on purchases')
        const json = await res.json()
        setData(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [campId])

  const filteredCampers = useMemo(() => {
    if (!data) return []
    if (!search.trim()) return data.campers
    const q = search.toLowerCase()
    return data.campers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.addons.some((a) => a.name.toLowerCase().includes(q))
    )
  }, [data, search])

  const toggleRow = (athleteId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(athleteId)) next.delete(athleteId)
      else next.add(athleteId)
      return next
    })
  }

  // Determine athlete detail base path from routePrefix
  const athleteBasePath = routePrefix.replace('/camps', '/athletes')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    )
  }

  if (error) {
    return (
      <PortalCard>
        <div className="text-center py-12 text-red-400">{error}</div>
      </PortalCard>
    )
  }

  if (!data) return null

  const { summary } = data

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PortalCard>
          <div className="flex items-center gap-3 p-2">
            <div className="p-2 rounded-lg bg-neon/10">
              <DollarSign className="h-5 w-5 text-neon" />
            </div>
            <div>
              <div className="text-sm text-white/50">Total Revenue</div>
              <div className="text-xl font-bold text-neon">{formatPrice(summary.totalRevenueCents)}</div>
            </div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="flex items-center gap-3 p-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-white/50">Campers with Add-ons</div>
              <div className="text-xl font-bold text-white">{summary.totalCampersWithAddons}</div>
            </div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="flex items-center gap-3 p-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <ShoppingBag className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-white/50">Total Items</div>
              <div className="text-xl font-bold text-white">{summary.totalItems}</div>
            </div>
          </div>
        </PortalCard>
      </div>

      {/* Search + Table */}
      <PortalCard>
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by camper name or add-on..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-neon/50 focus:border-neon/50"
            />
          </div>
        </div>

        {filteredCampers.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 mx-auto text-white/20 mb-4" />
            <h3 className="text-lg font-semibold text-white/60 mb-1">No Add-on Purchases</h3>
            <p className="text-sm text-white/40">
              {search ? 'No results match your search.' : 'No campers have purchased add-ons for this camp yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50 w-8" />
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Camper</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Add-ons</th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampers.map((camper) => {
                  const isExpanded = expandedRows.has(camper.athleteId)
                  return (
                    <Fragment key={camper.athleteId}>
                      <tr
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => toggleRow(camper.athleteId)}
                      >
                        <td className="py-3 px-4">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-white/40" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white/40" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`${athleteBasePath}/${camper.athleteId}?tab=addons`}
                            className="font-medium text-white hover:text-neon hover:underline transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {camper.lastName}, {camper.firstName}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {camper.addons.map((addon, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/70"
                              >
                                {addon.name}
                                {addon.variant && ` (${addon.variant})`}
                                {addon.quantity > 1 && ` x${addon.quantity}`}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-neon">{formatPrice(camper.addonsTotal)}</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={4} className="px-4 py-3">
                            <table className="w-full ml-8">
                              <thead>
                                <tr>
                                  <th className="text-left py-1 px-3 text-xs text-white/40">Add-on</th>
                                  <th className="text-left py-1 px-3 text-xs text-white/40">Variant</th>
                                  <th className="text-center py-1 px-3 text-xs text-white/40">Qty</th>
                                  <th className="text-right py-1 px-3 text-xs text-white/40">Unit Price</th>
                                  <th className="text-right py-1 px-3 text-xs text-white/40">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {camper.addons.map((addon, i) => (
                                  <tr key={i} className="border-t border-white/5">
                                    <td className="py-1.5 px-3 text-sm text-white/70">{addon.name}</td>
                                    <td className="py-1.5 px-3 text-sm text-white/50">{addon.variant || '—'}</td>
                                    <td className="py-1.5 px-3 text-sm text-white/50 text-center">{addon.quantity}</td>
                                    <td className="py-1.5 px-3 text-sm text-white/50 text-right">{formatPrice(addon.priceCents)}</td>
                                    <td className="py-1.5 px-3 text-sm text-white/70 text-right">{formatPrice(addon.priceCents * addon.quantity)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PortalCard>
    </div>
  )
}
