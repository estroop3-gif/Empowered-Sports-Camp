'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth, type UserRole } from '@/lib/auth/context'
import { useBannerOffset } from '@/hooks/useBannerOffset'
import { LogoutButton, UserMenu } from '@/components/layout/user-menu'
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  DollarSign,
  Settings,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  Crown,
  Zap,
  MapPin,
  UserCircle,
  BarChart3,
  FileText,
  Shield,
  GraduationCap,
  ShoppingBag,
  Inbox,
  Briefcase,
  Trophy,
  Mail,
  Heart,
  Tag,
  Download,
} from 'lucide-react'
import { ViewAsControl } from './view-as-control'

/**
 * AdminLayout - Brand-consistent admin shell
 *
 * DESIGN NOTES:
 * - Sidebar: Black background with neon accent on active items
 * - Content area: Dark gray (dark-100) background
 * - Top bar: Black with gradient accent border
 * - All typography follows brand: uppercase labels, Poppins font
 * - Sharp edges throughout, glow effects on interactive elements
 *
 * This layout adapts for:
 * - Licensor Admin (full navigation)
 * - Licensee Portal (scoped navigation)
 * - Mobile responsive with collapsible sidebar
 */

interface AdminLayoutProps {
  children: React.ReactNode
  userRole: UserRole
  userName: string
  tenantName?: string
  tenantLogo?: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: UserRole[]
  children?: { label: string; href: string }[]
}

const licensorNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['hq_admin'],
  },
  {
    label: 'Inbox',
    href: '/admin/cit',
    icon: Inbox,
    roles: ['hq_admin'],
    children: [
      { label: 'CIT Applications', href: '/admin/cit' },
      { label: 'Job Submissions', href: '/admin/job-submissions' },
      { label: 'Licensee Applications', href: '/admin/licensee-applications' },
      { label: 'Contact Messages', href: '/admin/contact' },
    ],
  },
  {
    label: 'Licensees',
    href: '/admin/licensees',
    icon: Building2,
    roles: ['hq_admin'],
    children: [
      { label: 'All Licensees', href: '/admin/licensees' },
      { label: 'Add Licensee', href: '/admin/licensees/new' },
      { label: 'Territories', href: '/admin/licensees/territories' },
      { label: 'New Territory', href: '/admin/licensees/territories/new' },
    ],
  },
  {
    label: 'Camp Manager',
    href: '/admin/camps',
    icon: Calendar,
    roles: ['hq_admin'],
    children: [
      { label: 'All Camps', href: '/admin/camps' },
      { label: 'Create Camp', href: '/admin/camps/new' },
      { label: 'Camp HQ', href: '/admin/camp-hq' },
      { label: 'Check-In Kiosk', href: '/camp-checkin' },
      { label: 'Sport Tags', href: '/admin/sport-tags' },
    ],
  },
  {
    label: 'Venues',
    href: '/admin/venues',
    icon: MapPin,
    roles: ['hq_admin'],
    children: [
      { label: 'All Venues', href: '/admin/venues' },
      { label: 'Add Venue', href: '/admin/venues/new' },
    ],
  },
  {
    label: 'Athletes',
    href: '/admin/athletes',
    icon: Heart,
    roles: ['hq_admin'],
  },
  {
    label: 'Export Data',
    href: '/admin/export',
    icon: Download,
    roles: ['hq_admin', 'licensee_owner'],
  },
  {
    label: 'Global Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    roles: ['hq_admin'],
  },
  {
    label: 'Promo Codes',
    href: '/admin/promo-codes',
    icon: Tag,
    roles: ['hq_admin'],
  },
  {
    label: 'Waivers',
    href: '/admin/waivers',
    icon: Shield,
    roles: ['hq_admin'],
  },
  {
    label: 'Revenue',
    href: '/admin/revenue',
    icon: DollarSign,
    roles: ['hq_admin'],
    children: [
      { label: 'Revenue Analytics', href: '/admin/revenue' },
      { label: 'Royalty Invoices', href: '/admin/revenue/royalties' },
    ],
  },
  {
    label: 'Scorecards',
    href: '/admin/scorecards',
    icon: Trophy,
    roles: ['hq_admin'],
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['hq_admin'],
  },
  {
    label: 'Curriculum',
    href: '/admin/curriculum',
    icon: FileText,
    roles: ['hq_admin'],
    children: [
      { label: 'Overview', href: '/admin/curriculum' },
      { label: 'Assign', href: '/admin/curriculum/assign' },
      { label: 'New Block', href: '/admin/curriculum/blocks/new' },
      { label: 'New Template', href: '/admin/curriculum/templates/new' },
    ],
  },
  {
    label: 'EmpowerU',
    href: '/admin/empoweru',
    icon: GraduationCap,
    roles: ['hq_admin'],
    children: [
      { label: 'Training Portal', href: '/admin/empoweru' },
      { label: 'Manage Modules', href: '/admin/lms' },
      { label: 'Progress Tracking', href: '/admin/lms/progress' },
    ],
  },
  {
    label: 'Locker Room',
    href: '/admin/shop',
    icon: ShoppingBag,
    roles: ['hq_admin'],
    children: [
      { label: 'Catalog', href: '/admin/shop' },
      { label: 'Add Product', href: '/admin/shop/products/new' },
      { label: 'Orders', href: '/admin/shop/orders' },
      { label: 'Settings', href: '/admin/shop/settings' },
    ],
  },
  {
    label: 'Automated Email',
    href: '/admin/email',
    icon: Mail,
    roles: ['hq_admin'],
    children: [
      { label: 'Email Logs', href: '/admin/email' },
      { label: 'Templates', href: '/admin/email/templates' },
    ],
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    roles: ['hq_admin'],
  },
  {
    label: 'Job Board',
    href: '/admin/jobs',
    icon: Briefcase,
    roles: ['hq_admin'],
    children: [
      { label: 'All Postings', href: '/admin/jobs' },
      { label: 'Create Job', href: '/admin/jobs/new' },
    ],
  },
]

const licenseeNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/portal',
    icon: LayoutDashboard,
    roles: ['licensee_owner', 'director', 'coach'],
  },
  {
    label: 'Camps',
    href: '/portal/camps',
    icon: Calendar,
    roles: ['licensee_owner', 'director', 'coach'],
    children: [
      { label: 'All Camps', href: '/portal/camps' },
      { label: 'Create Camp', href: '/portal/camps/new' },
    ],
  },
  {
    label: 'Venues',
    href: '/licensee/venues',
    icon: MapPin,
    roles: ['licensee_owner', 'director'],
    children: [
      { label: 'All Venues', href: '/licensee/venues' },
      { label: 'Add Venue', href: '/licensee/venues/new' },
    ],
  },
  {
    label: 'Registrations',
    href: '/portal/registrations',
    icon: Users,
    roles: ['licensee_owner', 'director', 'coach'],
  },
  {
    label: 'Athletes',
    href: '/licensee/athletes',
    icon: Heart,
    roles: ['licensee_owner', 'director'],
  },
  {
    label: 'Staff',
    href: '/portal/staff',
    icon: UserCircle,
    roles: ['licensee_owner', 'director'],
  },
  {
    label: 'EmpowerU',
    href: '/licensee/empoweru',
    icon: GraduationCap,
    roles: ['licensee_owner'],
  },
  {
    label: 'EmpowerU',
    href: '/director/empoweru',
    icon: GraduationCap,
    roles: ['director'],
  },
  {
    label: 'Scorecards',
    href: '/licensee/scorecards',
    icon: Trophy,
    roles: ['licensee_owner'],
  },
  {
    label: 'Scorecards',
    href: '/director/scorecards',
    icon: Trophy,
    roles: ['director'],
  },
  {
    label: 'Financials',
    href: '/portal/financials',
    icon: DollarSign,
    roles: ['licensee_owner', 'director'],
  },
  {
    label: 'Reports',
    href: '/portal/reports',
    icon: BarChart3,
    roles: ['licensee_owner', 'director'],
  },
  {
    label: 'Settings',
    href: '/portal/settings',
    icon: Settings,
    roles: ['licensee_owner'],
  },
]

