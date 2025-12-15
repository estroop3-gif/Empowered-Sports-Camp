'use client'

/**
 * CIT EmpowerU Page
 *
 * EmpowerU LMS for CIT Volunteers.
 * Primary portal: Skill Station Training
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { LmsGate } from '@/components/portal'
import {
  EmpowerUShell,
  PortalProgressHeader,
  ModuleList,
  SharedLibrary,
  ContributionCenter,
  type EmpowerUTab,
} from '@/components/empoweru'
import type { EmpowerUModuleWithProgress } from '@/lib/services/empoweru'

export default function CITEmpowerUPage() {
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState<EmpowerUTab>('skill-station')
  const [skillModules, setSkillModules] = useState<EmpowerUModuleWithProgress[]>([])

  useEffect(() => {
    // Load skill station modules for progress header
    async function loadModules() {
      try {
        const res = await fetch('/api/empoweru/modules?portalType=SKILL_STATION')
        const json = await res.json()
        if (res.ok) {
          setSkillModules(json.data || [])
        }
      } catch (err) {
        console.error('Failed to load modules:', err)
      }
    }
    loadModules()
  }, [])

  const completedCount = skillModules.filter(
    (m) => m.progress_status === 'COMPLETED'
  ).length

  return (
    <LmsGate featureName="EmpowerU Training">
      <EmpowerUShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole={role || 'cit_volunteer'}
      >
        {activeTab === 'skill-station' && (
          <>
            <PortalProgressHeader
              completedCount={completedCount}
              totalCount={skillModules.length}
              portalName="Skill Station Training"
            />
            <ModuleList portalType="SKILL_STATION" baseRoute="/cit/empoweru" />
          </>
        )}

        {activeTab === 'library' && <SharedLibrary baseRoute="/cit/empoweru" />}

        {activeTab === 'contributions' && (
          <ContributionCenter userRole={role || 'cit_volunteer'} />
        )}
      </EmpowerUShell>
    </LmsGate>
  )
}
