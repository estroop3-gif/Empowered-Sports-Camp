'use client'

/**
 * Admin EmpowerU Page
 *
 * EmpowerU LMS administration for HQ Admins.
 * Full access to all portals plus admin review functionality.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import {
  EmpowerUShell,
  PortalProgressHeader,
  ModuleList,
  SharedLibrary,
  ContributionCenter,
  AdminReview,
  RoleRequirementsAdmin,
  ManageModules,
  type EmpowerUTab,
} from '@/components/empoweru'
import type { EmpowerUModuleWithProgress } from '@/lib/services/empoweru'

export default function AdminEmpowerUPage() {
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState<EmpowerUTab>('operational')
  const [moduleStats, setModuleStats] = useState({
    operational: { completed: 0, total: 0 },
    business: { completed: 0, total: 0 },
    skillStation: { completed: 0, total: 0 },
  })

  useEffect(() => {
    // Load module stats for all portals
    async function loadStats() {
      try {
        const [opRes, bizRes, skillRes] = await Promise.all([
          fetch('/api/empoweru/modules?portalType=OPERATIONAL'),
          fetch('/api/empoweru/modules?portalType=BUSINESS'),
          fetch('/api/empoweru/modules?portalType=SKILL_STATION'),
        ])

        const [opJson, bizJson, skillJson] = await Promise.all([
          opRes.json(),
          bizRes.json(),
          skillRes.json(),
        ])

        const countCompleted = (modules: EmpowerUModuleWithProgress[]) =>
          modules.filter((m) => m.progress_status === 'COMPLETED').length

        setModuleStats({
          operational: {
            completed: countCompleted(opJson.data || []),
            total: (opJson.data || []).length,
          },
          business: {
            completed: countCompleted(bizJson.data || []),
            total: (bizJson.data || []).length,
          },
          skillStation: {
            completed: countCompleted(skillJson.data || []),
            total: (skillJson.data || []).length,
          },
        })
      } catch (err) {
        console.error('Failed to load module stats:', err)
      }
    }
    loadStats()
  }, [])

  return (
    <EmpowerUShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userRole={role || 'hq_admin'}
    >
      {activeTab === 'operational' && (
        <>
          <PortalProgressHeader
            completedCount={moduleStats.operational.completed}
            totalCount={moduleStats.operational.total}
            portalName="Operational Execution"
          />
          <ModuleList portalType="OPERATIONAL" baseRoute="/admin/empoweru" />
        </>
      )}

      {activeTab === 'business' && (
        <>
          <PortalProgressHeader
            completedCount={moduleStats.business.completed}
            totalCount={moduleStats.business.total}
            portalName="Business & Strategy"
          />
          <ModuleList portalType="BUSINESS" baseRoute="/admin/empoweru" />
        </>
      )}

      {activeTab === 'skill-station' && (
        <>
          <PortalProgressHeader
            completedCount={moduleStats.skillStation.completed}
            totalCount={moduleStats.skillStation.total}
            portalName="Skill Station Training"
          />
          <ModuleList portalType="SKILL_STATION" baseRoute="/admin/empoweru" />
        </>
      )}

      {activeTab === 'library' && <SharedLibrary baseRoute="/admin/empoweru" />}

      {activeTab === 'contributions' && (
        <ContributionCenter userRole={role || 'hq_admin'} />
      )}

      {activeTab === 'admin-review' && (
        <AdminReview userRole={role || 'hq_admin'} />
      )}

      {activeTab === 'requirements' && <RoleRequirementsAdmin />}

      {activeTab === 'manage-modules' && <ManageModules baseRoute="/admin/empoweru" />}
    </EmpowerUShell>
  )
}
