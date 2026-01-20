'use client'

/**
 * Add Staff Modal Component
 *
 * Modal for adding staff to a camp - supports both searching existing
 * tenant staff and adding ad-hoc staff without profiles.
 *
 * For existing users: Sends a request that they can accept/decline
 * For ad-hoc staff: Directly adds them to the camp
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Search, UserPlus, Loader2, User, Send, Mail, MapPin, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TenantStaffSearchResult } from '@/lib/services/campHq'

interface Territory {
  id: string
  name: string
  state_region: string
  city: string | null
}

interface AddStaffModalProps {
  campId: string
  onClose: () => void
  onSuccess: () => void
}

const STAFF_ROLES = [
  { value: 'director', label: 'Director' },
  { value: 'coach', label: 'Coach' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'cit', label: 'CIT' },
  { value: 'volunteer', label: 'Volunteer' },
]

export function AddStaffModal({ campId, onClose, onSuccess }: AddStaffModalProps) {
  const [mode, setMode] = useState<'search' | 'adhoc'>('search')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search mode state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TenantStaffSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TenantStaffSearchResult | null>(null)

  // Territory filter state
  const [territories, setTerritories] = useState<Territory[]>([])
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('')

  // Common form state
  const [role, setRole] = useState('coach')
  const [isLead, setIsLead] = useState(false)
  const [callTime, setCallTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [stationName, setStationName] = useState('')

  // Ad-hoc form state
  const [adHocFirstName, setAdHocFirstName] = useState('')
  const [adHocLastName, setAdHocLastName] = useState('')
  const [adHocEmail, setAdHocEmail] = useState('')
  const [adHocPhone, setAdHocPhone] = useState('')

  // Load territories on mount
  useEffect(() => {
    const loadTerritories = async () => {
      try {
        const res = await fetch(`/api/camps/${campId}/hq/territories`)
        const json = await res.json()
        if (res.ok && json.data) {
          setTerritories(json.data)
        }
      } catch (err) {
        console.error('Failed to load territories:', err)
      }
    }
    loadTerritories()
  }, [campId])

  // Search/load staff with filters
  const loadStaff = useCallback(async () => {
    if (mode !== 'search') return

    setSearching(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery.length >= 2) {
        params.set('q', searchQuery)
      }
      if (selectedTerritoryId) {
        params.set('territoryId', selectedTerritoryId)
      }
      const queryString = params.toString()
      const url = `/api/camps/${campId}/hq/staff/search${queryString ? `?${queryString}` : ''}`
      const res = await fetch(url)
      const json = await res.json()
      if (res.ok) {
        setSearchResults(json.data || [])
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }, [campId, mode, searchQuery, selectedTerritoryId])

  // Initial load and on filter changes
  useEffect(() => {
    if (mode !== 'search') return
    loadStaff()
  }, [mode, loadStaff])

  // Debounced search on query change
  useEffect(() => {
    if (mode !== 'search') return

    const timer = setTimeout(() => {
      loadStaff()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, mode, loadStaff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      role,
      isLead,
      callTime: callTime || undefined,
      endTime: endTime || undefined,
      notes: notes || undefined,
      stationName: stationName || undefined,
      ...(mode === 'search'
        ? { userId: selectedUser?.id }
        : { adHocFirstName, adHocLastName, adHocEmail, adHocPhone }
      ),
    }

    try {
      const res = await fetch(`/api/camps/${campId}/hq/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to add staff')
        setSaving(false)
        return
      }

      onSuccess()
    } catch (err) {
      setError('Failed to add staff')
      setSaving(false)
    }
  }

  const canSubmit = mode === 'search'
    ? selectedUser !== null
    : adHocFirstName.trim() && adHocLastName.trim()

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-dark-100 border border-white/20 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-bold text-white">Add Staff</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => { setMode('search'); setSelectedUser(null) }}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors',
              mode === 'search'
                ? 'text-neon border-b-2 border-neon'
                : 'text-white/50 hover:text-white'
            )}
          >
            <Search className="h-4 w-4 inline mr-2" />
            Search Existing
          </button>
          <button
            type="button"
            onClick={() => { setMode('adhoc'); setSelectedUser(null) }}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors',
              mode === 'adhoc'
                ? 'text-neon border-b-2 border-neon'
                : 'text-white/50 hover:text-white'
            )}
          >
            <UserPlus className="h-4 w-4 inline mr-2" />
            Add New
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Search Mode */}
            {mode === 'search' && (
              <>
                {/* Search and Filter Row */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Search Staff
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, or territory..."
                        className="w-full bg-black border border-white/20 pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 animate-spin" />
                      )}
                    </div>
                  </div>

                  {/* Territory Filter */}
                  {territories.length > 0 && (
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                        <Filter className="h-3 w-3 inline mr-1" />
                        Filter by Territory
                      </label>
                      <select
                        value={selectedTerritoryId}
                        onChange={(e) => setSelectedTerritoryId(e.target.value)}
                        className="w-full bg-black border border-white/20 px-4 py-2 text-white focus:border-neon focus:outline-none"
                      >
                        <option value="">All Territories</option>
                        {territories.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.state_region}{t.city ? `, ${t.city}` : ''})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Results count */}
                <div className="text-xs text-white/40">
                  {searching ? 'Searching...' : `${searchResults.length} staff member${searchResults.length !== 1 ? 's' : ''} available`}
                </div>

                {/* Search Results */}
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {searchResults.length === 0 && !searching && (
                    <div className="text-center py-4 text-white/40 text-sm">
                      {searchQuery.length > 0 || selectedTerritoryId ? 'No staff found matching your filters' : 'No staff accounts available'}
                    </div>
                  )}
                  {searchResults.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => setSelectedUser(staff)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 text-left transition-colors',
                        selectedUser?.id === staff.id
                          ? 'bg-neon/20 border border-neon'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      )}
                    >
                      <div className="h-10 w-10 bg-white/10 flex items-center justify-center text-white font-bold text-sm uppercase shrink-0">
                        {staff.first_name.charAt(0)}{staff.last_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white">
                          {staff.first_name} {staff.last_name}
                        </div>
                        <div className="text-sm text-white/50 truncate">{staff.email}</div>
                        {staff.territories && staff.territories.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {staff.territories.map(t => t.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-white/40 uppercase shrink-0">{staff.role}</div>
                    </button>
                  ))}
                </div>

                {/* Selected User Display */}
                {selectedUser && (
                  <div className="p-3 bg-neon/10 border border-neon/30">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-neon uppercase tracking-wider">Selected</div>
                      <div className="flex items-center gap-1 text-xs text-purple">
                        <Mail className="h-3 w-3" />
                        Request will be sent
                      </div>
                    </div>
                    <div className="text-white font-bold">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </div>
                    <div className="text-sm text-white/50">{selectedUser.email}</div>
                  </div>
                )}
              </>
            )}

            {/* Ad-hoc Mode */}
            {mode === 'adhoc' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={adHocFirstName}
                      onChange={(e) => setAdHocFirstName(e.target.value)}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={adHocLastName}
                      onChange={(e) => setAdHocLastName(e.target.value)}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={adHocEmail}
                    onChange={(e) => setAdHocEmail(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={adHocPhone}
                    onChange={(e) => setAdHocPhone(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Common Fields */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-4">Assignment Details</div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Station
                  </label>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="e.g., Field A"
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Call Time
                  </label>
                  <input
                    type="time"
                    value={callTime}
                    onChange={(e) => setCallTime(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-neon focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLead}
                    onChange={(e) => setIsLead(e.target.checked)}
                    className="h-5 w-5 bg-black border border-white/20 checked:bg-neon checked:border-neon focus:outline-none"
                  />
                  <span className="text-white">Lead Staff</span>
                </label>
              </div>

              <div className="mt-4">
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 bg-black/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className={cn(
                'flex items-center gap-2 px-6 py-2 font-bold uppercase tracking-wider transition-colors',
                canSubmit && !saving
                  ? 'bg-neon text-black hover:bg-neon/90'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === 'search' ? (
                <>
                  <Send className="h-4 w-4" />
                  Send Request
                </>
              ) : (
                'Add Staff'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
