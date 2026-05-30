'use client'

/**
 * Manual Registration Modal for Camp HQ
 *
 * Allows admin/director to manually register a camper by creating
 * a parent account, athlete, and confirmed registration in one flow.
 */

import { useState } from 'react'
import { X, Loader2, CheckCircle, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ManualRegistrationModalProps {
  campId: string
  onClose: () => void
  onSuccess?: () => void
}

const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const SHIRT_SIZE_OPTIONS = ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'A2XL']

export function ManualRegistrationModal({ campId, onClose, onSuccess }: ManualRegistrationModalProps) {
  const [parentEmail, setParentEmail] = useState('')
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [camperFirstName, setCamperFirstName] = useState('')
  const [camperLastName, setCamperLastName] = useState('')
  const [camperDob, setCamperDob] = useState('')
  const [camperGrade, setCamperGrade] = useState('')
  const [shirtSize, setShirtSize] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ confirmationNumber: string; isNewCognitoUser: boolean } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/manual-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campId,
          parentEmail: parentEmail.trim(),
          parentFirstName: parentFirstName.trim(),
          parentLastName: parentLastName.trim(),
          camperFirstName: camperFirstName.trim(),
          camperLastName: camperLastName.trim(),
          camperDob,
          camperGrade: camperGrade || undefined,
          shirtSize: shirtSize || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Registration failed')
        return
      }

      setResult({
        confirmationNumber: json.data.confirmationNumber,
        isNewCognitoUser: json.data.isNewCognitoUser,
      })
      onSuccess?.()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-neon/50 focus:ring-neon/20'
  const labelClass = 'block text-sm font-medium text-white/70 mb-1'
  const selectClass = 'w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm focus:border-neon/50 focus:ring-neon/20 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-neon" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Register Camper
            </h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success State */}
        {result ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Registration Complete</h3>
            <p className="text-white/60 mb-4">
              {camperFirstName} {camperLastName} has been registered successfully.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <p className="text-sm text-white/50 mb-1">Confirmation Number</p>
              <p className="text-2xl font-bold text-neon tracking-widest">{result.confirmationNumber}</p>
            </div>
            <p className="text-sm text-white/40 mb-6">
              {result.isNewCognitoUser
                ? 'A new account was created and an invitation email has been sent.'
                : 'The parent already had an account. An invitation email has been sent.'}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 text-white font-semibold rounded hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
            {/* Parent Info */}
            <div>
              <p className="text-xs font-bold text-neon uppercase tracking-widest mb-3">Parent / Guardian</p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Email *</label>
                  <Input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <Input
                      required
                      value={parentFirstName}
                      onChange={(e) => setParentFirstName(e.target.value)}
                      placeholder="First"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <Input
                      required
                      value={parentLastName}
                      onChange={(e) => setParentLastName(e.target.value)}
                      placeholder="Last"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Camper Info */}
            <div>
              <p className="text-xs font-bold text-magenta uppercase tracking-widest mb-3">Camper</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <Input
                      required
                      value={camperFirstName}
                      onChange={(e) => setCamperFirstName(e.target.value)}
                      placeholder="First"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <Input
                      required
                      value={camperLastName}
                      onChange={(e) => setCamperLastName(e.target.value)}
                      placeholder="Last"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <Input
                    type="date"
                    required
                    value={camperDob}
                    onChange={(e) => setCamperDob(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Grade</label>
                    <select
                      value={camperGrade}
                      onChange={(e) => setCamperGrade(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select grade</option>
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Shirt Size</label>
                    <select
                      value={shirtSize}
                      onChange={(e) => setShirtSize(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select size</option>
                      {SHIRT_SIZE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 font-semibold rounded hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'flex-1 px-4 py-2.5 font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2',
                  submitting
                    ? 'bg-neon/50 text-black/50 cursor-not-allowed'
                    : 'bg-neon text-black hover:bg-neon/90'
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register & Send Invite'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
