'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Admin Camp Creation - Redirects to shared camp creation flow
 * The portal/camps/new page uses AdminLayout which works for both roles
 */
export default function AdminCampNewPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/portal/camps/new')
  }, [router])

  return (
    <div className="min-h-screen bg-dark-100 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  )
}
