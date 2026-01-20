'use client'

import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { StatCard, StatCardGrid } from '@/components/ui/stat-card'
import { DataTable, TableBadge } from '@/components/ui/data-table'
import {
  Users,
  DollarSign,
  Calendar,
  Crown,
  MapPin,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

/**
 * Licensee Portal Dashboard
 *
 * DESIGN NOTES:
 * - Scoped to single territory/tenant
 * - Operational focus: upcoming camps, recent registrations
 * - Key metrics relevant to day-to-day operations
 * - Same brand aesthetic as licensor but with "Licensee" context
 *
 * Feels like the same building (brand) but different room (scope)
 */

// Mock data - would come from API filtered by tenant_id
const tenantStats = {
  activeRegistrations: 456,
  totalRevenue: 136800, // cents
  activeAthletes: 312,
  upcomingCamps: 8,
  registrationChange: 12.5,
  revenueChange: 18.2,
}

const upcomingCamps = [
  {
    id: '1',
    name: 'Summer Week 1 - Lincoln Park',
    date: 'Jun 9-13, 2025',
    location: 'Lincoln Park',
    registered: 42,
    capacity: 50,
    status: 'open',
  },
  {
    id: '2',
    name: 'Summer Week 2 - Evanston',
    date: 'Jun 16-20, 2025',
    location: 'Evanston Rec Center',
    registered: 38,
    capacity: 40,
    status: 'almost_full',
  },
  {
    id: '3',
    name: 'Basketball Intensive',
    date: 'Jul 14-18, 2025',
    location: 'Lincoln Park',
    registered: 30,
    capacity: 30,
    status: 'full',
  },
  {
    id: '4',
    name: 'Summer Week 3 - Skokie',
    date: 'Jun 23-27, 2025',
    location: 'Skokie Sports Complex',
    registered: 22,
    capacity: 45,
    status: 'open',
  },
]

const recentRegistrations = [
  {
    id: '1',
    athlete: 'Emma Johnson',
    camp: 'Summer Week 1',
    parent: 'Sarah Johnson',
    date: '2 hours ago',
    amount: 29900,
    status: 'confirmed',
  },
  {
    id: '2',
    athlete: 'Olivia Martinez',
    camp: 'Summer Week 2',
    parent: 'Maria Martinez',
    date: '5 hours ago',
    amount: 29900,
    status: 'confirmed',
  },
  {
    id: '3',
    athlete: 'Ava Williams',
    camp: 'Basketball Intensive',
    parent: 'Jennifer Williams',
    date: '1 day ago',
    amount: 34900,
    status: 'pending',
  },
  {
    id: '4',
    athlete: 'Sophia Brown',
    camp: 'Summer Week 1',
    parent: 'Michelle Brown',
    date: '1 day ago',
    amount: 29900,
    status: 'confirmed',
  },
]

const alerts = [
  {
    type: 'warning',
    message: 'Summer Week 2 - Evanston is 95% full',
    action: 'Manage Waitlist',
    href: '/portal/camps/2/waitlist',
  },
  {
    type: 'info',
    message: '3 pending payments require attention',
    action: 'View Payments',
    href: '/portal/financials/pending',
  },
]

export default function LicenseePortal() {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const getCapacityColor = (registered: number, capacity: number) => {
    const percent = (registered / capacity) * 100
    if (percent >= 100) return 'text-red-400'
    if (percent >= 90) return 'text-magenta'
    if (percent >= 70) return 'text-yellow-400'
    return 'text-neon'
  }

  return (
    <AdminLayout
      userRole="licensee_owner"
      userName="Mike Thompson"
      tenantName="Chicago North"
    >
      {/* Note: In production, userRole and userName should come from useAuth() hook */}
      <PageHeader
        title="Dashboard"
        description="Chicago North territory overview"
      >
        <Link
          href="/portal/camps/new"
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Zap className="h-5 w-5" />
          Create Camp
        </Link>
      </PageHeader>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-4 border ${
                alert.type === 'warning'
                  ? 'bg-magenta/10 border-magenta/30'
                  : 'bg-purple/10 border-purple/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${
                  alert.type === 'warning' ? 'text-magenta' : 'text-purple'
                }`} />
                <span className="text-sm text-white/80">{alert.message}</span>
              </div>
              <Link
                href={alert.href}
                className={`text-xs font-bold uppercase tracking-wider ${
                  alert.type === 'warning' ? 'text-magenta' : 'text-purple'
                } hover:opacity-80 transition-opacity`}
              >
                {alert.action}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <StatCardGrid columns={4} className="mb-8">
        <StatCard
          label="Registrations"
          value={tenantStats.activeRegistrations}
          icon={Users}
          accent="neon"
          change={{ value: tenantStats.registrationChange, type: 'increase' }}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(tenantStats.totalRevenue)}
          icon={DollarSign}
          accent="magenta"
          change={{ value: tenantStats.revenueChange, type: 'increase' }}
        />
        <StatCard
          label="Active Athletes"
          value={tenantStats.activeAthletes}
          icon={Crown}
          accent="purple"
        />
        <StatCard
          label="Upcoming Camps"
          value={tenantStats.upcomingCamps}
          icon={Calendar}
          accent="neon"
        />
      </StatCardGrid>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Upcoming Camps */}
        <div className="lg:col-span-2">
          <ContentCard
            title="Upcoming Camps"
            description="Next 30 days"
            action={
              <Link
                href="/portal/camps"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            <div className="space-y-4">
              {upcomingCamps.map((camp) => (
                <Link
                  key={camp.id}
                  href={`/portal/camps/${camp.id}`}
                  className="block p-4 bg-black/30 border border-white/10 hover:border-neon/30 hover:bg-neon/5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white">{camp.name}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-white/50">
                          <Calendar className="h-3 w-3" />
                          {camp.date}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-white/50">
                          <MapPin className="h-3 w-3" />
                          {camp.location}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-black ${getCapacityColor(camp.registered, camp.capacity)}`}>
                        {camp.registered}/{camp.capacity}
                      </div>
                      <TableBadge
                        variant={
                          camp.status === 'full' ? 'danger' :
                          camp.status === 'almost_full' ? 'warning' : 'success'
                        }
                      >
                        {camp.status === 'almost_full' ? 'Almost Full' :
                         camp.status === 'full' ? 'Full' : 'Open'}
                      </TableBadge>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-4 h-2 bg-black border border-white/10">
                    <div
                      className={`h-full transition-all ${
                        camp.status === 'full' ? 'bg-red-500' :
                        camp.status === 'almost_full' ? 'bg-magenta' : 'bg-neon'
                      }`}
                      style={{ width: `${Math.min(100, (camp.registered / camp.capacity) * 100)}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </ContentCard>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          {/* Recent Registrations */}
          <ContentCard title="Recent Registrations" accent="magenta">
            <div className="space-y-4">
              {recentRegistrations.slice(0, 4).map((reg) => (
                <div key={reg.id} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                  <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-neon font-black text-sm">{reg.athlete[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm truncate">{reg.athlete}</span>
                      <span className="text-neon font-bold text-sm">{formatCurrency(reg.amount)}</span>
                    </div>
                    <div className="text-xs text-white/40 mt-1">{reg.camp}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-white/30" />
                      <span className="text-xs text-white/30">{reg.date}</span>
                      {reg.status === 'confirmed' ? (
                        <CheckCircle className="h-3 w-3 text-neon" />
                      ) : (
                        <Clock className="h-3 w-3 text-yellow-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/portal/registrations"
              className="block mt-4 text-center text-xs font-bold uppercase tracking-wider text-neon hover:text-neon/80 transition-colors"
            >
              View All Registrations
            </Link>
          </ContentCard>

          {/* Today's Quick Stats */}
          <ContentCard title="Today" accent="purple">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">New Registrations</span>
                <span className="font-bold text-neon">+12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Revenue Today</span>
                <span className="font-bold text-white">$3,588</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Pending Payments</span>
                <span className="font-bold text-magenta">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Waitlist Requests</span>
                <span className="font-bold text-purple">7</span>
              </div>
            </div>
          </ContentCard>

          {/* Quick Links */}
          <ContentCard title="Quick Actions" accent="neon">
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/portal/camps/new"
                className="p-3 bg-black/50 border border-white/10 hover:border-neon/30 text-center transition-all"
              >
                <Calendar className="h-5 w-5 text-neon mx-auto mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">New Camp</span>
              </Link>
              <Link
                href="/portal/athletes"
                className="p-3 bg-black/50 border border-white/10 hover:border-magenta/30 text-center transition-all"
              >
                <Crown className="h-5 w-5 text-magenta mx-auto mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">Athletes</span>
              </Link>
              <Link
                href="/portal/staff"
                className="p-3 bg-black/50 border border-white/10 hover:border-purple/30 text-center transition-all"
              >
                <Users className="h-5 w-5 text-purple mx-auto mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">Staff</span>
              </Link>
              <Link
                href="/portal/reports"
                className="p-3 bg-black/50 border border-white/10 hover:border-neon/30 text-center transition-all"
              >
                <DollarSign className="h-5 w-5 text-neon mx-auto mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">Reports</span>
              </Link>
            </div>
          </ContentCard>
        </div>
      </div>
    </AdminLayout>
  )
}
