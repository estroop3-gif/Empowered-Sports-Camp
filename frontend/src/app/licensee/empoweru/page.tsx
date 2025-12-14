'use client'

/**
 * Licensee EmpowerU Page
 *
 * EmpowerU LMS for Licensee Owners.
 * Primary portal: Business & Strategy
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { PortalLayout } from '@/components/portal'
import {
  EmpowerUShell,
  PortalProgressHeader,
  ModuleList,
  SharedLibrary,
  ContributionCenter,
  AdminReview,
  type EmpowerUTab,
} from '@/components/empoweru'
import type { EmpowerUModuleWithProgress } from '@/lib/services/empoweru'

export default function LicenseeEmpowerUPage() {
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState<EmpowerUTab>('business')
  const [businessModules, setBusinessModules] = useState<EmpowerUModuleWithProgress[]>([])

  useEffect(() => {
    // Load business modules for progress header
    async function loadModules() {
      try {
        const res = await fetch('/api/empoweru/modules?portalType=BUSINESS')
        const json = await res.json()
        if (res.ok) {
          setBusinessModules(json.data || [])
        }
      } catch (err) {
        console.error('Failed to load modules:', err)
      }
    }
    loadModules()
  }, [])

  const completedCount = businessModules.filter(
    (m) => m.progress_status === 'COMPLETED'
  ).length

  return (
    <EmpowerUShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userRole={role || 'licensee_owner'}
    >
      {activeTab === 'business' && (
        <>
          <PortalProgressHeader
            completedCount={completedCount}
            totalCount={businessModules.length}
            portalName="Business & Strategy"
          />
          <ModuleList portalType="BUSINESS" baseRoute="/licensee/empoweru" />
        </>
      )}

      {activeTab === 'operational' && (
        <ModuleList portalType="OPERATIONAL" baseRoute="/licensee/empoweru" />
      )}

      {activeTab === 'skill-station' && (
        <ModuleList portalType="SKILL_STATION" baseRoute="/licensee/empoweru" />
      )}

      {activeTab === 'library' && <SharedLibrary baseRoute="/licensee/empoweru" />}

      {activeTab === 'contributions' && (
        <ContributionCenter userRole={role || 'licensee_owner'} />
      )}
    </EmpowerUShell>
  )
}
