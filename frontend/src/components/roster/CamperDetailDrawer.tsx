'use client'

/**
 * Camper Detail Drawer
 *
 * Slide-out panel showing full camper details with edit capabilities.
 */

import { useState } from 'react'
import type { RosterCamperDetail } from '@/lib/services/roster'

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
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ shirtSize: '', specialConsiderations: '' })
  const [saving, setSaving] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const canEdit = role !== 'coach'
  const canUpdateStatus = true // All roles can update status

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
          <h2 className="text-lg font-bold text-gray-900">
            {camper ? `${camper.firstName} ${camper.lastName}` : 'Loading...'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!camper ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-gray-400">Loading camper details...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quick Status Actions */}
              {canUpdateStatus && (
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
              )}

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

              {/* Contact Info (hidden for coaches) */}
              {role !== 'coach' && camper.parentName && (
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
              {camper.emergencyContactName && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Emergency Contact
                  </h3>
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
                </section>
              )}

              {/* Health & Safety - Always visible for safety reasons */}
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
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {camper && canEdit && !isEditing && (
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
