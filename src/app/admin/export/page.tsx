'use client'

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Download,
  Users,
  Mail,
  FileSpreadsheet,
  Loader2,
  Filter,
  Package,
  ClipboardList,
  Printer,
  Shirt,
} from 'lucide-react'
import { generateCSV, downloadCSV } from '@/lib/utils/csv-export'
import { generateReportPDF, generateSimpleReportPDF } from '@/lib/utils/pdf-export'

interface CampOption {
  id: string
  name: string
  start_date: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'cancelled', label: 'Cancelled' },
]

type ExportType = 'athletes' | 'emails' | 'registrations' | 'addons' | 'waitlist'

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export default function ExportPage() {
  const { user } = useAuth()
  const [camps, setCamps] = useState<CampOption[]>([])
  const [selectedCampId, setSelectedCampId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    async function loadCamps() {
      try {
        const res = await fetch('/api/admin/camps?pageSize=200')
        if (res.ok) {
          const data = await res.json()
          setCamps(
            (data.camps || []).map((c: { id: string; name: string; start_date: string }) => ({
              id: c.id,
              name: c.name,
              start_date: c.start_date,
            }))
          )
        }
      } catch {
        // Non-blocking
      }
    }
    loadCamps()
  }, [])

  const getFilename = (type: string) => {
    const campSuffix = selectedCampId
      ? `_${camps.find(c => c.id === selectedCampId)?.name?.replace(/\s+/g, '_').toLowerCase() || 'camp'}`
      : ''
    const statusSuffix = selectedStatus ? `_${selectedStatus}` : ''
    const date = new Date().toISOString().split('T')[0]
    return `${type}${campSuffix}${statusSuffix}_${date}`
  }

  const getTitle = (type: string) => {
    const campName = selectedCampId
      ? camps.find(c => c.id === selectedCampId)?.name || 'Selected Camp'
      : 'All Camps'
    const labels: Record<string, string> = {
      athletes: 'Athletes',
      emails: 'Email List',
      registrations: 'Registrations',
      addons: 'Add-on Purchases',
      waitlist: 'Waitlist',
    }
    return `${labels[type] || type} — ${campName}`
  }

  const fetchExportData = async (type: ExportType) => {
    const params = new URLSearchParams({ type })
    if (selectedCampId) params.set('campId', selectedCampId)
    if (selectedStatus && type === 'registrations') params.set('status', selectedStatus)

    const res = await fetch(`/api/admin/export?${params.toString()}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Export failed')
    }
    return res.json()
  }

  const handleCSV = async (type: ExportType) => {
    setLoading(`${type}-csv`)
    setError(null)

    try {
      const json = await fetchExportData(type)
      const data = json.data
      if (!data || data.length === 0) {
        setError(`No ${type} data found for the selected filters.`)
        return
      }
      const csv = generateCSV(data)
      downloadCSV(csv, `${getFilename(type)}.csv`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(null)
    }
  }

  const handlePDF = async (type: ExportType) => {
    setLoading(`${type}-pdf`)
    setError(null)

    try {
      const json = await fetchExportData(type)
      const data = json.data
      if (!data || data.length === 0) {
        setError(`No ${type} data found for the selected filters.`)
        return
      }

      const filename = getFilename(type)
      const title = getTitle(type)

      switch (type) {
        case 'athletes': {
          const headers = ['Last Name', 'First Name', 'DOB', 'Grade', 'Shirt Size', 'Parent Name', 'Parent Email', 'Parent Phone']
          const rows = data.map((r: Record<string, string>) => [
            r.athlete_last_name, r.athlete_first_name, r.date_of_birth, r.grade,
            r.t_shirt_size, `${r.parent_first_name} ${r.parent_last_name}`,
            r.parent_email, r.parent_phone,
          ])
          generateSimpleReportPDF(title, headers, rows, filename)
          break
        }
        case 'emails': {
          const headers = ['Email', 'First Name', 'Last Name']
          const rows = data.map((r: Record<string, string>) => [r.email, r.first_name, r.last_name])
          generateSimpleReportPDF(title, headers, rows, filename)
          break
        }
        case 'registrations': {
          const headers = ['Camp', 'Status', 'Athlete', 'Shirt Size', 'Parent', 'Email', 'Total']
          const rows = data.map((r: Record<string, string | number>) => [
            r.camp_name,
            r.status,
            `${r.athlete_last_name}, ${r.athlete_first_name}`,
            r.athlete_shirt_size,
            `${r.parent_first_name} ${r.parent_last_name}`,
            r.parent_email,
            formatPrice(Number(r.total_price_cents)),
          ])
          generateSimpleReportPDF(title, headers, rows, filename)
          break
        }
        case 'waitlist': {
          const headers = ['Camp', '#', 'Athlete', 'Parent', 'Email', 'Phone', 'Status', 'Joined']
          const rows = data.map((r: Record<string, string | number>) => [
            r.camp_name, r.position,
            `${r.athlete_last_name}, ${r.athlete_first_name}`,
            `${r.parent_first_name} ${r.parent_last_name}`,
            r.parent_email, r.parent_phone, r.offer_status, r.joined_at,
          ])
          generateSimpleReportPDF(title, headers, rows, filename)
          break
        }
        case 'addons': {
          // Addons PDF uses the richer report format with size totals
          handleAddonsPDF(json, title, filename)
          break
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(null)
    }
  }

  const handleAddonsPDF = (
    json: {
      data: Record<string, string | number>[]
      sizeTotals?: { camp_name: string; addon_name: string; is_shirt?: boolean; sizes: Record<string, number>; total: number }[]
      quantityTotals?: { camp_name: string; addon_name: string; total: number }[]
    },
    title: string,
    filename: string
  ) => {
    const data = json.data
    const sizeTotals = json.sizeTotals || []
    const quantityTotals = json.quantityTotals || []

    const SIZE_ORDER = ['YXS', 'YS', 'YM', 'YL', 'YXL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'XXL', 'XXXL']
    const sortSizes = (sizes: string[]) => [...sizes].sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a.toUpperCase())
      const bi = SIZE_ORDER.indexOf(b.toUpperCase())
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })

    // Group rows by camp > addon for detail tables
    const byCamp = new Map<string, Map<string, { variant: string; athlete: string; qty: number; total: number }[]>>()
    for (const row of data) {
      const camp = String(row.camp_name || 'Unknown')
      const addon = String(row.addon_name)
      if (!byCamp.has(camp)) byCamp.set(camp, new Map())
      const campMap = byCamp.get(camp)!
      if (!campMap.has(addon)) campMap.set(addon, [])
      campMap.get(addon)!.push({
        variant: String(row.variant || '—'),
        athlete: `${row.athlete_last_name}, ${row.athlete_first_name}`,
        qty: Number(row.quantity),
        total: Number(row.total_cents),
      })
    }

    const totalItems = data.reduce((s: number, r: Record<string, string | number>) => s + Number(r.quantity), 0)
    const totalRevenue = data.reduce((s: number, r: Record<string, string | number>) => s + Number(r.total_cents), 0)

    const stats = [
      { label: 'Total Items', value: totalItems },
      { label: 'Total Revenue', value: formatPrice(totalRevenue) },
      { label: 'Camps', value: byCamp.size },
      { label: 'Unique Add-ons', value: new Set(data.map(r => r.addon_name)).size },
    ]

    const tables: { title: string; data: { headers: string[]; rows: (string | number)[][] } }[] = []

    // === ORDER SUMMARY TABLES (most useful — put first) ===

    // Size/variant summary tables (T-shirts, etc.)
    for (const st of sizeTotals) {
      const allSizes = sortSizes(Object.keys(st.sizes))
      const rows: (string | number)[][] = allSizes.map(size => [size, st.sizes[size]])
      rows.push(['TOTAL', st.total])
      const label = st.is_shirt ? 'ORDER SUMMARY' : 'QUANTITY SUMMARY'
      tables.push({
        title: `${label}: ${st.camp_name} — ${st.addon_name}`,
        data: { headers: [st.is_shirt ? 'Size' : 'Option', 'Quantity'], rows },
      })
    }

    // Simple quantity totals for addons without variants
    if (quantityTotals.length > 0) {
      const rows: (string | number)[][] = quantityTotals.map(qt => [qt.camp_name, qt.addon_name, qt.total])
      tables.push({
        title: 'QUANTITY SUMMARY: Add-ons Without Sizes',
        data: { headers: ['Camp', 'Add-on', 'Quantity'], rows },
      })
    }

    // === DETAIL TABLES (per camp > addon with name lists) ===
    for (const [campName, addons] of byCamp) {
      for (const [addonName, items] of addons) {
        // Sort by variant/size then by athlete name
        items.sort((a, b) => a.variant.localeCompare(b.variant) || a.athlete.localeCompare(b.athlete))

        const totalQty = items.reduce((s, i) => s + i.qty, 0)
        const totalCents = items.reduce((s, i) => s + i.total, 0)
        const hasVariants = items.some(i => i.variant && i.variant !== '—')

        const headers = hasVariants
          ? ['Athlete', 'Size/Option', 'Qty', 'Price']
          : ['Athlete', 'Qty', 'Price']

        const rows: (string | number)[][] = items.map(i =>
          hasVariants
            ? [i.athlete, i.variant, i.qty, formatPrice(i.total)]
            : [i.athlete, i.qty, formatPrice(i.total)]
        )
        // Add totals row
        rows.push(
          hasVariants
            ? ['TOTAL', '', totalQty, formatPrice(totalCents)]
            : ['TOTAL', totalQty, formatPrice(totalCents)]
        )

        tables.push({
          title: `${campName} — ${addonName} (${totalQty} items)`,
          data: { headers, rows },
        })
      }
    }

    generateReportPDF({ title, filename }, stats, tables)
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Export Data"
        description="Download CSV or PDF exports of athletes, emails, registrations, add-ons, and waitlist data"
      />

      <div className="space-y-6">
        {/* Filters */}
        <ContentCard title="Filters" accent="neon">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                <Filter className="inline h-4 w-4 mr-1" />
                Camp
              </label>
              <select
                value={selectedCampId}
                onChange={(e) => setSelectedCampId(e.target.value)}
                className="w-full px-4 py-3 bg-dark-200 border border-white/10 text-white focus:border-neon focus:outline-none [&>option]:text-black [&>option]:bg-white"
              >
                <option value="">All Camps</option>
                {camps.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name} ({camp.start_date})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                <Filter className="inline h-4 w-4 mr-1" />
                Registration Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-3 bg-dark-200 border border-white/10 text-white focus:border-neon focus:outline-none [&>option]:text-black [&>option]:bg-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/40 mt-1">Applies to Registrations export only</p>
            </div>
          </div>
        </ContentCard>

        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 text-sm ml-4">Dismiss</button>
          </div>
        )}

        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Athletes */}
          <ContentCard title="Athletes" accent="neon">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/60">
                <Users className="h-8 w-8 text-neon" />
                <div>
                  <p className="text-white font-bold">Athlete Data</p>
                  <p className="text-sm">Names, DOB, grades, sizes, medical info, parent contacts</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCSV('athletes')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {loading === 'athletes-csv' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  CSV
                </button>
                <button
                  onClick={() => handlePDF('athletes')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-purple/80 text-white font-bold uppercase tracking-widest hover:bg-purple transition-colors disabled:opacity-50"
                >
                  {loading === 'athletes-pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                  PDF
                </button>
              </div>
            </div>
          </ContentCard>

          {/* Email List */}
          <ContentCard title="Email List" accent="neon">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/60">
                <Mail className="h-8 w-8 text-neon" />
                <div>
                  <p className="text-white font-bold">Email Addresses</p>
                  <p className="text-sm">Deduplicated parent emails with names</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCSV('emails')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {loading === 'emails-csv' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  CSV
                </button>
                <button
                  onClick={() => handlePDF('emails')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-purple/80 text-white font-bold uppercase tracking-widest hover:bg-purple transition-colors disabled:opacity-50"
                >
                  {loading === 'emails-pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                  PDF
                </button>
              </div>
            </div>
          </ContentCard>

          {/* Registrations */}
          <ContentCard title="Registrations" accent="neon">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/60">
                <FileSpreadsheet className="h-8 w-8 text-neon" />
                <div>
                  <p className="text-white font-bold">Registration Data</p>
                  <p className="text-sm">Full registration details with camp, athlete, payment info</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCSV('registrations')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {loading === 'registrations-csv' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  CSV
                </button>
                <button
                  onClick={() => handlePDF('registrations')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-purple/80 text-white font-bold uppercase tracking-widest hover:bg-purple transition-colors disabled:opacity-50"
                >
                  {loading === 'registrations-pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                  PDF
                </button>
              </div>
            </div>
          </ContentCard>

          {/* Add-ons */}
          <ContentCard title="Add-on Purchases" accent="purple">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/60">
                <Package className="h-8 w-8 text-purple" />
                <div>
                  <p className="text-white font-bold">Add-on Data</p>
                  <p className="text-sm">All add-on purchases grouped by camp, with T-shirt size totals for ordering</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCSV('addons')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {loading === 'addons-csv' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  CSV
                </button>
                <button
                  onClick={() => handlePDF('addons')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-purple/80 text-white font-bold uppercase tracking-widest hover:bg-purple transition-colors disabled:opacity-50"
                >
                  {loading === 'addons-pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                  PDF
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-purple/10 border border-purple/20">
                <Shirt className="h-4 w-4 text-purple" />
                <p className="text-xs text-white/60">PDF includes T-shirt size summary tables so you can order without counting by hand</p>
              </div>
            </div>
          </ContentCard>

          {/* Waitlist */}
          <ContentCard title="Waitlist" accent="purple">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/60">
                <ClipboardList className="h-8 w-8 text-purple" />
                <div>
                  <p className="text-white font-bold">Waitlist Data</p>
                  <p className="text-sm">All waitlisted campers with position, status, and parent contact info</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCSV('waitlist')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
                >
                  {loading === 'waitlist-csv' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  CSV
                </button>
                <button
                  onClick={() => handlePDF('waitlist')}
                  disabled={loading !== null}
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-purple/80 text-white font-bold uppercase tracking-widest hover:bg-purple transition-colors disabled:opacity-50"
                >
                  {loading === 'waitlist-pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                  PDF
                </button>
              </div>
            </div>
          </ContentCard>
        </div>
      </div>
    </AdminLayout>
  )
}
