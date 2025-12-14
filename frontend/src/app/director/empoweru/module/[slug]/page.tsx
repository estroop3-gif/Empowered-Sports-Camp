'use client'

/**
 * Director Module Detail Page
 *
 * Individual module view with video and quiz for directors.
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

export default function DirectorModuleDetailPage({ params }: PageProps) {
  const { slug } = use(params)
  const searchParams = useSearchParams()
  const portalType = (searchParams.get('portalType') as PortalType) || 'OPERATIONAL'

  return (
    <LmsGate featureName="EmpowerU Training">
      <ModuleDetail
        slug={slug}
        portalType={portalType}
        backRoute="/director/empoweru"
      />
    </LmsGate>
  )
}
