'use client'

/**
 * Admin Camp Grouping Page
 *
 * HQ admins and licensee owners use this page to manage
 * group assignments for camps in their scope.
 */

import { use } from 'react'
import CampGroupingTool from '@/components/grouping/CampGroupingTool'

export default function AdminCampGroupingPage({
  params,
}: {
  params: Promise<{ campId: string }>
}) {
  const { campId } = use(params)

  return (
    <CampGroupingTool
      campId={campId}
      mode="admin"
      backUrl={`/admin/camps/${campId}/hq?tab=groups`}
    />
  )
}