export function AdminLayout({
  children,
  userRole,
  userName,
  tenantName,
  tenantLogo,
}: AdminLayoutProps) {
  const pathname = usePathname()
  const { topWithNavbar, heightWithNavbarStyle } = useBannerOffset()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)

  const navRef = useRef<HTMLElement>(null)

  const isLicensor = userRole === 'hq_admin'
  const navItems = isLicensor ? licensorNavItems : licenseeNavItems
  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole))

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Restore sidebar scroll position on mount
  useEffect(() => {
    const savedScrollTop = sessionStorage.getItem('adminSidebarScroll')
    if (savedScrollTop && navRef.current) {
      navRef.current.scrollTop = parseInt(savedScrollTop, 10)
    }
  }, [])

  // Save scroll position before navigation
  const saveScrollPosition = () => {
    if (navRef.current) {
      sessionStorage.setItem('adminSidebarScroll', navRef.current.scrollTop.toString())
    }
  }

  // Check if a nav item or any of its children matches the current path
  const isItemOrChildActive = (item: NavItem) => {
    if (isActive(item.href)) return true
    if (item.children) {
      return item.children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
    }
    return false
  }

  // On initial mount, only expand items that contain the current active page
  useEffect(() => {
    if (!initialized) {
      const activeItems = filteredNavItems
        .filter(item => item.children && item.children.some(child =>
          pathname === child.href || pathname.startsWith(child.href + '/')
        ))
        .map(item => item.label)

      setExpandedItems(activeItems)
      setInitialized(true)
    }
  }, [pathname, filteredNavItems, initialized])

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : [...prev, label]
    )
  }

  return (
    <div
      className="min-h-screen bg-dark-100"
      style={{ paddingTop: `${topWithNavbar}px` }}
    >
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - positioned below the public navbar */}
      <aside
        className={cn(
          'fixed left-0 z-40 w-72 bg-black border-r border-white/10',
          'transform transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          top: `${topWithNavbar}px`,
          height: `calc(100vh - ${topWithNavbar}px)`
        }}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
          <Link href={isLicensor ? '/admin' : '/portal'} className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image
                src={tenantLogo || '/images/logo.png'}
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-wider text-white">
                {isLicensor ? 'HQ Admin' : tenantName || 'Portal'}
              </span>
              <span className="text-xs text-neon uppercase tracking-wider">
                {isLicensor ? 'Licensor' : 'Licensee'}
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden text-white/50 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav ref={navRef} className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: `calc(100vh - ${topWithNavbar}px - 10rem)` }}>
          {filteredNavItems.map((item) => {
            const active = isItemOrChildActive(item)
            const expanded = expandedItems.includes(item.label)
            const hasChildren = item.children && item.children.length > 0

            return (
              <div key={item.label}>
                <Link
                  href={hasChildren ? '#' : item.href}
                  onClick={(e) => {
                    if (hasChildren) {
                      e.preventDefault()
                      toggleExpanded(item.label)
                    } else {
                      saveScrollPosition()
                    }
                  }}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-all',
                    active
                      ? 'bg-neon/10 text-neon border-l-2 border-neon'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </div>
                  {hasChildren && (
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        expanded && 'rotate-180'
                      )}
                    />
                  )}
                </Link>

                {/* Child items */}
                {hasChildren && expanded && (
                  <div className="ml-8 mt-1 space-y-1 border-l border-white/10">
                    {item.children!.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(child.href + '/')
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={saveScrollPosition}
                          className={cn(
                            'block px-4 py-2 text-xs uppercase tracking-wider transition-colors',
                            childActive
                              ? 'text-neon font-bold bg-neon/5 border-l-2 border-neon -ml-[1px]'
                              : 'text-white/40 hover:text-white/70'
                          )}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center">
              <span className="text-neon font-black">{userName[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{userName}</p>
              <p className="text-xs text-white/40 uppercase tracking-wider">
                {userRole.replace('_', ' ')}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72">
        {/* Top Bar - positioned below the public navbar */}
        <header
          className="sticky z-30 h-20 bg-black border-b border-white/10"
          style={{ top: `${topWithNavbar}px` }}
        >
          {/* Gradient accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon via-magenta to-purple" />

          <div className="h-full flex items-center justify-between px-6">
            {/* Mobile menu button */}
            <button
              className="lg:hidden text-white/70 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Search */}
            <div className="hidden md:block flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full h-10 bg-dark-100 border border-white/10 pl-12 pr-4 text-sm text-white placeholder:text-white/30 focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon/30"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* View As Control (hq_admin only) */}
              <ViewAsControl variant="compact" />

              {/* Notifications */}
              <button className="relative p-2 text-white/50 hover:text-white transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-magenta rounded-full" />
              </button>

              {/* Quick actions */}
              {isLicensor && (
                <Link
                  href="/admin/licensees/new"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-neon text-black text-xs font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  Add Licensee
                </Link>
              )}
              {!isLicensor && (
                <Link
                  href="/portal/camps/new"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-neon text-black text-xs font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  New Camp
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * PageHeader - Consistent page headers for admin pages
 */
export function PageHeader({
  title,
  description,
  children,
  breadcrumbs,
}: {
  title: string
  description?: string
  children?: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}) {
  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <nav className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-4">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-neon transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-white/60">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-white/50">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-4">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * ContentCard - Wrapper for content sections
 */
export function ContentCard({
  title,
  description,
  children,
  action,
  className,
  accent = 'neon',
}: {
  title?: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
  accent?: 'neon' | 'magenta' | 'purple'
}) {
  const accentColors = {
    neon: 'border-neon/30',
    magenta: 'border-magenta/30',
    purple: 'border-purple/30',
  }

  return (
    <div className={cn('bg-dark-100 border border-white/10', className)}>
      {(title || action) && (
        <div className={cn(
          'flex items-center justify-between px-6 py-4 border-b',
          accentColors[accent]
        )}>
          <div>
            {title && (
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-xs text-white/40">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
