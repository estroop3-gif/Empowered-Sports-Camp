'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import {
  Plus,
  FileText,
  Download,
  Send,
  CheckCircle,
  Edit2,
  Trash2,
  Loader2,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  Mail,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ContractFormModal from './ContractFormModal'

type ContractStatus = 'draft' | 'sent' | 'signed' | 'expired'

interface Contract {
  id: string
  venue_id: string
  tenant_id: string | null
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
  document_url: string | null
  document_name: string | null
  status: ContractStatus
  sent_at: string | null
  sent_to_email: string | null
  signed_at: string | null
  expiration_date: string | null
  created_at: string
  updated_at: string
}

interface ContractListProps {
  venueId: string
  venueName: string
  venueContactEmail?: string | null
  openAddModal?: boolean
}

const STATUS_STYLES: Record<ContractStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-white/10', text: 'text-white/60', label: 'Draft' },
  sent: { bg: 'bg-magenta/20', text: 'text-magenta', label: 'Sent' },
  signed: { bg: 'bg-neon/20', text: 'text-neon', label: 'Signed' },
  expired: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Expired' },
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ContractList({ venueId, venueName, venueContactEmail, openAddModal }: ContractListProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [sendEmailModal, setSendEmailModal] = useState<Contract | null>(null)
  const [sendEmail, setSendEmail] = useState('')

  // Fetch contracts
  useEffect(() => {
    async function fetchContracts() {
      try {
        const response = await fetch(`/api/admin/venues/${venueId}/contracts`, {
          credentials: 'include',
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Failed to load contracts')
          return
        }

        setContracts(result.data || [])
      } catch {
        setError('Failed to load contracts')
      } finally {
        setLoading(false)
      }
    }

    fetchContracts()
  }, [venueId])

  // Open add modal when triggered externally
  useEffect(() => {
    if (openAddModal) {
      setEditingContract(null)
      setShowModal(true)
    }
  }, [openAddModal])

  const handleAddContract = () => {
    setEditingContract(null)
    setShowModal(true)
  }

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract)
    setShowModal(true)
  }

  const handleSaveContract = (savedContract: Contract) => {
    if (editingContract) {
      setContracts(prev => prev.map(c => c.id === savedContract.id ? savedContract : c))
    } else {
      setContracts(prev => [savedContract, ...prev])
    }
    setShowModal(false)
    setEditingContract(null)
  }

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return

    setProcessingAction(`delete-${contractId}`)
    try {
      const response = await fetch(`/api/admin/venues/${venueId}/contracts/${contractId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setContracts(prev => prev.filter(c => c.id !== contractId))
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to delete contract')
      }
    } catch {
      alert('Failed to delete contract')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleDownloadPdf = async (contract: Contract) => {
    setProcessingAction(`download-${contract.id}`)
    try {
      const response = await fetch(`/api/admin/venues/${venueId}/contracts/${contract.id}/pdf`, {
        credentials: 'include',
      })

      if (!response.ok) {
        alert('Failed to download PDF')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contract-${venueName.replace(/[^a-zA-Z0-9]/g, '-')}-${contract.contract_start_date}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download PDF')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleOpenSendModal = (contract: Contract) => {
    setSendEmailModal(contract)
    setSendEmail(venueContactEmail || '')
  }

  const handleSendContract = async () => {
    if (!sendEmailModal) return
    if (!sendEmail) {
      alert('Please enter an email address')
      return
    }

    setProcessingAction(`send-${sendEmailModal.id}`)
    try {
      const response = await fetch(`/api/admin/venues/${venueId}/contracts/${sendEmailModal.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: sendEmail }),
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || 'Failed to send contract')
        return
      }

      setContracts(prev => prev.map(c => c.id === sendEmailModal.id ? result.data : c))
      setSendEmailModal(null)
      setSendEmail('')
      alert('Contract sent successfully!')
    } catch {
      alert('Failed to send contract')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleViewDocument = async (contract: Contract) => {
    setProcessingAction(`view-${contract.id}`)
    try {
      const response = await fetch(`/api/admin/venues/${venueId}/contracts/${contract.id}/document`, {
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || 'Failed to get document URL')
        return
      }

      // Open the presigned URL in a new tab
      window.open(result.url, '_blank')
    } catch {
      alert('Failed to get document URL')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleMarkAsSigned = async (contract: Contract) => {
    if (!confirm('Mark this contract as signed?')) return

    setProcessingAction(`sign-${contract.id}`)
    try {
      const response = await fetch(`/api/admin/venues/${venueId}/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'mark_signed' }),
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || 'Failed to mark contract as signed')
        return
      }

      setContracts(prev => prev.map(c => c.id === contract.id ? result.data : c))
    } catch {
      alert('Failed to mark contract as signed')
    } finally {
      setProcessingAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-neon" />
          Contracts
        </h3>
        <button
          onClick={handleAddContract}
          className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold text-sm uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Contract
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta flex-shrink-0" />
          <p className="text-magenta">{error}</p>
        </div>
      )}

      {/* Contract List */}
      {contracts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/20">
          <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-4">No contracts yet</p>
          <button
            onClick={handleAddContract}
            className="text-neon hover:underline text-sm"
          >
            Add your first contract
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(contract => {
            const status = STATUS_STYLES[contract.status]
            const isProcessing = processingAction?.includes(contract.id)

            return (
              <div
                key={contract.id}
                className="p-4 bg-black border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Contract Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn('px-2 py-0.5 text-xs font-bold uppercase', status.bg, status.text)}>
                        {status.label}
                      </span>
                      <span className="text-white font-medium">
                        {formatCurrency(contract.rental_rate_cents)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(contract.contract_start_date)} - {formatDate(contract.contract_end_date)}
                      </span>
                      {contract.deposit_cents && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          Deposit: {formatCurrency(contract.deposit_cents)}
                        </span>
                      )}
                      {(contract.setup_time_minutes || contract.cleanup_time_minutes) && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Setup: {contract.setup_time_minutes || 0}m / Cleanup: {contract.cleanup_time_minutes || 0}m
                        </span>
                      )}
                    </div>

                    {/* Status details */}
                    {contract.sent_at && (
                      <p className="mt-2 text-xs text-white/40">
                        Sent to {contract.sent_to_email} on {formatDate(contract.sent_at)}
                      </p>
                    )}
                    {contract.signed_at && (
                      <p className="mt-1 text-xs text-neon">
                        Signed on {formatDate(contract.signed_at)}
                      </p>
                    )}

                    {/* Document link */}
                    {contract.document_url && (
                      <button
                        onClick={() => handleViewDocument(contract)}
                        disabled={processingAction === `view-${contract.id}`}
                        className="inline-flex items-center gap-1 mt-2 text-xs text-neon hover:underline disabled:opacity-50"
                      >
                        {processingAction === `view-${contract.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3 w-3" />
                        )}
                        View uploaded document
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Download PDF */}
                    <button
                      onClick={() => handleDownloadPdf(contract)}
                      disabled={isProcessing}
                      className="p-2 text-white/60 hover:text-neon hover:bg-neon/10 transition-colors disabled:opacity-50"
                      title="Download PDF"
                    >
                      {processingAction === `download-${contract.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </button>

                    {/* Send email (only for draft/sent) */}
                    {(contract.status === 'draft' || contract.status === 'sent') && (
                      <button
                        onClick={() => handleOpenSendModal(contract)}
                        disabled={isProcessing}
                        className="p-2 text-white/60 hover:text-magenta hover:bg-magenta/10 transition-colors disabled:opacity-50"
                        title="Send to venue"
                      >
                        {processingAction === `send-${contract.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {/* Mark as signed (only for sent) */}
                    {contract.status === 'sent' && (
                      <button
                        onClick={() => handleMarkAsSigned(contract)}
                        disabled={isProcessing}
                        className="p-2 text-white/60 hover:text-neon hover:bg-neon/10 transition-colors disabled:opacity-50"
                        title="Mark as signed"
                      >
                        {processingAction === `sign-${contract.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {/* Edit (only for draft) */}
                    {contract.status === 'draft' && (
                      <button
                        onClick={() => handleEditContract(contract)}
                        disabled={isProcessing}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}

                    {/* Delete (only for draft) */}
                    {contract.status === 'draft' && (
                      <button
                        onClick={() => handleDeleteContract(contract.id)}
                        disabled={isProcessing}
                        className="p-2 text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {processingAction === `delete-${contract.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Contract Form Modal */}
      {showModal && (
        <ContractFormModal
          venueId={venueId}
          contract={editingContract}
          onClose={() => {
            setShowModal(false)
            setEditingContract(null)
          }}
          onSave={handleSaveContract}
        />
      )}

      {/* Send Email Modal */}
      {sendEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-dark-gray border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-neon" />
              Send Contract
            </h3>
            <p className="text-white/60 text-sm mb-4">
              Enter the email address to send the contract to:
            </p>
            <input
              type="email"
              value={sendEmail}
              onChange={e => setSendEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSendEmailModal(null)
                  setSendEmail('')
                }}
                className="px-4 py-2 border border-white/20 text-white font-bold text-sm uppercase tracking-wider hover:border-white/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendContract}
                disabled={processingAction === `send-${sendEmailModal.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold text-sm uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                {processingAction === `send-${sendEmailModal.id}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
