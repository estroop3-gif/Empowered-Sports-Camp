'use client'

/**
 * EmpowerUShell
 *
 * Main container for the EmpowerU learning management system.
 * Provides tabbed navigation between portals, shared library, and contribution center.
 */

import { cn } from '@/lib/utils'
import {
  GraduationCap,
  Briefcase,
  Target,
  BookOpen,
  Upload,
  ChevronRight,
  ClipboardCheck,
  Settings,
  Cog,
} from 'lucide-react'
import { PortalType } from '@/lib/services/empoweru'

export type EmpowerUTab =
  | 'operational'
  | 'business'
  | 'skill-station'
  | 'library'
  | 'contributions'
  | 'admin-review'
  | 'requirements'
  | 'manage-modules'

interface TabConfig {
  id: EmpowerUTab
  label: string
  shortLabel: string
  icon: React.ElementType
  portalType?: PortalType
  description: string
  allowedRoles: string[]
}

const TABS: TabConfig[] = [
  {
    id: 'operational',
    label: 'Operational Execution',
    shortLabel: 'Operational',
    icon: Target,
    portalType: 'OPERATIONAL',
    description: 'Camp operations, safety, and leadership training for directors',
    allowedRoles: ['director', 'hq_admin', 'licensee_owner'],
  },
  {
    id: 'business',
    label: 'Business & Strategy',
    shortLabel: 'Business',
    icon: Briefcase,
    portalType: 'BUSINESS',
    description: 'Financial modeling, marketing, and business growth for licensees',
    allowedRoles: ['licensee_owner', 'hq_admin'],
  },
  {
    id: 'skill-station',
    label: 'Skill Station Training',
    shortLabel: 'Skills',
    icon: GraduationCap,
    portalType: 'SKILL_STATION',
    description: 'Hands-on training for CITs, volunteers, and coaches',
    allowedRoles: ['cit_volunteer', 'coach', 'director', 'hq_admin', 'licensee_owner'],
  },
  {
    id: 'library',
    label: 'Shared Library',
    shortLabel: 'Library',
    icon: BookOpen,
    description: 'Browse all approved training content',
    allowedRoles: ['cit_volunteer', 'coach', 'director', 'hq_admin', 'licensee_owner'],
  },
  {
    id: 'contributions',
    label: 'Contribution Center',
    shortLabel: 'Contribute',
    icon: Upload,
    description: 'Submit and manage your training content',
    allowedRoles: ['cit_volunteer', 'coach', 'director', 'licensee_owner'],
  },
  {
    id: 'admin-review',
    label: 'Admin Review',
    shortLabel: 'Review',
    icon: ClipboardCheck,
    description: 'Review and approve user-submitted content',
    allowedRoles: ['hq_admin', 'licensee_owner'],
  },
  {
    id: 'requirements',
    label: 'Training Requirements',
    shortLabel: 'Requirements',
    icon: Settings,
    description: 'Configure which modules are required for each role',
    allowedRoles: ['hq_admin'],
  },
  {
    id: 'manage-modules',
    label: 'Manage Modules',
    shortLabel: 'Manage',
    icon: Cog,
    description: 'Create, edit, and manage training modules and quizzes',
    allowedRoles: ['hq_admin'],
  },
]

interface EmpowerUShellProps {
  children: React.ReactNode
  activeTab: EmpowerUTab
  onTabChange: (tab: EmpowerUTab) => void
  userRole: string
  showHeader?: boolean
}

export function EmpowerUShell({
  children,
  activeTab,
  onTabChange,
  userRole,
  showHeader = true,
}: EmpowerUShellProps) {
  // Filter tabs based on user role
  const visibleTabs = TABS.filter((tab) => tab.allowedRoles.includes(userRole))

  const activeTabConfig = TABS.find((t) => t.id === activeTab)

  return (
    <div className="min-h-screen">
      {/* Header */}
      {showHeader && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-gradient-to-br from-neon via-magenta to-purple flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-wider text-white">
                EmpowerU
              </h1>
              <p className="text-white/50 text-sm">Training & Development Platform</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-white/10">
        <div className="flex flex-wrap gap-1">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 -mb-[2px]',
                  isActive
                    ? 'border-neon text-neon bg-neon/5'
                    : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            )
          })}

        </div>
      </div>

      {/* Tab Description */}
      {activeTabConfig && (
        <div className="mb-6 p-4 bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <activeTabConfig.icon className="h-5 w-5 text-neon" />
            <div>
              <h2 className="text-lg font-bold text-white">{activeTabConfig.label}</h2>
              <p className="text-white/50 text-sm">{activeTabConfig.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div>{children}</div>
    </div>
  )
}

/**
 * Portal progress header showing completion stats
 */
export function PortalProgressHeader({
  completedCount,
  totalCount,
  portalName,
}: {
  completedCount: number
  totalCount: number
  portalName: string
}) {
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="mb-6 p-4 bg-black border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/70 text-sm uppercase tracking-wider">{portalName} Progress</span>
        <span className="text-neon font-bold">
          {completedCount}/{totalCount} Completed
        </span>
      </div>
      <div className="h-2 bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-neon to-magenta transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {progressPercent === 100 && (
        <p className="text-neon text-sm mt-2 font-bold uppercase">
          Portal Complete - All Tools Unlocked!
        </p>
      )}
    </div>
  )
}

export { TABS as EMPOWERU_TABS }
export type { TabConfig as EmpowerUTabConfig }
