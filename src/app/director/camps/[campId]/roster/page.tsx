'use client'

/**
 * Director Camp Roster Page
 *
 * Camp Directors access The Roster for their assigned camps.
 */

import { use } from 'react'
import TheRoster from '@/components/roster/TheRoster'

export default function DirectorCampRosterPage({
  params,
}: {
  params: Promise<{ campId: string }>
}) {
  const { campId } = use(params)

  return (
    <TheRoster
      campId={campId}
      role="director"
      backUrl={`/director/camps/${campId}/hq?tab=campers`}
    />
  )
}
