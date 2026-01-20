'use client'

/**
 * The Roster - Camp Camper Manager
 *
 * Shared component for viewing and managing campers across all dashboards.
 * Role-based permissions control what actions are available.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import CamperDetailDrawer from './CamperDetailDrawer'
import type { RosterCamper, RosterCamperDetail, RosterListResult } from '@/lib/services/roster'

// Helper to deduplicate campers by ID (prevents duplicate key errors)
function deduplicateCampers<T extends { id: string }>(campers: T[]): T[] {
  const seen = new Set<string>()
  return campers.filter(camper => {
    if (seen.has(camper.id)) {
      console.warn(`[TheRoster] Duplicate camper ID detected: ${camper.id}`)
      return false
    }
    seen.add(camper.id)
    return true
  })
}

interface TheRosterProps {
  campId: string
  role: 'hq_admin' | 'licensee_owner' | 'director' | 'coach'
  backUrl: string
}

interface Group {
  id: string
  name: string
  number: number
}

export default function TheRoster({ campId, role, backUrl }: TheRosterProps) {
  // Data state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RosterListResult | null>(null)
  const [groups, setGroups] = useState<Group[]>([])

  // Filter state
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Detail drawer state
  const [selectedCamperId, setSelectedCamperId] = useState<string | null>(null)
  const [camperDetail, setCamperDetail] = useState<RosterCamperDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutCamper, setCheckoutCamper] = useState<RosterCamper | null>(null)
  const [authorizedPickups, setAuthorizedPickups] = useState<Array<{
    id: string
    name: string
    relationship: string
    phone: string | null
    photoIdOnFile?: boolean
  }>>([])
  const [loadingPickups, setLoadingPickups] = useState(false)
  const [selectedPickupId, setSelectedPickupId] = useState<string>('')
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)

  // Verification modal state (for authorized pickups)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [selectedPickupForVerification, setSelectedPickupForVerification] = useState<{
    id: string
    name: string
    relationship: string
    phone: string | null
    photoIdOnFile?: boolean
  } | null>(null)
  const [verificationStep, setVerificationStep] = useState<1 | 2 | 3>(1)
  const [idConfirmed, setIdConfirmed] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [nameMatchError, setNameMatchError] = useState<string | null>(null)

  // PDF export state
  const [exportingPdf, setExportingPdf] = useState(false)

  // Generate PDF export
  const handleExportPdf = async () => {
    if (!result) return

    setExportingPdf(true)
    try {
      // Fetch all campers without pagination for export
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (groupFilter !== 'all') params.set('groupId', groupFilter)
      if (statusFilter !== 'all') params.set('checkInStatus', statusFilter)
      params.set('limit', '1000') // Get all for export

      const res = await fetch(`/api/camps/${campId}/roster?${params}`)
      const json = await res.json()

      if (!res.ok) {
        showToast('Failed to load roster data', 'error')
        return
      }

      const allCampers = json.data?.campers || []
      if (allCampers.length === 0) {
        showToast('No campers to export', 'error')
        return
      }

      // Create PDF
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // Header
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Camp Roster', pageWidth / 2, 20, { align: 'center' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(result.campName, pageWidth / 2, 28, { align: 'center' })

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`${result.campStartDate} - ${result.campEndDate}`, pageWidth / 2, 34, { align: 'center' })

      // Stats
      doc.setFontSize(10)
      doc.setTextColor(0)
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      doc.text(`Exported: ${today}`, 14, 44)

      const checkedInCount = allCampers.filter((c: RosterCamper) => c.checkInStatus === 'checked_in').length
      const notArrivedCount = allCampers.filter((c: RosterCamper) => c.checkInStatus === 'not_arrived').length
      doc.text(`Total: ${allCampers.length} campers | Checked In: ${checkedInCount} | Not Arrived: ${notArrivedCount}`, 14, 50)

      // Table data
      const tableData = allCampers.map((camper: RosterCamper) => [
        `${camper.lastName}, ${camper.firstName}`,
        camper.gradeDisplay,
        camper.groupName || 'Ungrouped',
        camper.checkInStatus === 'checked_in' ? 'Checked In' :
          camper.checkInStatus === 'checked_out' ? 'Checked Out' :
            camper.checkInStatus === 'absent' ? 'Absent' : 'Not Arrived',
        camper.parentPhone || '-',
        [
          camper.hasMedicalNotes ? 'M' : '',
          camper.hasAllergies ? 'A' : '',
        ].filter(Boolean).join(', ') || '-',
      ])

      // Generate table
      autoTable(doc, {
        startY: 56,
        head: [['Name', 'Grade', 'Group', 'Status', 'Parent Phone', 'Flags']],
        body: tableData,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [0, 0, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 35 },
          5: { cellWidth: 20 },
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      })

      // Footer with page numbers
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128)
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      // Download
      const filename = `roster-${result.campName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      showToast('Roster exported successfully', 'success')
    } catch (err) {
      console.error('Failed to export PDF:', err)
      showToast('Failed to export roster', 'error')
    } finally {
      setExportingPdf(false)
    }
  }

  // Fetch campers
  const fetchCampers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (groupFilter !== 'all') params.set('groupId', groupFilter)
      if (statusFilter !== 'all') params.set('checkInStatus', statusFilter)
      params.set('page', page.toString())
      params.set('limit', '50')

      const res = await fetch(`/api/camps/${campId}/roster?${params}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load roster')
      }

      setResult(json.data)
      setGroups(json.groups || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading roster')
    } finally {
      setLoading(false)
    }
  }, [campId, search, groupFilter, statusFilter, page])

  useEffect(() => {
    fetchCampers()
  }, [fetchCampers])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Deduplicated campers list (prevents duplicate key errors)
  const deduplicatedCampers = useMemo(() => {
    if (!result?.campers) return []
    return deduplicateCampers(result.campers)
  }, [result?.campers])

  // Fetch camper detail
  const openCamperDetail = async (camperId: string) => {
    setSelectedCamperId(camperId)
    setLoadingDetail(true)
    setCamperDetail(null)
    try {
      const res = await fetch(`/api/camps/${campId}/roster/${camperId}`)
      const json = await res.json()
      if (res.ok) {
        setCamperDetail(json.data)
      }
    } catch (err) {
      console.error('Failed to load camper detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const closeDrawer = () => {
    setSelectedCamperId(null)
    setCamperDetail(null)
  }

  // Quick status update
  const handleQuickStatus = async (camper: RosterCamper, newStatus: string) => {
    try {
      const res = await fetch(`/api/camps/${campId}/roster/${camper.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        showToast(`${camper.firstName} ${newStatus === 'checked_in' ? 'checked in' : 'checked out'}`, 'success')
        fetchCampers()
      } else {
        showToast('Failed to update status', 'error')
      }
    } catch {
      showToast('Failed to update status', 'error')
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleDetailChange = () => {
    fetchCampers()
    if (selectedCamperId) {
      openCamperDetail(selectedCamperId)
    }
  }

  // Open checkout modal and fetch authorized pickups
  const openCheckoutModal = async (camper: RosterCamper) => {
    setCheckoutCamper(camper)
    setShowCheckoutModal(true)
    setSelectedPickupId('')
    setLoadingPickups(true)
    setAuthorizedPickups([])
    // Reset verification state
    setShowVerificationModal(false)
    setSelectedPickupForVerification(null)
    setVerificationStep(1)
    setIdConfirmed(false)
    setTypedName('')
    setNameMatchError(null)

    try {
      // Fetch authorized pickups for this athlete
      const res = await fetch(`/api/athletes/${camper.athleteId}/authorized-pickups`)
      if (res.ok) {
        const data = await res.json()
        setAuthorizedPickups(data.pickups || [])
      }
    } catch (err) {
      console.error('Failed to load authorized pickups:', err)
    } finally {
      setLoadingPickups(false)
    }
  }

  const closeCheckoutModal = () => {
    setShowCheckoutModal(false)
    setCheckoutCamper(null)
    setAuthorizedPickups([])
    setSelectedPickupId('')
    // Reset verification state
    setShowVerificationModal(false)
    setSelectedPickupForVerification(null)
    setVerificationStep(1)
    setIdConfirmed(false)
    setTypedName('')
    setNameMatchError(null)
  }

  // Handle parent checkout (no verification needed)
  const handleParentCheckout = async () => {
    if (!checkoutCamper) return

    setCheckoutSubmitting(true)
    try {
      const res = await fetch(`/api/camps/${campId}/roster/${checkoutCamper.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'checked_out',
          pickupPersonName: 'Parent/Guardian',
          pickupPersonRelationship: 'Parent',
          verificationMethod: 'parent',
        }),
      })

      if (res.ok) {
        showToast(`${checkoutCamper.firstName} checked out to Parent/Guardian`, 'success')
        fetchCampers()
        closeCheckoutModal()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to check out', 'error')
      }
    } catch {
      showToast('Failed to check out', 'error')
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  // Open verification modal for authorized pickup
  const handleSelectAuthorizedPickup = (pickup: typeof authorizedPickups[0]) => {
    setSelectedPickupForVerification(pickup)
    setVerificationStep(1)
    setIdConfirmed(false)
    setTypedName('')
    setNameMatchError(null)
    setShowVerificationModal(true)
  }

  // Cancel verification and return to pickup list
  const handleCancelVerification = () => {
    setShowVerificationModal(false)
    setSelectedPickupForVerification(null)
    setVerificationStep(1)
    setIdConfirmed(false)
    setTypedName('')
    setNameMatchError(null)
  }

  // Name normalization for comparison
  const normalizeNameForComparison = (name: string): string => {
    return name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,'-]/g, '')
  }

  // Validate name match
  const validateNameMatch = (typed: string, authorized: string): boolean => {
    return normalizeNameForComparison(typed) === normalizeNameForComparison(authorized)
  }

  // Complete verified checkout for authorized pickup
  const handleVerifiedCheckout = async () => {
    if (!checkoutCamper || !selectedPickupForVerification) return

    // Validate name matches
    if (!validateNameMatch(typedName, selectedPickupForVerification.name)) {
      setNameMatchError('Name does not match. Please type the name exactly as shown on the ID.')
      return
    }

    setCheckoutSubmitting(true)
    try {
      const res = await fetch(`/api/camps/${campId}/roster/${checkoutCamper.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'checked_out',
          pickupPersonId: selectedPickupForVerification.id,
          pickupPersonName: selectedPickupForVerification.name,
          pickupPersonRelationship: selectedPickupForVerification.relationship,
          verificationMethod: 'id_verified',
          verificationTypedName: typedName.trim(),
        }),
      })

      if (res.ok) {
        showToast(`${checkoutCamper.firstName} checked out to ${selectedPickupForVerification.name}`, 'success')
        fetchCampers()
        closeCheckoutModal()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to check out', 'error')
      }
    } catch {
      showToast('Failed to check out', 'error')
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  // Grouping tool link
  const groupingUrl = role === 'hq_admin' || role === 'licensee_owner'
    ? `/admin/camps/${campId}/grouping`
    : `/director/camps/${campId}/grouping`

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-dark-100">
      {/* Header */}
      <div className="bg-black/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={backUrl}
                className="text-sm text-white/50 hover:text-white flex items-center gap-1 mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">📋</span>
                The Roster
              </h1>
              {result && (
                <p className="text-white/50 mt-1">
                  {result.campName} • {result.campStartDate} to {result.campEndDate}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Export PDF Button */}
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf || !result}
                className="px-4 py-2 border border-white/20 text-white font-medium hover:bg-white/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportingPdf ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                Export PDF
              </button>
              {(role === 'hq_admin' || role === 'licensee_owner' || role === 'director') && (
                <Link
                  href={groupingUrl}
                  className="px-4 py-2 border border-white/20 text-white font-medium hover:bg-white/10 flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Grouping Tool
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {result && (
        <div className="bg-black/30 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{result.total}</span>
                <span className="text-white/50">Total Campers</span>
              </div>
              <div className="h-8 border-l border-white/20" />
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-neon" />
                <span className="font-medium text-white">{result.totalCheckedIn}</span>
                <span className="text-white/50">Checked In</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white/30" />
                <span className="font-medium text-white">{result.totalNotArrived}</span>
                <span className="text-white/50">Not Arrived</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or parent email..."
              className="w-full pl-10 pr-4 py-2 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => { setGroupFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
          >
            <option value="all">All Groups</option>
            <option value="ungrouped">Ungrouped</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="checked_in">Checked In</option>
            <option value="not_arrived">Not Arrived</option>
            <option value="checked_out">Checked Out</option>
            <option value="absent">Absent</option>
          </select>

          {/* Clear Filters */}
          {(search || groupFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setGroupFilter('all')
                setStatusFilter('all')
                setPage(1)
              }}
              className="px-3 py-2 text-sm text-white/50 hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading && !result ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-neon rounded-full" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchCampers}
              className="mt-4 px-4 py-2 bg-red-500 text-white hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        ) : result && result.campers.length === 0 ? (
          <div className="bg-black border border-white/10 p-12 text-center">
            <p className="text-white/50">No campers found matching your filters.</p>
          </div>
        ) : result ? (
          <>
            {/* Table */}
            <div className="bg-black border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Camper
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Group
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Flags
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {deduplicatedCampers.map((camper) => (
                      <tr key={camper.id} className="hover:bg-white/5 transition-colors">
                        {/* Camper Name */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openCamperDetail(camper.id)}
                            className="flex items-center gap-3 text-left hover:text-neon transition-colors"
                          >
                            <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-sm font-medium text-white">
                              {camper.firstName[0]}{camper.lastName[0]}
                            </div>
                            <div>
                              <div className="font-medium text-white">
                                {camper.lastName}, {camper.firstName}
                              </div>
                              {camper.parentPhone && (
                                <a
                                  href={`tel:${camper.parentPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-purple hover:text-purple/80 mt-0.5"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {camper.parentPhone}
                                </a>
                              )}
                              {role !== 'coach' && camper.parentEmail && (
                                <div className="text-xs text-white/40">{camper.parentEmail}</div>
                              )}
                            </div>
                          </button>
                        </td>

                        {/* Grade */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-white/10 text-white">
                            {camper.gradeDisplay}
                          </span>
                        </td>

                        {/* Group */}
                        <td className="px-4 py-3">
                          {camper.groupName ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-white">{camper.groupName}</span>
                              {camper.friendGroupNumber && (
                                <span className="inline-block w-5 h-5 bg-pink-500 text-white text-[10px] text-center leading-5">
                                  {camper.friendGroupNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-white/30 text-sm">Ungrouped</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={camper.checkInStatus} />
                        </td>

                        {/* Flags */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {camper.hasMedicalNotes && (
                              <span className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded-full text-xs" title="Medical Notes">
                                M
                              </span>
                            )}
                            {camper.hasAllergies && (
                              <span className="w-6 h-6 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full text-xs" title="Allergies">
                                A
                              </span>
                            )}
                            {camper.hasUpsells && (
                              <span className="w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full text-xs" title="Purchased Add-ons">
                                $
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {camper.checkInStatus !== 'checked_in' && (
                              <button
                                onClick={() => handleQuickStatus(camper, 'checked_in')}
                                className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Check In
                              </button>
                            )}
                            {camper.checkInStatus === 'checked_in' && (
                              <button
                                onClick={() => openCheckoutModal(camper)}
                                className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                Check Out
                              </button>
                            )}
                            <button
                              onClick={() => openCamperDetail(camper.id)}
                              className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * result.limit + 1} to {Math.min(page * result.limit, result.total)} of {result.total} campers
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Page {page} of {result.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === result.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Camper Detail Drawer */}
      <CamperDetailDrawer
        camper={loadingDetail ? null : camperDetail}
        isOpen={selectedCamperId !== null}
        onClose={closeDrawer}
        role={role}
        campId={campId}
        onStatusChange={handleDetailChange}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && checkoutCamper && !showVerificationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-black/50" onClick={closeCheckoutModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Check Out {checkoutCamper.firstName} {checkoutCamper.lastName}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Select who is picking up this camper
              </p>

              {loadingPickups ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Parent Option - Direct checkout */}
                  <button
                    onClick={handleParentCheckout}
                    disabled={checkoutSubmitting}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 w-full text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Parent/Guardian</div>
                      <div className="text-sm text-gray-500">Primary parent picking up</div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Authorized Pickups - Opens verification modal */}
                  {authorizedPickups.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Authorized Pickups (ID Verification Required)
                      </p>
                      {authorizedPickups.map((pickup) => (
                        <button
                          key={pickup.id}
                          onClick={() => handleSelectAuthorizedPickup(pickup)}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 w-full text-left mb-2"
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {pickup.name}
                              {pickup.photoIdOnFile && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                  ID on File
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{pickup.relationship}</div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}

                  {authorizedPickups.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                      <p className="text-sm text-yellow-800">
                        No authorized pickup persons on file. Only Parent/Guardian can check out this camper.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cancel button */}
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={closeCheckoutModal}
                  disabled={checkoutSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ID Verification Modal (3-step wizard) */}
      {showVerificationModal && selectedPickupForVerification && checkoutCamper && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-black/50" onClick={handleCancelVerification} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-left">
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        verificationStep >= step
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {verificationStep > step ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step
                      )}
                    </div>
                    {step < 3 && (
                      <div className={`w-12 h-1 ${verificationStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Review Details */}
              {verificationStep === 1 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Review Pickup Person
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-gray-900">
                          {selectedPickupForVerification.name}
                        </div>
                        <div className="text-gray-500">{selectedPickupForVerification.relationship}</div>
                        {selectedPickupForVerification.phone && (
                          <div className="text-sm text-blue-600">{selectedPickupForVerification.phone}</div>
                        )}
                      </div>
                    </div>
                    {selectedPickupForVerification.photoIdOnFile && (
                      <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 rounded px-3 py-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">Photo ID on file</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    This person is picking up <strong>{checkoutCamper.firstName} {checkoutCamper.lastName}</strong>.
                    Proceed to verify their identity.
                  </p>
                  <div className="flex justify-between">
                    <button
                      onClick={handleCancelVerification}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setVerificationStep(2)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Confirm ID Verified */}
              {verificationStep === 2 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Verify Photo ID
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-sm text-yellow-800">
                        <strong>Request a valid government-issued photo ID</strong> from this person and verify it matches the authorized pickup information on file.
                      </div>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={idConfirmed}
                      onChange={(e) => setIdConfirmed(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded mt-0.5"
                    />
                    <div className="text-sm text-gray-700">
                      I confirm I have verified the photo ID matches{' '}
                      <strong>{selectedPickupForVerification.name}</strong>
                    </div>
                  </label>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setVerificationStep(1)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setVerificationStep(3)}
                      disabled={!idConfirmed}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Type Name */}
              {verificationStep === 3 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Confirm Identity
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Type the name <strong>exactly as it appears on the ID</strong> to complete checkout.
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name from ID
                    </label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => {
                        setTypedName(e.target.value)
                        setNameMatchError(null)
                      }}
                      placeholder={`Type "${selectedPickupForVerification.name}"`}
                      className={`w-full px-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        nameMatchError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      autoFocus
                    />
                    {nameMatchError && (
                      <p className="mt-2 text-sm text-red-600">{nameMatchError}</p>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        setVerificationStep(2)
                        setNameMatchError(null)
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerifiedCheckout}
                      disabled={checkoutSubmitting || !typedName.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {checkoutSubmitting && (
                        <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      )}
                      Complete Checkout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    checked_in: 'bg-green-100 text-green-800',
    checked_out: 'bg-blue-100 text-blue-800',
    not_arrived: 'bg-gray-100 text-gray-600',
    absent: 'bg-red-100 text-red-800',
  }

  const labels: Record<string, string> = {
    checked_in: 'Checked In',
    checked_out: 'Checked Out',
    not_arrived: 'Not Arrived',
    absent: 'Absent',
  }

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || styles.not_arrived}`}>
      {labels[status] || status}
    </span>
  )
}
