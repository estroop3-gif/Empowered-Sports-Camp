'use client'

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Loader2,
  ChevronDown,
  GraduationCap,
  ShieldCheck,
  ShieldX,
  MoreHorizontal,
} from 'lucide-react'
// Types (no longer imported from service)
interface UserProgressSummary {
  profile_id: string
  profile: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  role: string
  modules_completed: number
  modules_total: number
  last_activity: string | null
}

/**
 * Admin LMS Progress Page
 *
 * View training progress across all users.
 * Filter by role, completion status, etc.
 */

type UserProgress = UserProgressSummary

export default function AdminLmsProgressPage() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<UserProgress[]>([])
  const [roleFilter, setRoleFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all')
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

  useEffect(() => {
    loadProgress()
  }, [roleFilter])

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClick() {
      setActionMenuOpen(null)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  async function loadProgress() {
    setLoading(true)

    try {
      const params = new URLSearchParams({ action: 'progressSummary' })
      if (roleFilter) params.append('roleFilter', roleFilter)

      const res = await fetch(`/api/lms?${params}`)
      const { data, error } = await res.json()

      if (error) {
        console.error('Failed to load progress:', error)
        setLoading(false)
        return
      }

      setProgress(data || [])
    } catch (err) {
      console.error('Failed to load progress:', err)
    }
    setLoading(false)
  }

  async function setTrainingStatus(profileId: string, trainingType: string, completed: boolean) {
    setUpdatingUser(profileId)
    try {
      const res = await fetch('/api/lms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setTrainingStatus',
          profileId,
          trainingType,
          completed,
        }),
      })

      if (res.ok) {
        // Reload progress to reflect changes
        await loadProgress()
      } else {
        console.error('Failed to update training status')
      }
    } catch (err) {
      console.error('Failed to update training status:', err)
    }
    setUpdatingUser(null)
    setActionMenuOpen(null)
  }

  // Filter progress
  const filteredProgress = progress.filter((p) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const name = `${p.profile.first_name || ''} ${p.profile.last_name || ''}`.toLowerCase()
      if (!name.includes(q) && !p.profile.email.toLowerCase().includes(q)) {
        return false
      }
    }

    // Status filter
    if (statusFilter === 'completed' && p.modules_completed < p.modules_total) return false
    if (statusFilter === 'in_progress' && (p.modules_completed === 0 || p.modules_completed >= p.modules_total)) return false
    if (statusFilter === 'not_started' && p.modules_completed > 0) return false

    return true
  })

  // Stats
  const stats = {
    total: progress.length,
    completed: progress.filter(p => p.modules_completed >= p.modules_total && p.modules_total > 0).length,
    inProgress: progress.filter(p => p.modules_completed > 0 && p.modules_completed < p.modules_total).length,
    notStarted: progress.filter(p => p.modules_completed === 0).length,
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <PageHeader
        title="Training Progress"
        description="Track LMS completion across all staff members"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-white/60" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.total}</p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Total Users</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-neon/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-neon" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.completed}</p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Completed</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.inProgress}</p>
              <p className="text-xs text-white/50 uppercase tracking-wider">In Progress</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-magenta/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-magenta" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.notStarted}</p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Not Started</p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/40 focus:border-neon focus:outline-none"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[160px]"
          >
            <option value="">All Roles</option>
            <option value="director">Director</option>
            <option value="cit_volunteer">CIT / Volunteer</option>
            <option value="coach">Coach</option>
            <option value="licensee_owner">Licensee Owner</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none min-w-[160px]"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Not Started</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Progress Table */}
      <ContentCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">User</th>
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Role</th>
                <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Progress</th>
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Last Activity</th>
                <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Status</th>
                <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProgress.map((user) => {
                const progressPercent = user.modules_total > 0
                  ? Math.round((user.modules_completed / user.modules_total) * 100)
                  : 0

                return (
                  <tr key={user.profile_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-bold text-white">
                          {user.profile.first_name || user.profile.last_name
                            ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
                            : 'Unknown'}
                        </div>
                        <div className="text-sm text-white/40">{user.profile.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 text-xs font-medium bg-white/10 text-white/60 capitalize">
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/10 overflow-hidden max-w-[100px]">
                          <div
                            className={`h-full transition-all ${
                              progressPercent === 100 ? 'bg-neon' : 'bg-orange-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-sm text-white/60">
                          {user.modules_completed}/{user.modules_total}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/60">{formatDate(user.last_activity)}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {user.modules_completed >= user.modules_total && user.modules_total > 0 ? (
                        <span className="px-2 py-1 text-xs font-bold uppercase bg-neon/10 text-neon">
                          Complete
                        </span>
                      ) : user.modules_completed > 0 ? (
                        <span className="px-2 py-1 text-xs font-bold uppercase bg-orange-500/10 text-orange-400">
                          In Progress
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-bold uppercase bg-white/10 text-white/40">
                          Not Started
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="relative inline-block">
                        {updatingUser === user.profile_id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-neon mx-auto" />
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActionMenuOpen(actionMenuOpen === user.profile_id ? null : user.profile_id)
                              }}
                              className="p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {actionMenuOpen === user.profile_id && (
                              <div
                                className="absolute right-0 top-full mt-1 w-56 bg-black border border-white/20 shadow-xl z-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3 py-2 border-b border-white/10">
                                  <p className="text-xs font-bold uppercase tracking-wider text-white/40">
                                    Grant Training Credentials
                                  </p>
                                </div>
                                <button
                                  onClick={() => setTrainingStatus(user.profile_id, 'all', true)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-white hover:bg-neon/10 hover:text-neon transition-colors"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Mark All Training Complete
                                </button>
                                <button
                                  onClick={() => {
                                    const type = user.role === 'director' ? 'director' : user.role === 'cit_volunteer' ? 'volunteer' : 'core'
                                    setTrainingStatus(user.profile_id, type, true)
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-white hover:bg-neon/10 hover:text-neon transition-colors"
                                >
                                  <GraduationCap className="h-4 w-4" />
                                  Mark Role Training Complete
                                </button>
                                <div className="border-t border-white/10 mt-1 pt-1">
                                  <div className="px-3 py-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-white/40">
                                      Revoke Credentials
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setTrainingStatus(user.profile_id, 'all', false)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-white hover:bg-magenta/10 hover:text-magenta transition-colors"
                                  >
                                    <ShieldX className="h-4 w-4" />
                                    Revoke All Credentials
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredProgress.length === 0 && (
          <div className="py-12 text-center">
            <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Users Found</h3>
            <p className="text-white/50">
              {searchQuery || roleFilter || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No users with training requirements yet'}
            </p>
          </div>
        )}
      </ContentCard>
    </AdminLayout>
  )
}
