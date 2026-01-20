'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import {
  GraduationCap,
  Upload,
  BookOpen,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
  FileText,
} from 'lucide-react'
import { fetchUserCertifications, type Certification } from '@/lib/services/certifications'

/**
 * Volunteer Portal Dashboard
 *
 * Shows:
 * - Training/LMS status
 * - Certification upload status
 * - Curriculum access
 * - NFHS Learn external link
 * - Guest Speaker resources
 */

export default function VolunteerDashboard() {
  const { user, hasCompletedRequiredLms } = useAuth()
  const [loading, setLoading] = useState(true)
  const [certifications, setCertifications] = useState<Certification[]>([])

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Volunteer'

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    } else {
      setLoading(false)
    }
  }, [user?.id])

  async function loadDashboardData() {
    if (!user?.id) return

    // Fetch user's certifications
    const { data: certsData, error } = await fetchUserCertifications(user.id)

    if (error) {
      console.error('Error loading certifications:', error)
    }

    if (certsData) {
      setCertifications(certsData.slice(0, 5)) // Limit to 5
    }

    setLoading(false)
  }

  const pendingCerts = certifications.filter(c => c.status === 'pending_review')
  const approvedCerts = certifications.filter(c => c.status === 'approved')

  // Quick links for volunteers
  const quickLinks = [
    {
      title: 'Training & LMS',
      description: 'Complete your volunteer orientation',
      href: '/volunteer/lms',
      icon: GraduationCap,
      color: 'orange',
      badge: !hasCompletedRequiredLms ? 'Required' : 'Complete',
    },
    {
      title: 'Certifications',
      description: 'Upload background checks & training docs',
      href: '/volunteer/certifications',
      icon: Upload,
      color: 'purple',
      badge: pendingCerts.length > 0 ? `${pendingCerts.length} Pending` : undefined,
    },
    {
      title: 'Curriculum Library',
      description: 'View drills, activities, and resources',
      href: '/volunteer/curriculum',
      icon: BookOpen,
      color: 'neon',
    },
    {
      title: 'Guest Speakers',
      description: 'Resources for guest speaker sessions',
      href: '/volunteer/guest-speakers',
      icon: Users,
      color: 'magenta',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-orange-400 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <PortalPageHeader
        title={`Welcome, ${userName}`}
        description="Access training, upload certifications, and view curriculum"
      />

      {/* Training Status Banner */}
      {!hasCompletedRequiredLms && (
        <div className="mb-8 p-6 bg-gradient-to-r from-orange-500/20 to-magenta/20 border border-orange-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Complete Your Training</h2>
                <p className="text-white/60 text-sm mt-1">
                  Finish the Volunteer Orientation to get started at camp.
                </p>
              </div>
            </div>
            <Link
              href="/volunteer/lms"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-bold uppercase tracking-wider hover:bg-orange-500/90 transition-colors whitespace-nowrap"
            >
              Start Training
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}

      {/* Quick Links Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href}>
              <PortalCard
                className="h-full hover:border-white/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className={`h-8 w-8 text-${link.color}`} />
                  {link.badge && (
                    <span className={`px-2 py-0.5 text-xs font-bold uppercase ${
                      link.badge === 'Complete'
                        ? 'bg-neon/10 text-neon'
                        : link.badge === 'Required'
                          ? 'bg-orange-500/10 text-orange-400'
                          : 'bg-purple/10 text-purple'
                    }`}>
                      {link.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-white mb-1">{link.title}</h3>
                <p className="text-sm text-white/50">{link.description}</p>
              </PortalCard>
            </Link>
          )
        })}
      </div>

      {/* External Training Link */}
      <PortalCard className="mb-8" accent="purple">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-purple/20 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="h-6 w-6 text-purple" />
            </div>
            <div>
              <h3 className="font-bold text-white">NFHS Learn - External Training</h3>
              <p className="text-white/60 text-sm mt-1">
                Complete required courses like Concussion in Sports and Heat Illness Prevention.
              </p>
            </div>
          </div>
          <a
            href="https://www.nfhslearn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple text-white font-bold uppercase tracking-wider hover:bg-purple/90 transition-colors whitespace-nowrap"
          >
            Visit NFHS Learn
            <ExternalLink className="h-5 w-5" />
          </a>
        </div>
      </PortalCard>

      {/* Recent Certifications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple" />
            Recent Certifications
          </h2>
          <Link
            href="/volunteer/certifications"
            className="text-sm text-purple hover:text-purple/80"
          >
            View All →
          </Link>
        </div>

        {certifications.length > 0 ? (
          <PortalCard>
            <div className="divide-y divide-white/10">
              {certifications.map((cert) => (
                <div key={cert.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 flex items-center justify-center ${
                      cert.status === 'approved'
                        ? 'bg-neon/20 text-neon'
                        : cert.status === 'pending_review'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}>
                      {cert.status === 'approved' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : cert.status === 'pending_review' ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white capitalize">
                        {cert.document_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-white/50">
                        Submitted {new Date(cert.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold uppercase ${
                    cert.status === 'approved'
                      ? 'bg-neon/10 text-neon'
                      : cert.status === 'pending_review'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-red-500/10 text-red-400'
                  }`}>
                    {cert.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </PortalCard>
        ) : (
          <PortalCard>
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50 mb-4">No certifications uploaded yet</p>
              <Link
                href="/volunteer/certifications"
                className="inline-flex items-center gap-2 text-purple hover:text-purple/80 font-semibold"
              >
                Upload Certification
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </PortalCard>
        )}
      </div>
    </div>
  )
}
