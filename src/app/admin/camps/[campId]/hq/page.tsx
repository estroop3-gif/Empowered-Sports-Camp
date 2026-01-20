'use client'

/**
 * Admin Camp HQ Page
 *
 * Full-featured Camp HQ for HQ Admins with all management capabilities.
 */

import { use } from 'react'
import { AdminLayout, PageHeader } from '@/components/admin/admin-layout'
import { CampHqShell, type CampHqTab } from '@/components/camp-hq'
import { useAuth } from '@/lib/auth/context'
import { useSearchParams } from 'next/navigation'

interface PageProps {
  params: Promise<{ campId: string }>
}

export default function AdminCampHqPage({ params }: PageProps) {
  const { campId } = use(params)
  const { user } = useAuth()
  const searchParams = useSearchParams()

  const initialTab = (searchParams.get('tab') as CampHqTab) || 'overview'

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <CampHqShell
        campId={campId}
        routePrefix="/admin/camps"
        initialTab={initialTab}
        canEdit={true}
        isAdmin={true}
        userId={user?.id}
      />
    </AdminLayout>
  )
}
