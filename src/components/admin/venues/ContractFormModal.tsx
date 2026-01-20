'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Loader2,
  Calendar,
  DollarSign,
  Clock,
  Shield,
  FileText,
  Upload,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContractFormData {
  rental_rate_cents: number
  currency: string
  contract_start_date: string
  contract_end_date: string
  deposit_cents: number | null
  payment_due_date: string | null
  insurance_requirements: string | null
  cancellation_policy: string | null
  setup_time_minutes: number | null
  cleanup_time_minutes: number | null
  special_conditions: string | null
  expiration_date: string | null
  document_url: string | null
  document_name: string | null
}

interface Contract extends ContractFormData {
  id: string
  venue_id: string
  tenant_id: string | null
  status: 'draft' | 'sent' | 'signed' | 'expired'
  sent_at: string | null
  sent_to_email: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
}

interface ContractFormModalProps {
  venueId: string
  contract?: Contract | null
  onClose: () => void
  onSave: (contract: Contract) => void
}

export default function ContractFormModal({
  venueId,
  contract,
  onClose,
  onSave,
}: ContractFormModalProps) {
  const isEditing = !!contract

  const [formData, setFormData] = useState<ContractFormData>({
    rental_rate_cents: 0,
    currency: 'USD',
    contract_start_date: '',
    contract_end_date: '',
    deposit_cents: null,
    payment_due_date: null,
    insurance_requirements: null,
    cancellation_policy: null,
    setup_time_minutes: null,
    cleanup_time_minutes: null,
    special_conditions: null,
    expiration_date: null,
    document_url: null,
    document_name: null,
  })

  const [rentalRateDollars, setRentalRateDollars] = useState('')
  const [depositDollars, setDepositDollars] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Initialize form with existing contract data
  useEffect(() => {
    if (contract) {
      setFormData({
        rental_rate_cents: contract.rental_rate_cents,
        currency: contract.currency || 'USD',
        contract_start_date: contract.contract_start_date,
        contract_end_date: contract.contract_end_date,
        deposit_cents: contract.deposit_cents,
        payment_due_date: contract.payment_due_date,
        insurance_requirements: contract.insurance_requirements,
        cancellation_policy: contract.cancellation_policy,
        setup_time_minutes: contract.setup_time_minutes,
        cleanup_time_minutes: contract.cleanup_time_minutes,
        special_conditions: contract.special_conditions,
        expiration_date: contract.expiration_date,
        document_url: contract.document_url,
        document_name: contract.document_name,
      })
      setRentalRateDollars((contract.rental_rate_cents / 100).toFixed(2))
      setDepositDollars(contract.deposit_cents ? (contract.deposit_cents / 100).toFixed(2) : '')
    }
  }, [contract])

  const handleRentalRateChange = (value: string) => {
    setRentalRateDollars(value)
    const cents = Math.round(parseFloat(value || '0') * 100)
    setFormData(prev => ({ ...prev, rental_rate_cents: isNaN(cents) ? 0 : cents }))
  }

  const handleDepositChange = (value: string) => {
    setDepositDollars(value)
    if (!value) {
      setFormData(prev => ({ ...prev, deposit_cents: null }))
    } else {
      const cents = Math.round(parseFloat(value) * 100)
      setFormData(prev => ({ ...prev, deposit_cents: isNaN(cents) ? null : cents }))
    }
  }

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Get presigned URL - use the venueId in the filename for organization
      const timestampedFilename = `${venueId}/${Date.now()}-${file.name}`
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: timestampedFilename,
          contentType: file.type,
          folder: 'contracts',
        }),
      })

      if (!presignRes.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, fileUrl } = await presignRes.json()

      // Upload file to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file')
      }

      setFormData(prev => ({
        ...prev,
        document_url: fileUrl,
        document_name: file.name,
      }))
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [venueId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.contract_start_date) {
      setError('Contract start date is required')
      return
    }
    if (!formData.contract_end_date) {
      setError('Contract end date is required')
      return
    }
    if (formData.rental_rate_cents <= 0) {
      setError('Rental rate must be greater than 0')
      return
    }
    if (new Date(formData.contract_end_date) <= new Date(formData.contract_start_date)) {
      setError('End date must be after start date')
      return
    }

    setSaving(true)

    try {
      const url = isEditing
        ? `/api/admin/venues/${venueId}/contracts/${contract.id}`
        : `/api/admin/venues/${venueId}/contracts`

      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save contract')
        setSaving(false)
        return
      }

      onSave(result.data)
    } catch {
      setError('Failed to save contract')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-dark-gray border border-white/10">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-dark-gray border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {isEditing ? 'Edit Contract' : 'New Contract'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-magenta flex-shrink-0" />
              <p className="text-magenta">{error}</p>
            </div>
          )}

          {/* Contract Period */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neon mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Contract Period
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-white/60 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={formData.contract_start_date}
                  onChange={e => setFormData(prev => ({ ...prev, contract_start_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">End Date *</label>
                <input
                  type="date"
                  value={formData.contract_end_date}
                  onChange={e => setFormData(prev => ({ ...prev, contract_end_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-white/60 mb-2">Contract Expiration Date</label>
                <input
                  type="date"
                  value={formData.expiration_date || ''}
                  onChange={e => setFormData(prev => ({ ...prev, expiration_date: e.target.value || null }))}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
                <p className="mt-1 text-xs text-white/40">When this contract will automatically expire</p>
              </div>
            </div>
          </div>

          {/* Financial Terms */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neon mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Terms
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-white/60 mb-2">Rental Rate *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rentalRateDollars}
                    onChange={e => handleRentalRateChange(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Deposit Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={depositDollars}
                    onChange={e => handleDepositChange(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-white/60 mb-2">Payment Due Date</label>
                <input
                  type="date"
                  value={formData.payment_due_date || ''}
                  onChange={e => setFormData(prev => ({ ...prev, payment_due_date: e.target.value || null }))}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Setup & Cleanup */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neon mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Setup & Cleanup Times
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-white/60 mb-2">Setup Time (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.setup_time_minutes ?? ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    setup_time_minutes: e.target.value ? parseInt(e.target.value) : null
                  }))}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Cleanup Time (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.cleanup_time_minutes ?? ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    cleanup_time_minutes: e.target.value ? parseInt(e.target.value) : null
                  }))}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Insurance & Policies */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neon mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Insurance & Policies
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Insurance Requirements</label>
                <textarea
                  value={formData.insurance_requirements || ''}
                  onChange={e => setFormData(prev => ({ ...prev, insurance_requirements: e.target.value || null }))}
                  rows={3}
                  placeholder="List any insurance requirements for the venue..."
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Cancellation Policy</label>
                <textarea
                  value={formData.cancellation_policy || ''}
                  onChange={e => setFormData(prev => ({ ...prev, cancellation_policy: e.target.value || null }))}
                  rows={3}
                  placeholder="Describe the cancellation terms..."
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Special Conditions</label>
                <textarea
                  value={formData.special_conditions || ''}
                  onChange={e => setFormData(prev => ({ ...prev, special_conditions: e.target.value || null }))}
                  rows={3}
                  placeholder="Any additional terms or special conditions..."
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neon mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contract Document
            </h3>
            <div className="space-y-4">
              {formData.document_url ? (
                <div className="flex items-center justify-between p-4 bg-black border border-white/20">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-neon" />
                    <span className="text-white">{formData.document_name || 'Contract Document'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, document_url: null, document_name: null }))}
                    className="text-magenta hover:text-magenta/80 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className={cn(
                  "flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 cursor-pointer transition-colors",
                  uploading ? "opacity-50 cursor-not-allowed" : "hover:border-neon/50"
                )}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <>
                      <Loader2 className="h-8 w-8 text-neon animate-spin mb-2" />
                      <span className="text-white/60">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-white/40 mb-2" />
                      <span className="text-white/60">Click to upload PDF contract</span>
                      <span className="text-xs text-white/40 mt-1">PDF files only</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-white/20 text-white font-bold uppercase tracking-wider hover:border-white/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Contract' : 'Create Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
