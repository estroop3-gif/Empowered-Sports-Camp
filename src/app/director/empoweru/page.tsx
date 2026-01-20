'use client'

/**
 * Director EmpowerU Page
 *
 * EmpowerU LMS for Camp Directors (ICs).
 * Primary portal: Operational Execution
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { PortalLayout, LmsGate } from '@/components/portal'
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

export default function DirectorEmpowerUPage() {
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState<EmpowerUTab>('operational')
  const [operationalModules, setOperationalModules] = useState<EmpowerUModuleWithProgress[]>([])

  useEffect(() => {
    // Load operational modules for progress header
    async function loadModules() {
      try {
        const res = await fetch('/api/empoweru/modules?portalType=OPERATIONAL')
        const json = await res.json()
        if (res.ok) {
          setOperationalModules(json.data || [])
        }
      } catch (err) {
        console.error('Failed to load modules:', err)
      }
    }
    loadModules()
  }, [])

  const completedCount = operationalModules.filter(
    (m) => m.progress_status === 'COMPLETED'
  ).length

  return (
    <LmsGate featureName="EmpowerU Training">
      <EmpowerUShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole={role || 'director'}
      >
        {activeTab === 'operational' && (
          <>
            <PortalProgressHeader
              completedCount={completedCount}
              totalCount={operationalModules.length}
              portalName="Operational Execution"
            />
            <ModuleList portalType="OPERATIONAL" baseRoute="/director/empoweru" />
          </>
        )}

        {activeTab === 'skill-station' && (
          <ModuleList portalType="SKILL_STATION" baseRoute="/director/empoweru" />
        )}

        {activeTab === 'library' && <SharedLibrary baseRoute="/director/empoweru" />}

        {activeTab === 'contributions' && (
          <ContributionCenter userRole={role || 'director'} />
        )}
      </EmpowerUShell>
    </LmsGate>
  )
}
