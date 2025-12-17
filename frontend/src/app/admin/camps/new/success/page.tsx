'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout, ContentCard } from '@/components/admin/admin-layout'
import {
  CheckCircle,
  ArrowRight,
  Calendar,
  Users,
  Settings,
  ExternalLink,
} from 'lucide-react'

export default function CampCreateSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campId = searchParams.get('campId')
  const campName = searchParams.get('name')

  const [countdown, setCountdown] = useState(5)

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      router.replace('/admin/camps')
      return
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, router])

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="max-w-2xl mx-auto py-12">
        {/* Success Icon & Message */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-neon/20 border-2 border-neon mb-6">
            <CheckCircle className="h-10 w-10 text-neon" />
          </div>

          <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-3">
            Camp Created!
          </h1>

          {campName && (
            <p className="text-xl text-white/70 mb-2">
              {campName}
            </p>
          )}

          <p className="text-white/50">
            Your camp has been successfully created and is ready to be configured.
          </p>
        </div>

        {/* Quick Actions */}
        <ContentCard title="What's Next?" accent="neon">
          <div className="space-y-3">
            {campId && (
              <>
                <Link
                  href={`/admin/camps/${campId}/hq?tab=schedule`}
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-neon/50 hover:bg-neon/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-purple" />
                    <div>
                      <div className="font-bold text-white group-hover:text-neon transition-colors">
                        Configure Schedule
                      </div>
                      <div className="text-sm text-white/50">
                        Set up daily activities and time blocks
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-neon transition-colors" />
                </Link>

                <Link
                  href={`/admin/camps/${campId}/hq?tab=staffing`}
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-magenta/50 hover:bg-magenta/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-magenta" />
                    <div>
                      <div className="font-bold text-white group-hover:text-magenta transition-colors">
                        Assign Staff
                      </div>
                      <div className="text-sm text-white/50">
                        Add directors, coaches, and CITs
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-magenta transition-colors" />
                </Link>

                <Link
                  href={`/admin/camps/${campId}`}
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-purple/50 hover:bg-purple/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-purple" />
                    <div>
                      <div className="font-bold text-white group-hover:text-purple transition-colors">
                        Edit Camp Details
                      </div>
                      <div className="text-sm text-white/50">
                        Update pricing, dates, or description
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-purple transition-colors" />
                </Link>
              </>
            )}
          </div>
        </ContentCard>

        {/* Redirect Notice & Actions */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-white/40 text-sm">
            Redirecting to all camps in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/admin/camps"
              className="flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              View All Camps
              <ArrowRight className="h-4 w-4" />
            </Link>

            {campId && (
              <Link
                href={`/admin/camps/${campId}/hq`}
                className="flex items-center gap-2 px-6 py-3 border border-white/20 text-white font-bold uppercase tracking-wider hover:border-white/40 transition-colors"
              >
                Open Camp HQ
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
