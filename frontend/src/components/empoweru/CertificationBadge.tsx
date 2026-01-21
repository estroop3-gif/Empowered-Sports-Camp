'use client'

/**
 * CertificationBadge
 *
 * Badge component showing certification status.
 */

import { cn } from '@/lib/utils'
import { Award, Clock, Download } from 'lucide-react'
import { useState } from 'react'
import {
  downloadCertificate,
  type CertificateData,
} from '@/lib/services/certificate-generator'

interface CertificationBadgeProps {
  isCertified: boolean
  certifiedAt?: string | null
  certificateNumber?: string | null
  certificateUrl?: string | null
  userName?: string
  role?: string
  tenantName?: string
  completedModules?: string[]
  variant?: 'default' | 'compact' | 'full'
  className?: string
}

export function CertificationBadge({
  isCertified,
  certifiedAt,
  certificateNumber,
  userName,
  role,
  tenantName,
  completedModules = [],
  variant = 'default',
  className,
}: CertificationBadgeProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!certificateNumber || !userName || !role) return

    setDownloading(true)
    try {
      const data: CertificateData = {
        userName,
        role,
        certificateNumber,
        certifiedAt: certifiedAt ? new Date(certifiedAt) : new Date(),
        tenantName,
        completedModules,
      }
      downloadCertificate(data)
    } catch (error) {
      console.error('Failed to download certificate:', error)
    } finally {
      setDownloading(false)
    }
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase',
          isCertified
            ? 'bg-neon/20 text-neon'
            : 'bg-yellow-500/20 text-yellow-400',
          className
        )}
      >
        {isCertified ? (
          <>
            <Award className="h-3 w-3" />
            Certified
          </>
        ) : (
          <>
            <Clock className="h-3 w-3" />
            Pending
          </>
        )}
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div
        className={cn(
          'p-4 border',
          isCertified
            ? 'bg-neon/5 border-neon/30'
            : 'bg-yellow-500/5 border-yellow-500/30',
          className
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'h-12 w-12 flex items-center justify-center flex-shrink-0',
              isCertified ? 'bg-neon/20' : 'bg-yellow-500/20'
            )}
          >
            {isCertified ? (
              <Award className="h-6 w-6 text-neon" />
            ) : (
              <Clock className="h-6 w-6 text-yellow-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'font-bold uppercase tracking-wider',
                isCertified ? 'text-neon' : 'text-yellow-400'
              )}
            >
              {isCertified ? 'Training Certified' : 'Training In Progress'}
            </h3>

            {isCertified && certifiedAt && (
              <p className="text-white/50 text-sm mt-1">
                Certified on{' '}
                {new Date(certifiedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}

            {isCertified && certificateNumber && (
              <p className="text-white/40 text-xs font-mono mt-1">
                #{certificateNumber}
              </p>
            )}

            {!isCertified && (
              <p className="text-white/50 text-sm mt-1">
                Complete all required training modules to get certified
              </p>
            )}
          </div>

          {isCertified && certificateNumber && userName && role && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                downloading
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-neon text-black hover:bg-neon/90'
              )}
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Loading...' : 'Certificate'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-sm font-bold',
        isCertified
          ? 'bg-neon/20 text-neon'
          : 'bg-yellow-500/20 text-yellow-400',
        className
      )}
    >
      {isCertified ? (
        <>
          <Award className="h-4 w-4" />
          Certified
        </>
      ) : (
        <>
          <Clock className="h-4 w-4" />
          Training Required
        </>
      )}
    </div>
  )
}
