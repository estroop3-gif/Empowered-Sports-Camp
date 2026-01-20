'use client'

/**
 * Coach Camp Roster Page
 *
 * Coaches access The Roster for their assigned camps.
 * Limited permissions: view-only for contact info, can update check-in status.
 */

import { use } from 'react'
import TheRoster from '@/components/roster/TheRoster'

export default function CoachCampRosterPage({
  params,
}: {
  params: Promise<{ campId: string }>
}) {
  const { campId } = use(params)

  return (
    <TheRoster
      campId={campId}
      role="coach"
      backUrl={`/coach/camps/${campId}`}
    />
  )
}
