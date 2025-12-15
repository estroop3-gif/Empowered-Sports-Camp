'use client'

/**
 * Licensee Staff Management Page
 *
 * Manage directors, coaches, and CITs in the territory.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Users,
  UserPlus,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  Shield,
  Star,
  Trophy,
} from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: 'active' | 'inactive' | 'pending'
  sessions_assigned: number
  sessions_completed: number
  avg_csat: number | null
  hire_date: string | null
}

export default function LicenseeStaffPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadStaff()
  }, [])

  async function loadStaff() {
    try {
      setLoading(true)
      const res = await fetch('/api/licensee/staff')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load staff')
      }

      setStaff(json.data || [])
      setError(null)
    } catch (err) {
      // Mock data for now
      setStaff([])
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const filteredStaff = staff.filter((s) => {
    if (filter === 'all') return true
    return s.role.toLowerCase() === filter
  })

  const roleCounts = {
    all: staff.length,
    director: staff.filter((s) => s.role.toLowerCase() === 'director').length,
    coach: staff.filter((s) => s.role.toLowerCase() === 'coach').length,
    cit_volunteer: staff.filter((s) => s.role.toLowerCase() === 'cit_volunteer').length,
  }

  return (
    <LmsGate featureName="staff management">
      <div>
        <PortalPageHeader
          title="Staff Management"
          description={`${staff.length} staff members in your territory`}
          actions={
            <Link
              href="/portal/staff/invite"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider text-sm hover:bg-neon/90 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Invite Staff
            </Link>
          }
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <PortalCard accent="magenta">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-magenta" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{roleCounts.director}</div>
                <div className="text-sm text-white/50 uppercase">Directors</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard accent="purple">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{roleCounts.coach}</div>
                <div className="text-sm text-white/50 uppercase">Coaches</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard accent="neon">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <Star className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{roleCounts.cit_volunteer}</div>
                <div className="text-sm text-white/50 uppercase">CITs / Volunteers</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All Staff', count: roleCounts.all },
            { value: 'director', label: 'Directors', count: roleCounts.director },
            { value: 'coach', label: 'Coaches', count: roleCounts.coach },
            { value: 'cit_volunteer', label: 'CITs', count: roleCounts.cit_volunteer },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                filter === opt.value
                  ? 'bg-neon text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {opt.label} ({opt.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 text-neon animate-spin" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                {filter === 'all' ? 'No Staff Members Yet' : `No ${filter}s found`}
              </h2>
              <p className="text-white/50 mb-6">
                {filter === 'all'
                  ? 'Invite directors, coaches, and volunteers to join your team.'
                  : `You don't have any ${filter}s in your territory.`}
              </p>
              <Link
                href="/portal/staff/invite"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Invite Staff
              </Link>
            </div>
          </PortalCard>
        ) : (
          <PortalCard title="Staff Roster">
            <div className="space-y-4">
              {filteredStaff.map((member) => (
                <StaffRow key={member.id} staff={member} />
              ))}
            </div>
          </PortalCard>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            href="/licensee/incentives"
            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <Trophy className="h-6 w-6 text-neon" />
            <div>
              <div className="font-bold text-white">View Incentive Scorecards</div>
              <div className="text-sm text-white/50">Track staff compensation and performance</div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30 ml-auto" />
          </Link>

          <Link
            href="/licensee/cit-applications"
            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <UserPlus className="h-6 w-6 text-purple" />
            <div>
              <div className="font-bold text-white">CIT Applications</div>
              <div className="text-sm text-white/50">Review and manage CIT applicants</div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30 ml-auto" />
          </Link>
        </div>
      </div>
    </LmsGate>
  )
}

function StaffRow({ staff }: { staff: StaffMember }) {
  const roleConfig: Record<string, { label: string; color: string }> = {
    director: { label: 'Director', color: 'bg-magenta/20 text-magenta' },
    coach: { label: 'Coach', color: 'bg-purple/20 text-purple' },
    cit_volunteer: { label: 'CIT', color: 'bg-neon/20 text-neon' },
  }

  const config = roleConfig[staff.role.toLowerCase()] || roleConfig.coach

  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'text-neon' },
    inactive: { label: 'Inactive', color: 'text-white/40' },
    pending: { label: 'Pending', color: 'text-yellow-400' },
  }

  const statusInfo = statusConfig[staff.status] || statusConfig.active

  return (
    <div className="p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold text-white">{staff.name}</span>
            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase', config.color)}>
              {config.label}
            </span>
            <span className={cn('text-xs', statusInfo.color)}>
              {statusInfo.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {staff.email}
            </span>
            {staff.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {staff.phone}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{staff.sessions_assigned}</div>
            <div className="text-xs text-white/40">Assigned</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-neon">{staff.sessions_completed}</div>
            <div className="text-xs text-white/40">Completed</div>
          </div>

          {staff.avg_csat !== null && (
            <div className="text-center">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-lg font-bold text-white">{staff.avg_csat.toFixed(1)}</span>
              </div>
              <div className="text-xs text-white/40">CSAT</div>
            </div>
          )}

          <ChevronRight className="h-5 w-5 text-white/30" />
        </div>
      </div>
    </div>
  )
}
