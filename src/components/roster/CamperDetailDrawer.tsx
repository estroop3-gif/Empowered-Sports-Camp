'use client'

/**
 * Camper Detail Drawer
 *
 * Slide-out panel showing full camper details with tab navigation.
 * Tabs: Overview, Contact & Safety, Sports, Internal
 *
 * Risk Flag System:
 * - Auto-detected from medical notes/allergies (medical data → high_risk)
 * - Manually overridable by staff
 * - Progressable: none → monitor → restricted (high risk)
 * - Manual override always takes precedence
 */

import { useState, useEffect, useMemo } from 'react'
import type { RosterCamperDetail } from '@/lib/services/roster'

type TabKey = 'overview' | 'contact' | 'sports' | 'internal'

// Risk levels ordered from lowest to highest
const RISK_LEVELS = ['none', 'monitor', 'restricted'] as const
type RiskLevel = typeof RISK_LEVELS[number]

const RISK_LABELS: Record<RiskLevel, string> = {
  none: 'None',
  monitor: 'Monitor',
  restricted: 'High Risk',
}

const RISK_BADGE_STYLES: Record<RiskLevel, string> = {
  none: '',
  monitor: 'bg-yellow-100 text-yellow-800',
  restricted: 'bg-red-100 text-red-800',
}

function riskIndex(level: RiskLevel): number {
  return RISK_LEVELS.indexOf(level)
}

/** Compute the auto-detected risk level from medical data */
function computeAutoRisk(camper: RosterCamperDetail): RiskLevel {
  if (camper.medicalNotes || camper.allergies) return 'restricted'
  return 'none'
}

/** Get the effective risk: higher of auto-detected and manual override */
function effectiveRisk(manual: RiskLevel, auto: RiskLevel): RiskLevel {
  return riskIndex(manual) >= riskIndex(auto) ? manual : auto
}

interface CamperDetailDrawerProps {
  camper: RosterCamperDetail | null
  isOpen: boolean
  onClose: () => void
  role: 'hq_admin' | 'licensee_owner' | 'director' | 'coach'
  campId: string
  onStatusChange?: () => void
}

