'use client'

/**
 * Admin Camp Roster Page
 *
 * HQ Admins and Licensee Owners access The Roster for any camp.
 */

import { use } from 'react'
import TheRoster from '@/components/roster/TheRoster'

export default function AdminCampRosterPage({
  params,
}: {
  params: Promise<{ campId: string }>
}) {
  const { campId } = use(params)

  return (
    <TheRoster
      campId={campId}
      role="hq_admin"
      backUrl={`/admin/camps/${campId}/hq?tab=campers`}
    />
  )
}
