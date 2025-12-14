'use client'

/**
 * Director Camp HQ Page
 *
 * Camp HQ for Directors with operational management capabilities.
 */

import { use } from 'react'
import { PortalLayout, LmsGate } from '@/components/portal'
import { CampHqShell, type CampHqTab } from '@/components/camp-hq'
import { useAuth } from '@/lib/auth/context'
import { useSearchParams } from 'next/navigation'

interface PageProps {
  params: Promise<{ campId: string }>
}

export default function DirectorCampHqPage({ params }: PageProps) {
  const { campId } = use(params)
  const { user } = useAuth()
  const searchParams = useSearchParams()

  const initialTab = (searchParams.get('tab') as CampHqTab) || 'overview'

  return (
    <LmsGate featureName="Camp HQ">
      <CampHqShell
        campId={campId}
        routePrefix="/director/camps"
        initialTab={initialTab}
        canEdit={true}
        isAdmin={false}
        userId={user?.id}
      />
    </LmsGate>
  )
}
