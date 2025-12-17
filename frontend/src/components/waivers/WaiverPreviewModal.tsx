'use client'

import { X, Globe, Building2, Shield, Clock, CheckCircle } from 'lucide-react'

interface WaiverTemplate {
  id: string
  title: string
  description: string | null
  contentHtml: string
  isMandatorySiteWide: boolean
  isActive: boolean
  currentVersion: number
  createdAt: string
  updatedAt: string
  tenant: { id: string; name: string } | null
  createdByUser: { id: string; firstName: string | null; lastName: string | null } | null
  _count: {
    campRequirements: number
    athleteSignings: number
  }
}

interface WaiverPreviewModalProps {
  waiver: WaiverTemplate
  onClose: () => void
}

export function WaiverPreviewModal({ waiver, onClose }: WaiverPreviewModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
      <div className="bg-dark-100 border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-3">
              {waiver.title}
              {waiver.isMandatorySiteWide && (
                <span className="px-2 py-0.5 text-xs bg-magenta/10 text-magenta border border-magenta/30">
                  MANDATORY
                </span>
              )}
            </h2>
            <p className="text-sm text-white/50 mt-1">
              Version {waiver.currentVersion} • {waiver._count.athleteSignings} signatures
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Meta Info */}
        <div className="px-6 py-4 bg-black/30 border-b border-white/10 flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            {waiver.isMandatorySiteWide ? (
              <>
                <Globe className="h-4 w-4 text-magenta" />
                <span className="text-sm text-magenta">Site-Wide</span>
              </>
            ) : waiver.tenant ? (
              <>
                <Building2 className="h-4 w-4 text-white/40" />
                <span className="text-sm text-white/70">{waiver.tenant.name}</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 text-purple" />
                <span className="text-sm text-purple">HQ Only</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {waiver.isActive ? (
              <>
                <CheckCircle className="h-4 w-4 text-neon" />
                <span className="text-sm text-neon">Active</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-magenta" />
                <span className="text-sm text-magenta">Inactive</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Updated {formatDate(waiver.updatedAt)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {waiver.description && (
            <p className="text-white/60 mb-6 pb-6 border-b border-white/10">
              {waiver.description}
            </p>
          )}
          <div
            className="prose prose-invert prose-sm max-w-none
              prose-headings:text-white prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-wider
              prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
              prose-p:text-white/80 prose-p:leading-relaxed
              prose-strong:text-white
              prose-ul:text-white/80 prose-ol:text-white/80
              prose-li:marker:text-neon"
            dangerouslySetInnerHTML={{ __html: waiver.contentHtml }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 text-white font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
