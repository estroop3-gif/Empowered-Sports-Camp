'use client'

/**
 * Licensee Athletes Page
 *
 * View athletes in the licensee's territory based on camp registrations.
 * Licensees can view, filter, and manage athletes in their assigned camps.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Users,
  Search,
  Loader2,
  Filter,
  RefreshCw,
  ShieldAlert,
  Archive,
  CheckCircle,
  ChevronRight,
  AlertTriangle,
  XCircle,
  Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Athlete {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  grade: string | null
  school: string | null
  is_active: boolean
  risk_flag: string | null
  t_shirt_size: string | null
  primary_sport_interest: string | null
  parent: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
  } | null
  registration_count: number
}

interface Stats {
  total: number
  active: number
  archived: number
  withRiskFlag: number
  registeredThisMonth: number
}

export default function LicenseeAthletesPage() {
  const router = useRouter()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadAthletes()
  }, [page, genderFilter, gradeFilter, activeFilter, riskFilter])

  const loadInitialData = async () => {
    try {
      const [gradesRes, statsRes] = await Promise.all([
        fetch('/api/licensee/athletes?action=grades'),
        fetch('/api/licensee/athletes?action=stats'),
      ])

      if (gradesRes.ok) {
        const gradesData = await gradesRes.json()
        setGrades(gradesData.grades || [])
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (err) {
      console.error('Failed to load initial data:', err)
    }
  }

  const loadAthletes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', '50')
      if (searchQuery) params.set('search', searchQuery)
      if (genderFilter !== 'all') params.set('gender', genderFilter)
      if (gradeFilter !== 'all') params.set('grade', gradeFilter)
      if (activeFilter !== 'all') params.set('isActive', activeFilter)
      if (riskFilter !== 'all') params.set('riskFlag', riskFilter)

      const response = await fetch(`/api/licensee/athletes?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setAthletes(data.athletes || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to load athletes:', err)
    }
    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadAthletes()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setGenderFilter('all')
    setGradeFilter('all')
    setActiveFilter('all')
    setRiskFilter('all')
    setPage(1)
  }

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birth = new Date(dateOfBirth)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const handleViewDetails = (athlete: Athlete) => {
    router.push(`/licensee/athletes/${athlete.id}`)
  }

  const getRiskBadge = (riskFlag: string | null) => {
    switch (riskFlag) {
      case 'monitor':
        return (
          <span className="px-2 py-0.5 text-xs font-bold uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Monitor
          </span>
        )
      case 'restricted':
        return (
          <span className="px-2 py-0.5 text-xs font-bold uppercase bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Restricted
          </span>
        )
      default:
        return null
    }
  }

  const hasActiveFilters = genderFilter !== 'all' || gradeFilter !== 'all' ||
    activeFilter !== 'all' || riskFilter !== 'all' || searchQuery

  return (
    <LmsGate featureName="athletes management">
      <div>
        <PortalPageHeader
          title="Athletes"
          description={`${total} athletes in your territory`}
          actions={
            <Button
              variant="dark"
              size="sm"
              onClick={loadAthletes}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          }
        />

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <PortalCard accent="neon">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-neon" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-white/50 uppercase">Total</div>
                </div>
              </div>
            </PortalCard>

            <PortalCard accent="purple">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-purple" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.active}</div>
                  <div className="text-sm text-white/50 uppercase">Active</div>
                </div>
              </div>
            </PortalCard>

            <PortalCard accent="orange">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-orange-400/20 flex items-center justify-center">
                  <ShieldAlert className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.withRiskFlag}</div>
                  <div className="text-sm text-white/50 uppercase">Risk Flags</div>
                </div>
              </div>
            </PortalCard>

            <PortalCard accent="magenta">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-magenta" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats.registeredThisMonth}</div>
                  <div className="text-sm text-white/50 uppercase">This Month</div>
                </div>
              </div>
            </PortalCard>
          </div>
        )}

        {/* Filters */}
        <PortalCard className="mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                <Input
                  type="text"
                  placeholder="Search by name, parent, or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 bg-white/5 border-white/20"
                />
              </form>
              {hasActiveFilters && (
                <Button
                  variant="dark"
                  size="sm"
                  onClick={clearFilters}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-white/40" />

              <select
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value)
                  setPage(1)
                }}
                className="bg-white/5 border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
              >
                <option value="all">All Grades</option>
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value)
                  setPage(1)
                }}
                className="bg-white/5 border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
              >
                <option value="all">All Genders</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>

              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value)
                  setPage(1)
                }}
                className="bg-white/5 border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="true">Active Only</option>
                <option value="false">Archived Only</option>
              </select>

              <select
                value={riskFilter}
                onChange={(e) => {
                  setRiskFilter(e.target.value)
                  setPage(1)
                }}
                className="bg-white/5 border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
              >
                <option value="all">All Risk Levels</option>
                <option value="none">No Risk Flag</option>
                <option value="monitor">Monitor</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>
        </PortalCard>

        {/* Athletes List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 text-neon animate-spin" />
          </div>
        ) : athletes.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                {hasActiveFilters ? 'No Athletes Match Filters' : 'No Athletes Yet'}
              </h2>
              <p className="text-white/50">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'Athletes will appear here when parents register them for camps in your territory'}
              </p>
            </div>
          </PortalCard>
        ) : (
          <PortalCard title="Athletes Roster">
            <div className="space-y-2">
              {athletes.map((athlete) => {
                const age = calculateAge(athlete.date_of_birth)
                const isMale = athlete.gender?.toLowerCase() === 'male'

                return (
                  <div
                    key={athlete.id}
                    onClick={() => handleViewDetails(athlete)}
                    className={cn(
                      "p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer",
                      !athlete.is_active && "opacity-60"
                    )}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 flex items-center justify-center flex-shrink-0 border",
                          isMale ? "bg-amber-500/10 border-amber-500/30" : "bg-neon/10 border-neon/30"
                        )}>
                          <span className={cn("font-black text-lg", isMale ? "text-amber-500" : "text-neon")}>
                            {(athlete.first_name?.[0] || 'A').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">
                              {athlete.first_name} {athlete.last_name}
                            </span>
                            {!athlete.is_active && (
                              <span className="px-2 py-0.5 text-xs font-bold uppercase bg-white/10 border border-white/20 text-white/60">
                                Archived
                              </span>
                            )}
                            {getRiskBadge(athlete.risk_flag)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
                            {age !== null && <span>{age} years old</span>}
                            {athlete.grade && <span>{athlete.grade}</span>}
                            {athlete.gender && (
                              <span className={cn(
                                "px-2 py-0.5 text-xs font-bold uppercase border",
                                isMale
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  : "bg-pink-500/10 border-pink-500/30 text-pink-400"
                              )}>
                                {athlete.gender}
                              </span>
                            )}
                            {isMale && (
                              <span title="Male athlete - cannot register for camps">
                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {athlete.parent && (
                          <div className="text-right hidden md:block">
                            <div className="text-sm text-white">
                              {athlete.parent.first_name} {athlete.parent.last_name}
                            </div>
                            <div className="text-xs text-white/40">{athlete.parent.email}</div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-lg font-bold text-neon">{athlete.registration_count}</div>
                          <div className="text-xs text-white/40">Camps</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-white/30" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {total > 50 && (
              <div className="mt-6 flex items-center justify-between text-sm">
                <span className="text-white/40">
                  Showing {athletes.length} of {total} athletes
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="dark"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-white/60">
                    Page {page} of {Math.ceil(total / 50)}
                  </span>
                  <Button
                    variant="dark"
                    size="sm"
                    disabled={athletes.length < 50}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </PortalCard>
        )}
      </div>
    </LmsGate>
  )
}
