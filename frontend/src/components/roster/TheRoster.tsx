'use client'

/**
 * The Roster - Camp Camper Manager
 *
 * Shared component for viewing and managing campers across all dashboards.
 * Role-based permissions control what actions are available.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import CamperDetailDrawer from './CamperDetailDrawer'
import type { RosterCamper, RosterCamperDetail, RosterListResult } from '@/lib/services/roster'

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
  }>>([])
  const [loadingPickups, setLoadingPickups] = useState(false)
  const [selectedPickupId, setSelectedPickupId] = useState<string>('')
  const [customPickupName, setCustomPickupName] = useState('')
  const [customPickupRelationship, setCustomPickupRelationship] = useState('')
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)

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
    setCustomPickupName('')
    setCustomPickupRelationship('')
    setLoadingPickups(true)
    setAuthorizedPickups([])

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
    setCustomPickupName('')
    setCustomPickupRelationship('')
  }

  const handleCheckoutSubmit = async () => {
    if (!checkoutCamper) return

    // Determine pickup person info
    let pickupPersonName: string | undefined
    let pickupPersonRelationship: string | undefined
    let pickupPersonId: string | undefined

    if (selectedPickupId === 'custom') {
      if (!customPickupName.trim()) {
        showToast('Please enter pickup person name', 'error')
        return
      }
      pickupPersonName = customPickupName.trim()
      pickupPersonRelationship = customPickupRelationship.trim() || 'Other'
    } else if (selectedPickupId === 'parent') {
      pickupPersonName = 'Parent/Guardian'
      pickupPersonRelationship = 'Parent'
    } else if (selectedPickupId) {
      const selectedPickup = authorizedPickups.find(p => p.id === selectedPickupId)
      if (selectedPickup) {
        pickupPersonId = selectedPickup.id
        pickupPersonName = selectedPickup.name
        pickupPersonRelationship = selectedPickup.relationship
      }
    }

    if (!pickupPersonName) {
      showToast('Please select who is picking up this camper', 'error')
      return
    }

    setCheckoutSubmitting(true)
    try {
      const res = await fetch(`/api/camps/${campId}/roster/${checkoutCamper.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'checked_out',
          pickupPersonName,
          pickupPersonRelationship,
          pickupPersonId,
        }),
      })

      if (res.ok) {
        showToast(`${checkoutCamper.firstName} checked out to ${pickupPersonName}`, 'success')
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={backUrl}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-3xl">📋</span>
                The Roster
              </h1>
              {result && (
                <p className="text-gray-500 mt-1">
                  {result.campName} • {result.campStartDate} to {result.campEndDate}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Export PDF Button */}
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf || !result}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingPdf ? (
                  <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full" />
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2"
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
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{result.total}</span>
                <span className="text-gray-500">Total Campers</span>
              </div>
              <div className="h-8 border-l border-gray-200" />
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium text-gray-900">{result.totalCheckedIn}</span>
                <span className="text-gray-500">Checked In</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="font-medium text-gray-900">{result.totalNotArrived}</span>
                <span className="text-gray-500">Not Arrived</span>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
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
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
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
            <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-black rounded-full" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchCampers}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : result && result.campers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No campers found matching your filters.</p>
          </div>
        ) : result ? (
          <>
            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Camper
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Group
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Flags
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.campers.map((camper) => (
                      <tr key={camper.id} className="hover:bg-gray-50">
                        {/* Camper Name */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openCamperDetail(camper.id)}
                            className="flex items-center gap-3 text-left hover:text-blue-600"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                              {camper.firstName[0]}{camper.lastName[0]}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {camper.lastName}, {camper.firstName}
                              </div>
                              {camper.parentPhone && (
                                <a
                                  href={`tel:${camper.parentPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-0.5"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {camper.parentPhone}
                                </a>
                              )}
                              {role !== 'coach' && camper.parentEmail && (
                                <div className="text-xs text-gray-500">{camper.parentEmail}</div>
                              )}
                            </div>
                          </button>
                        </td>

                        {/* Grade */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {camper.gradeDisplay}
                          </span>
                        </td>

                        {/* Group */}
                        <td className="px-4 py-3">
                          {camper.groupName ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{camper.groupName}</span>
                              {camper.friendGroupNumber && (
                                <span className="inline-block w-5 h-5 bg-pink-500 text-white text-[10px] rounded-full text-center leading-5">
                                  {camper.friendGroupNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Ungrouped</span>
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
      {showCheckoutModal && checkoutCamper && (
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
                  {/* Parent Option */}
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="pickup"
                      value="parent"
                      checked={selectedPickupId === 'parent'}
                      onChange={() => setSelectedPickupId('parent')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Parent/Guardian</div>
                      <div className="text-sm text-gray-500">Primary parent picking up</div>
                    </div>
                  </label>

                  {/* Authorized Pickups */}
                  {authorizedPickups.map((pickup) => (
                    <label
                      key={pickup.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="pickup"
                        value={pickup.id}
                        checked={selectedPickupId === pickup.id}
                        onChange={() => setSelectedPickupId(pickup.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{pickup.name}</div>
                        <div className="text-sm text-gray-500">{pickup.relationship}</div>
                      </div>
                      {pickup.phone && (
                        <a
                          href={`tel:${pickup.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {pickup.phone}
                        </a>
                      )}
                    </label>
                  ))}

                  {/* Custom Option */}
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="pickup"
                      value="custom"
                      checked={selectedPickupId === 'custom'}
                      onChange={() => setSelectedPickupId('custom')}
                      className="w-4 h-4 text-blue-600 mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-2">Other Person</div>
                      {selectedPickupId === 'custom' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={customPickupName}
                            onChange={(e) => setCustomPickupName(e.target.value)}
                            placeholder="Name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <input
                            type="text"
                            value={customPickupRelationship}
                            onChange={(e) => setCustomPickupRelationship(e.target.value)}
                            placeholder="Relationship (e.g., Aunt, Family Friend)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={closeCheckoutModal}
                  disabled={checkoutSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckoutSubmit}
                  disabled={checkoutSubmitting || !selectedPickupId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {checkoutSubmitting && (
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  )}
                  Confirm Check Out
                </button>
              </div>
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
