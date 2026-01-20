'use client'

/**
 * CIT Module Detail Page
 *
 * Individual module view with video and quiz for CIT volunteers.
 */

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { PortalLayout, LmsGate } from '@/components/portal'
import { ModuleDetail } from '@/components/empoweru'
import type { PortalType } from '@/lib/services/empoweru'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function CITModuleDetailPage({ params }: PageProps) {
  const { slug } = use(params)
  const searchParams = useSearchParams()
  const portalType = (searchParams.get('portalType') as PortalType) || 'SKILL_STATION'

  return (
    <LmsGate featureName="EmpowerU Training">
      <ModuleDetail
        slug={slug}
        portalType={portalType}
        backRoute="/cit/empoweru"
      />
    </LmsGate>
  )
}