export default function CamperDetailDrawer({
  camper,
  isOpen,
  onClose,
  role,
  campId,
  onStatusChange,
}: CamperDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ shirtSize: '', specialConsiderations: '' })
  const [saving, setSaving] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [riskFlag, setRiskFlag] = useState<RiskLevel>('none')
  const [internalNotes, setInternalNotes] = useState('')
  const [savingInternal, setSavingInternal] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const canEdit = role !== 'coach'
  const canUpdateStatus = true // All roles can update status
  const isCoach = role === 'coach'

  // Compute auto-detected and effective risk levels
  const autoRisk = useMemo(() => camper ? computeAutoRisk(camper) : 'none' as RiskLevel, [camper?.medicalNotes, camper?.allergies]) // eslint-disable-line react-hooks/exhaustive-deps
  const displayRisk = useMemo(() => effectiveRisk(riskFlag, autoRisk), [riskFlag, autoRisk])

  // Reset tab and sync internal state when camper changes
  useEffect(() => {
    setActiveTab('overview')
    setIsEditing(false)
    setSaveError(null)
    setSaveSuccess(false)
    if (camper) {
      setRiskFlag((camper.riskFlag as RiskLevel) || 'none')
      setInternalNotes(camper.internalNotes || '')
    }
  }, [camper?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveEdit = async () => {
    if (!camper) return
    setSaving(true)
    try {
      const res = await fetch(`/api/camps/${campId}/roster/${camper.id}/basic`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (res.ok) {
        setIsEditing(false)
        onStatusChange?.()
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (status: string) => {
    if (!camper) return
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/camps/${campId}/roster/${camper.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        onStatusChange?.()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleSaveInternal = async () => {
    if (!camper) return
    setSavingInternal(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/camps/${campId}/roster/${camper.id}/basic`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskFlag, internalNotes }),
      })
      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        onStatusChange?.()
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || 'Failed to save. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save internal data:', error)
      setSaveError('Network error. Please try again.')
    } finally {
      setSavingInternal(false)
    }
  }

  const startEdit = () => {
    if (camper) {
      setEditData({
        shirtSize: camper.shirtSize || '',
        specialConsiderations: camper.specialConsiderations || '',
      })
      setIsEditing(true)
    }
  }

  if (!isOpen) return null

  const tabs: Array<{ key: TabKey; label: string; hidden?: boolean }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'contact', label: 'Contact & Safety' },
    { key: 'sports', label: 'Sports' },
    { key: 'internal', label: 'Internal', hidden: isCoach },
  ]

  const visibleTabs = tabs.filter((t) => !t.hidden)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-[70] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {camper ? `${camper.firstName} ${camper.lastName}` : 'Loading...'}
            </h2>
            {camper && displayRisk !== 'none' && (
              <span
                className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${RISK_BADGE_STYLES[displayRisk]}`}
              >
                {RISK_LABELS[displayRisk]}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!camper ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-gray-400">Loading camper details...</div>
            </div>
          ) : (
            <>
              {/* Quick Status Actions */}
              {canUpdateStatus && (
                <div className="px-6 pt-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
                    <div className="flex gap-2">
                      {camper.checkInStatus !== 'checked_in' && (
                        <button
                          onClick={() => handleStatusUpdate('checked_in')}
                          disabled={statusUpdating}
                          className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          Check In
                        </button>
                      )}
                      {camper.checkInStatus === 'checked_in' && (
                        <button
                          onClick={() => handleStatusUpdate('checked_out')}
                          disabled={statusUpdating}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          Check Out
                        </button>
                      )}
                      {camper.checkInStatus !== 'not_arrived' && (
                        <button
                          onClick={() => handleStatusUpdate('not_arrived')}
                          disabled={statusUpdating}
                          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Bar */}
              <div className="px-6 pt-4">
                <div className="flex gap-1 border-b border-gray-200">
                  {visibleTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? 'border-black text-black'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <OverviewTab
                    camper={camper}
                    isEditing={isEditing}
                    editData={editData}
                    setEditData={setEditData}
                    saving={saving}
                    canEdit={canEdit}
                    onSave={handleSaveEdit}
                    onCancelEdit={() => setIsEditing(false)}
                  />
                )}

                {activeTab === 'contact' && (
                  <ContactSafetyTab camper={camper} isCoach={isCoach} />
                )}

                {activeTab === 'sports' && (
                  <SportsTab camper={camper} />
                )}

                {activeTab === 'internal' && !isCoach && (
                  <InternalTab
                    camper={camper}
                    riskFlag={riskFlag}
                    setRiskFlag={setRiskFlag}
                    autoRisk={autoRisk}
                    displayRisk={displayRisk}
                    internalNotes={internalNotes}
                    setInternalNotes={setInternalNotes}
                    saving={savingInternal}
                    saveError={saveError}
                    saveSuccess={saveSuccess}
                    onSave={handleSaveInternal}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions — only on Overview tab */}
        {camper && canEdit && !isEditing && activeTab === 'overview' && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={startEdit}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Edit Camper Info
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ============================================================================
// Tab Components
// ============================================================================

function OverviewTab({
  camper,
  isEditing,
  editData,
  setEditData,
  saving,
  canEdit,
  onSave,
  onCancelEdit,
}: {
  camper: RosterCamperDetail
  isEditing: boolean
  editData: { shirtSize: string; specialConsiderations: string }
  setEditData: (data: { shirtSize: string; specialConsiderations: string }) => void
  saving: boolean
  canEdit: boolean
  onSave: () => void
  onCancelEdit: () => void
}) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Basic Info
        </h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Age</dt>
            <dd className="text-sm font-medium">{camper.age ?? 'N/A'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Grade</dt>
            <dd className="text-sm font-medium">{camper.gradeDisplay}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Group</dt>
            <dd className="text-sm font-medium">
              {camper.groupName || (
                <span className="text-gray-400">Ungrouped</span>
              )}
            </dd>
          </div>
          {camper.friendGroupNumber && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Friend Group</dt>
              <dd>
                <span className="inline-block w-6 h-6 bg-pink-500 text-white text-xs rounded-full text-center leading-6">
                  {camper.friendGroupNumber}
                </span>
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Shirt Size</dt>
            <dd className="text-sm font-medium">{camper.shirtSize || 'N/A'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Status</dt>
            <dd>
              <StatusBadge status={camper.checkInStatus} />
            </dd>
          </div>
        </dl>
      </section>

      {/* Upsells */}
      {camper.upsells.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Purchased Add-ons
          </h3>
          <ul className="space-y-2">
            {camper.upsells.map((upsell, idx) => (
              <li key={idx} className="flex justify-between items-center text-sm">
                <span>
                  {upsell.name}
                  {upsell.variant && <span className="text-gray-500"> - {upsell.variant}</span>}
                  {upsell.quantity > 1 && <span className="text-gray-500"> x{upsell.quantity}</span>}
                </span>
                <span className="font-medium">
                  ${((upsell.priceCents * upsell.quantity) / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Attendance History */}
      {camper.attendanceHistory.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Attendance History
          </h3>
          <div className="space-y-2">
            {camper.attendanceHistory.map((record) => (
              <div
                key={record.date}
                className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-600">
                  Day {record.dayNumber} - {new Date(record.date).toLocaleDateString()}
                </span>
                <StatusBadge status={record.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit Form */}
      {canEdit && isEditing && (
        <section className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Edit Camper Info</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shirt Size
              </label>
              <select
                value={editData.shirtSize}
                onChange={(e) => setEditData({ ...editData, shirtSize: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="">Select size</option>
                <option value="YXS">Youth XS</option>
                <option value="YS">Youth S</option>
                <option value="YM">Youth M</option>
                <option value="YL">Youth L</option>
                <option value="YXL">Youth XL</option>
                <option value="AS">Adult S</option>
                <option value="AM">Adult M</option>
                <option value="AL">Adult L</option>
                <option value="AXL">Adult XL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Considerations
              </label>
              <textarea
                value={editData.specialConsiderations}
                onChange={(e) => setEditData({ ...editData, specialConsiderations: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={onCancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function ContactSafetyTab({
  camper,
  isCoach,
}: {
  camper: RosterCamperDetail
  isCoach: boolean
}) {
  const [pickups, setPickups] = useState<Array<{
    id: string
    name: string
    relationship: string
    phone: string | null
    photoIdOnFile: boolean
  }>>([])

  useEffect(() => {
    if (camper.athleteId) {
      fetch(`/api/athletes/${camper.athleteId}/authorized-pickups`)
        .then(r => r.json())
        .then(json => setPickups(json.data || []))
        .catch(() => {})
    }
  }, [camper.athleteId])

  return (
    <div className="space-y-6">
      {/* Parent/Guardian (hidden for coaches) */}
      {!isCoach && camper.parentName && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Parent/Guardian
          </h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Name</dt>
              <dd className="text-sm font-medium">{camper.parentName}</dd>
            </div>
            {camper.parentEmail && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Email</dt>
                <dd className="text-sm font-medium">
                  <a href={`mailto:${camper.parentEmail}`} className="text-blue-600 hover:underline">
                    {camper.parentEmail}
                  </a>
                </dd>
              </div>
            )}
            {camper.parentPhone && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Phone</dt>
                <dd className="text-sm font-medium">
                  <a href={`tel:${camper.parentPhone}`} className="text-blue-600 hover:underline">
                    {camper.parentPhone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Emergency Contact */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Emergency Contact
        </h3>
        {camper.emergencyContactName ? (
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Name</dt>
              <dd className="text-sm font-medium">{camper.emergencyContactName}</dd>
            </div>
            {camper.emergencyContactPhone && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Phone</dt>
                <dd className="text-sm font-medium">
                  <a href={`tel:${camper.emergencyContactPhone}`} className="text-blue-600 hover:underline">
                    {camper.emergencyContactPhone}
                  </a>
                </dd>
              </div>
            )}
            {camper.emergencyContactRelationship && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Relationship</dt>
                <dd className="text-sm font-medium">{camper.emergencyContactRelationship}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-400">No emergency contact on file.</p>
        )}
      </section>

      {/* Health & Safety */}
      {(camper.medicalNotes || camper.allergies || camper.specialConsiderations) && (
        <section className="bg-red-50 border border-red-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Health & Safety
          </h3>
          <div className="space-y-3 text-sm">
            {camper.medicalNotes && (
              <div>
                <dt className="font-medium text-red-800">Medical Notes</dt>
                <dd className="text-red-700 mt-1">{camper.medicalNotes}</dd>
              </div>
            )}
            {camper.allergies && (
              <div>
                <dt className="font-medium text-red-800">Allergies</dt>
                <dd className="text-red-700 mt-1">{camper.allergies}</dd>
              </div>
            )}
            {camper.specialConsiderations && (
              <div>
                <dt className="font-medium text-red-800">Special Considerations</dt>
                <dd className="text-red-700 mt-1">{camper.specialConsiderations}</dd>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Authorized Pickups */}
      {pickups.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Authorized Pickups
          </h3>
          <div className="space-y-3">
            {pickups.map((pickup) => (
              <div key={pickup.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{pickup.name}</div>
                    <div className="text-xs text-gray-500">{pickup.relationship}</div>
                    {pickup.phone && (
                      <a href={`tel:${pickup.phone}`} className="text-xs text-blue-600 hover:underline">
                        {pickup.phone}
                      </a>
                    )}
                  </div>
                  {pickup.photoIdOnFile && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      ID on File
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!camper.parentName && !camper.emergencyContactName && !camper.medicalNotes && !camper.allergies && !camper.specialConsiderations && pickups.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No contact or safety information available.
        </div>
      )}
    </div>
  )
}

function SportsTab({ camper }: { camper: RosterCamperDetail }) {
  return (
    <div className="space-y-6">
      {/* Sport Interests */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Sport Interests
        </h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Primary Sport</dt>
            <dd className="text-sm font-medium">{camper.primarySportInterest || <span className="text-gray-400">Not specified</span>}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Secondary Sport</dt>
            <dd className="text-sm font-medium">{camper.secondarySportInterest || <span className="text-gray-400">Not specified</span>}</dd>
          </div>
        </dl>
      </section>

      {/* Preferences */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Preferences
        </h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">T-Shirt Size</dt>
            <dd className="text-sm font-medium">{camper.tShirtSize || camper.shirtSize || <span className="text-gray-400">Not specified</span>}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Jersey # Preference</dt>
            <dd className="text-sm font-medium">{camper.jerseyNumberPreference || <span className="text-gray-400">Not specified</span>}</dd>
          </div>
        </dl>
      </section>

      {/* Friend Requests */}
      {camper.friendRequests.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Friend Requests
          </h3>
          <div className="flex flex-wrap gap-2">
            {camper.friendRequests.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex px-3 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-full"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Squad Pairings */}
      {camper.squadMemberships.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Squad Pairings
          </h3>
          <div className="space-y-3">
            {camper.squadMemberships.map((squad) => (
              <div key={squad.squadId} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">{squad.squadLabel}</span>
                  <SquadStatusBadge status={squad.status} />
                </div>
                {squad.otherMembers.length > 0 && (
                  <div className="space-y-1">
                    {squad.otherMembers.map((member) => (
                      <div key={member.athleteId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{member.athleteName}</span>
                        <SquadStatusBadge status={member.status} />
                      </div>
                    ))}
                  </div>
                )}
                {squad.otherMembers.length === 0 && (
                  <p className="text-xs text-gray-400">No other members yet</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function InternalTab({
  camper,
  riskFlag,
  setRiskFlag,
  autoRisk,
  displayRisk,
  internalNotes,
  setInternalNotes,
  saving,
  saveError,
  saveSuccess,
  onSave,
}: {
  camper: RosterCamperDetail
  riskFlag: string
  setRiskFlag: (v: RiskLevel) => void
  autoRisk: RiskLevel
  displayRisk: RiskLevel
  internalNotes: string
  setInternalNotes: (v: string) => void
  saving: boolean
  saveError: string | null
  saveSuccess: boolean
  onSave: () => void
}) {
  return (
    <div className="space-y-6">
      {/* Risk Flag */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Risk Flag
        </h3>

        {/* Auto-detected risk banner */}
        {autoRisk !== 'none' && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-xs text-amber-800">
                <strong>Auto-detected: {RISK_LABELS[autoRisk]}</strong>
                <span className="block mt-0.5">
                  {camper.medicalNotes && camper.allergies
                    ? 'This camper has medical notes and allergies on file.'
                    : camper.medicalNotes
                    ? 'This camper has medical notes on file.'
                    : 'This camper has allergies on file.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Effective risk display */}
        {displayRisk !== 'none' && (
          <div className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-lg ${
            displayRisk === 'restricted' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${RISK_BADGE_STYLES[displayRisk]}`}>
              {RISK_LABELS[displayRisk]}
            </span>
            <span className="text-xs text-gray-600">Effective risk level</span>
          </div>
        )}

        {/* Manual override selector */}
        <label className="block text-xs font-medium text-gray-600 mb-1">Manual Override</label>
        <select
          value={riskFlag}
          onChange={(e) => setRiskFlag(e.target.value as RiskLevel)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
        >
          <option value="none">None</option>
          <option value="monitor">Monitor</option>
          <option value="restricted">High Risk</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {autoRisk !== 'none' && riskFlag === 'none'
            ? `Auto-detected as "${RISK_LABELS[autoRisk]}" due to medical data. Set a manual override to change.`
            : riskFlag === 'monitor'
            ? 'This camper will be flagged for additional staff attention.'
            : riskFlag === 'restricted'
            ? 'This camper has restricted participation. Staff will be alerted.'
            : 'No manual risk flag set.'}
        </p>
      </section>

      {/* Internal Notes */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Internal Notes
        </h3>
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={5}
          placeholder="Staff-only notes about this camper..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          These notes are only visible to directors and admins.
        </p>
      </section>

      {/* Save feedback */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          Saved successfully.
        </div>
      )}

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save Internal Info'}
      </button>
    </div>
  )
}

// ============================================================================
// Shared Components
// ============================================================================

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

function SquadStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    accepted: 'bg-green-100 text-green-700',
    requested: 'bg-yellow-100 text-yellow-700',
    declined: 'bg-red-100 text-red-700',
    removed: 'bg-gray-100 text-gray-600',
  }

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
