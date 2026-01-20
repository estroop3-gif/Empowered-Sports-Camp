'use client'

/**
 * Licensee Camp HQ Page
 *
 * Provides full Camp HQ access for licensees with additional financial controls.
 * Licensees have full visibility + ability to manage closeouts and royalties.
 */

import { use } from 'react'
import { CampHqShell } from '@/components/camp-hq/CampHqShell'
import type { CampHqTab } from '@/components/camp-hq/CampHqShell'

interface Props {
  params: Promise<{ campId: string }>
  searchParams: Promise<{ tab?: string }>
}

export default function LicenseeCampHqPage({ params, searchParams }: Props) {
  const { campId } = use(params)
  const { tab } = use(searchParams)

  // Licensees have full edit access like admins
  return (
    <CampHqShell
      campId={campId}
      routePrefix="/licensee/camps"
      initialTab={(tab as CampHqTab) || 'overview'}
      canEdit={true}
      isAdmin={false}
    />
  )
}
