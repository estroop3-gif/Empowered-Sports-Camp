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
} from 'lucide-react'
import { generateCSV, downloadCSV } from '@/lib/utils/csv-export'

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

  const handleExport = async (type: 'athletes' | 'emails' | 'registrations') => {
    setLoading(type)
    setError(null)

    try {
      const params = new URLSearchParams({ type })
      if (selectedCampId) params.set('campId', selectedCampId)
      if (selectedStatus && type === 'registrations') params.set('status', selectedStatus)

      const res = await fetch(`/api/admin/export?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Export failed')
      }

      const { data } = await res.json()

      if (!data || data.length === 0) {
        setError(`No ${type} data found for the selected filters.`)
        return
      }

      const csv = generateCSV(data)
      const campSuffix = selectedCampId
        ? `_${camps.find(c => c.id === selectedCampId)?.name?.replace(/\s+/g, '_').toLowerCase() || 'camp'}`
        : ''
      const statusSuffix = selectedStatus ? `_${selectedStatus}` : ''
      const date = new Date().toISOString().split('T')[0]
      downloadCSV(csv, `${type}${campSuffix}${statusSuffix}_${date}.csv`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Export Data"
        description="Download CSV exports of athletes, emails, and registration data"
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
                className="w-full px-4 py-3 bg-dark-200 border border-white/10 text-white focus:border-neon focus:outline-none"
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
                className="w-full px-4 py-3 bg-dark-200 border border-white/10 text-white focus:border-neon focus:outline-none"
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
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Athletes CSV */}
          <ContentCard title="Athletes" accent="neon">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/60">
                <Users className="h-8 w-8 text-neon" />
                <div>
                  <p className="text-white font-bold">Athlete Data</p>
                  <p className="text-sm">Names, DOB, grades, sizes, medical info, parent contacts</p>
                </div>
              </div>
              <button
                onClick={() => handleExport('athletes')}
                disabled={loading !== null}
                className="flex items-center justify-center gap-2 w-full py-3 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                {loading === 'athletes' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {loading === 'athletes' ? 'Exporting...' : 'Download CSV'}
              </button>
            </div>
          </ContentCard>

          {/* Email List CSV */}
          <ContentCard title="Email List" accent="neon">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/60">
                <Mail className="h-8 w-8 text-neon" />
                <div>
                  <p className="text-white font-bold">Email Addresses</p>
                  <p className="text-sm">Deduplicated parent emails with names</p>
                </div>
              </div>
              <button
                onClick={() => handleExport('emails')}
                disabled={loading !== null}
                className="flex items-center justify-center gap-2 w-full py-3 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                {loading === 'emails' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {loading === 'emails' ? 'Exporting...' : 'Download CSV'}
              </button>
            </div>
          </ContentCard>

          {/* Registrations CSV */}
          <ContentCard title="Registrations" accent="neon">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/60">
                <FileSpreadsheet className="h-8 w-8 text-neon" />
                <div>
                  <p className="text-white font-bold">Registration Data</p>
                  <p className="text-sm">Full registration details with camp, athlete, payment info</p>
                </div>
              </div>
              <button
                onClick={() => handleExport('registrations')}
                disabled={loading !== null}
                className="flex items-center justify-center gap-2 w-full py-3 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                {loading === 'registrations' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {loading === 'registrations' ? 'Exporting...' : 'Download CSV'}
              </button>
            </div>
          </ContentCard>
        </div>
      </div>
    </AdminLayout>
  )
}
