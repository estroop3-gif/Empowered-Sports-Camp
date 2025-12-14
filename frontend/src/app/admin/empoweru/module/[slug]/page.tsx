'use client'

/**
 * Admin Module Detail Page
 *
 * Individual module view with video and quiz for admins.
 */

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { ModuleDetail } from '@/components/empoweru'
import type { PortalType } from '@/lib/services/empoweru'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function AdminModuleDetailPage({ params }: PageProps) {
  const { slug } = use(params)
  const searchParams = useSearchParams()
  const portalType = (searchParams.get('portalType') as PortalType) || 'OPERATIONAL'

  return (
    <ModuleDetail
      slug={slug}
      portalType={portalType}
      backRoute="/admin/empoweru"
    />
  )
}
