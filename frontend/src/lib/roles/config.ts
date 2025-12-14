/**
 * Role Configuration
 *
 * Central configuration for all role-related mappings in the app.
 * This file defines:
 * - Role hierarchy
 * - Dashboard routes per role
 * - Navigation items per role
 * - Role display information
 *
 * SECURITY NOTE:
 * This configuration is used for UI rendering only.
 * All actual permission checks happen via:
 * - Supabase RLS policies (server-side, using real user/role)
 * - Middleware route protection (using real role from user_roles table)
 *
 * The "View As" feature changes viewingRole for UI purposes only.
 * It does NOT change the actual authenticated user or their permissions.
 */

import {
  Shield,
  Building2,
  Users,
  UserCheck,
  Crown,
  LayoutDashboard,
  Calendar,
  DollarSign,
  Settings,
  BarChart3,
  FileText,
  MapPin,
  UserCircle,
  Clipboard,
  GraduationCap,
  Upload,
  BookOpen,
  ExternalLink,
} from 'lucide-react'

export type UserRole = 'parent' | 'coach' | 'director' | 'licensee_owner' | 'hq_admin' | 'cit_volunteer'

/**
 * Role hierarchy from lowest to highest privilege
 * Used for permission comparisons
 */
export const ROLE_HIERARCHY: UserRole[] = [
  'parent',
  'cit_volunteer',
  'coach',
  'director',
  'licensee_owner',
  'hq_admin',
]

/**
 * Role → Home Dashboard Route Mapping
 *
 * When a user logs in or changes their "View As" role,
 * they should be directed to this route.
 */
export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  parent: '/dashboard',
  cit_volunteer: '/volunteer',
  coach: '/portal',
  director: '/director',
  licensee_owner: '/portal',
  hq_admin: '/admin',
}

/**
 * Role Display Configuration
 *
 * Used for badges, dropdowns, and UI elements
 */
export const ROLE_CONFIG: Record<UserRole, {
  label: string
  shortLabel: string
  description: string
  icon: typeof Shield
  color: string
  bgColor: string
  borderColor: string
}> = {
  hq_admin: {
    label: 'HQ Admin',
    shortLabel: 'HQ',
    description: 'Full system access - manage all licensees, analytics, and settings',
    icon: Shield,
    color: 'text-neon',
    bgColor: 'bg-neon/10',
    borderColor: 'border-neon/30',
  },
  licensee_owner: {
    label: 'Licensee Owner',
    shortLabel: 'Licensee',
    description: 'Manage your franchise - camps, staff, and local operations',
    icon: Building2,
    color: 'text-purple',
    bgColor: 'bg-purple/10',
    borderColor: 'border-purple/30',
  },
  director: {
    label: 'Director',
    shortLabel: 'Director',
    description: 'Oversee camps and sessions - grouping, curriculum, and staff',
    icon: Users,
    color: 'text-magenta',
    bgColor: 'bg-magenta/10',
    borderColor: 'border-magenta/30',
  },
  coach: {
    label: 'Coach',
    shortLabel: 'Coach',
    description: 'Daily operations - rosters, check-ins, and session management',
    icon: UserCheck,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
  },
  parent: {
    label: 'Parent',
    shortLabel: 'Parent',
    description: 'Manage your athletes and camp registrations',
    icon: Crown,
    color: 'text-white/70',
    bgColor: 'bg-white/5',
    borderColor: 'border-white/20',
  },
  cit_volunteer: {
    label: 'CIT / Volunteer',
    shortLabel: 'Volunteer',
    description: 'Training, certifications, and curriculum access',
    icon: UserCheck,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    borderColor: 'border-orange-400/30',
  },
}

/**
 * Navigation Items per Role
 *
 * Each role sees a different set of navigation items.
 * This is used by the RoleBasedNavigation component.
 */
export interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  badge?: string
}

export const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  hq_admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Licensees', href: '/admin/licensees', icon: Building2 },
    { label: 'Camps', href: '/portal/camps', icon: Calendar },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Revenue', href: '/admin/revenue', icon: DollarSign },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Curriculum', href: '/admin/curriculum', icon: FileText },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  licensee_owner: [
    { label: 'Dashboard', href: '/portal', icon: LayoutDashboard },
    { label: 'Camps', href: '/portal/camps', icon: Calendar },
    { label: 'Registrations', href: '/portal/registrations', icon: Clipboard },
    { label: 'Athletes', href: '/portal/athletes', icon: Crown },
    { label: 'Locations', href: '/portal/locations', icon: MapPin },
    { label: 'Staff', href: '/portal/staff', icon: UserCircle },
    { label: 'Financials', href: '/portal/financials', icon: DollarSign },
    { label: 'Reports', href: '/portal/reports', icon: BarChart3 },
    { label: 'Settings', href: '/portal/settings', icon: Settings },
  ],
  director: [
    { label: 'Dashboard', href: '/portal', icon: LayoutDashboard },
    { label: 'Camps', href: '/portal/camps', icon: Calendar },
    { label: 'Registrations', href: '/portal/registrations', icon: Clipboard },
    { label: 'Athletes', href: '/portal/athletes', icon: Crown },
    { label: 'Locations', href: '/portal/locations', icon: MapPin },
    { label: 'Staff', href: '/portal/staff', icon: UserCircle },
    { label: 'Reports', href: '/portal/reports', icon: BarChart3 },
  ],
  coach: [
    { label: 'Dashboard', href: '/portal', icon: LayoutDashboard },
    { label: 'My Sessions', href: '/portal/sessions', icon: Calendar },
    { label: 'Rosters', href: '/portal/rosters', icon: Users },
    { label: 'Check-In', href: '/portal/checkin', icon: UserCheck },
  ],
  parent: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Athletes', href: '/dashboard/athletes', icon: Crown },
    { label: 'Find Camps', href: '/camps', icon: Calendar },
    { label: 'Registrations', href: '/dashboard/registrations', icon: Clipboard },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  cit_volunteer: [
    { label: 'Dashboard', href: '/volunteer', icon: LayoutDashboard },
    { label: 'Training & LMS', href: '/volunteer/lms', icon: GraduationCap },
    { label: 'Certifications', href: '/volunteer/certifications', icon: Upload },
    { label: 'Curriculum', href: '/volunteer/curriculum', icon: BookOpen },
    { label: 'Guest Speakers', href: '/volunteer/guest-speakers', icon: Users },
  ],
}

/**
 * Roles that can use the "View As" feature
 * Currently only hq_admin can impersonate other roles
 */
export const ROLES_WITH_VIEW_AS: UserRole[] = ['hq_admin']

/**
 * Check if a role can use View As feature
 */
export function canUseViewAs(role: UserRole | null): boolean {
  if (!role) return false
  return ROLES_WITH_VIEW_AS.includes(role)
}

/**
 * Get all roles available for View As dropdown
 * Returns all roles in hierarchy order
 */
export function getViewAsOptions(): UserRole[] {
  return [...ROLE_HIERARCHY].reverse() // Show highest first
}

/**
 * Get the home route for a given role
 */
export function getHomeRouteForRole(role: UserRole): string {
  return ROLE_HOME_ROUTES[role]
}

/**
 * Get navigation items for a given role
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return ROLE_NAV_ITEMS[role] || []
}

/**
 * Get role display config
 */
export function getRoleConfig(role: UserRole) {
  return ROLE_CONFIG[role]
}
