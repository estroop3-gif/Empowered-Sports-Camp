'use client'

/**
 * Director Camp Grouping Page
 *
 * Camp directors use this page to manage group assignments
 * for their assigned camps.
 */

import { use } from 'react'
import CampGroupingTool from '@/components/grouping/CampGroupingTool'

export default function DirectorCampGroupingPage({
  params,
}: {
  params: Promise<{ campId: string }>
}) {
  const { campId } = use(params)

  return (
    <CampGroupingTool
      campId={campId}
      mode="director"
      backUrl={`/director/camps/${campId}/hq?tab=groups`}
    />
  )
}
