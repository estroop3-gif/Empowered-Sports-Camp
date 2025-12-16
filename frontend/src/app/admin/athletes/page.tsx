'use client'

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Users,
  Search,
  User,
  Calendar,
  Phone,
  Mail,
  MoreVertical,
  Loader2,
  Eye,
  AlertTriangle,
  RefreshCw,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, Modal } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Athlete {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  gender: string | null
  grade: string | null
  school: string | null
  allergies: string | null
  medicalNotes: string | null
  createdAt: string
  parent: {
    id: string
    email: string
    name: string
    phone: string | null
  } | null
  recentRegistrations: {
    id: string
    status: string
    campName: string
    campDate: string | null
  }[]
  registrationCount: number
}

export default function AdminAthletesPage() {
  const { user } = useAuth()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Modal state
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadAthletes()
  }, [page, genderFilter])

  const loadAthletes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', '50')
      if (searchQuery) params.set('search', searchQuery)
      if (genderFilter !== 'all') params.set('gender', genderFilter)

      const response = await fetch(`/api/admin/athletes?${params.toString()}`)
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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
    setSelectedAthlete(athlete)
    setIsDetailsModalOpen(true)
  }

  const getDropdownItems = (athlete: Athlete) => [
    {
      label: 'View Details',
      icon: Eye,
      onClick: () => handleViewDetails(athlete),
    },
  ]

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Athletes"
        description="View all registered athletes across the platform"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Athletes' },
        ]}
      >
        <Button variant="outline-neon" size="sm" onClick={loadAthletes} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <Input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/40" />
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value)
              setPage(1)
            }}
            className="bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
          >
            <option value="all">All Genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
      </div>

      {/* Athletes Table */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neon" />
          </div>
        ) : athletes.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Athletes Found</p>
            <p className="text-sm text-white/40 mt-1">
              {searchQuery || genderFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Athletes will appear here once parents add them'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Athlete</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Age/Gender</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Parent</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Registrations</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Added</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((athlete) => {
                  const age = calculateAge(athlete.dateOfBirth)
                  const isMale = athlete.gender?.toLowerCase() === 'male'

                  return (
                    <tr key={athlete.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 flex items-center justify-center flex-shrink-0 border",
                            isMale ? "bg-amber-500/10 border-amber-500/30" : "bg-neon/10 border-neon/30"
                          )}>
                            <span className={cn("font-black", isMale ? "text-amber-500" : "text-neon")}>
                              {(athlete.firstName?.[0] || 'A').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {athlete.firstName} {athlete.lastName}
                            </p>
                            {athlete.grade && (
                              <p className="text-xs text-white/40">{athlete.grade}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {age !== null && (
                            <span className="text-white">{age} yrs</span>
                          )}
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
                      </td>
                      <td className="px-4 py-4">
                        {athlete.parent ? (
                          <div>
                            <p className="text-sm text-white">{athlete.parent.name}</p>
                            <p className="text-xs text-white/40">{athlete.parent.email}</p>
                          </div>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "px-2 py-1 text-xs font-bold",
                          athlete.registrationCount > 0
                            ? "bg-neon/10 text-neon"
                            : "bg-white/5 text-white/40"
                        )}>
                          {athlete.registrationCount} camp{athlete.registrationCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/40">
                        {formatDate(athlete.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu
                          trigger={<MoreVertical className="h-4 w-4" />}
                          items={getDropdownItems(athlete)}
                          align="right"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      {/* Stats / Pagination */}
      <div className="mt-6 flex items-center justify-between text-xs text-white/40">
        <p>Showing {athletes.length} of {total} athletes</p>
        {total > 50 && (
          <div className="flex gap-2">
            <Button
              variant="outline-white"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline-white"
              size="sm"
              disabled={athletes.length < 50}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Athlete Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Athlete Details"
        className="max-w-lg"
      >
        {selectedAthlete && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <div className={cn(
                "h-14 w-14 flex items-center justify-center border",
                selectedAthlete.gender?.toLowerCase() === 'male'
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-neon/10 border-neon/30"
              )}>
                <span className={cn(
                  "font-black text-xl",
                  selectedAthlete.gender?.toLowerCase() === 'male' ? "text-amber-500" : "text-neon"
                )}>
                  {(selectedAthlete.firstName?.[0] || 'A').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-bold text-white text-lg">
                  {selectedAthlete.firstName} {selectedAthlete.lastName}
                </p>
                {selectedAthlete.grade && (
                  <p className="text-sm text-white/50">{selectedAthlete.grade}</p>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Date of Birth
                </p>
                <p className="text-white">{formatDate(selectedAthlete.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Age</p>
                <p className="text-white">
                  {calculateAge(selectedAthlete.dateOfBirth) ?? '—'} years old
                </p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Gender</p>
                <p className={cn(
                  "text-white",
                  selectedAthlete.gender?.toLowerCase() === 'male' && "text-amber-400"
                )}>
                  {selectedAthlete.gender || '—'}
                </p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">School</p>
                <p className="text-white">{selectedAthlete.school || '—'}</p>
              </div>
            </div>

            {/* Parent Info */}
            {selectedAthlete.parent && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                  <User className="h-3 w-3 inline mr-1" />
                  Parent/Guardian
                </p>
                <div className="bg-white/5 p-3 space-y-1">
                  <p className="text-white font-semibold">{selectedAthlete.parent.name}</p>
                  <p className="text-sm text-white/60 flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {selectedAthlete.parent.email}
                  </p>
                  {selectedAthlete.parent.phone && (
                    <p className="text-sm text-white/60 flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {selectedAthlete.parent.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Medical Info */}
            {(selectedAthlete.allergies || selectedAthlete.medicalNotes) && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Medical Info</p>
                {selectedAthlete.allergies && (
                  <div className="mb-2">
                    <p className="text-xs text-white/50">Allergies:</p>
                    <p className="text-sm text-white">{selectedAthlete.allergies}</p>
                  </div>
                )}
                {selectedAthlete.medicalNotes && (
                  <div>
                    <p className="text-xs text-white/50">Notes:</p>
                    <p className="text-sm text-white whitespace-pre-wrap">{selectedAthlete.medicalNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Registrations */}
            {selectedAthlete.recentRegistrations.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Recent Registrations</p>
                <div className="space-y-2">
                  {selectedAthlete.recentRegistrations.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between bg-white/5 p-2">
                      <span className="text-sm text-white">{reg.campName}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 font-bold uppercase",
                        reg.status === 'confirmed' ? "bg-neon/10 text-neon" :
                        reg.status === 'pending' ? "bg-amber-500/10 text-amber-400" :
                        "bg-white/10 text-white/60"
                      )}>
                        {reg.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline-white"
              className="w-full mt-4"
              onClick={() => setIsDetailsModalOpen(false)}
            >
              Close
            </Button>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
