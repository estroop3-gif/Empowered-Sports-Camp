'use client'

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  Users,
  Search,
  Plus,
  Shield,
  Building2,
  Crown,
  UserCheck,
  User,
  MoreVertical,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Type definition (no longer imported from service)
interface UserWithRole {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string
  role: string
  tenant_name: string | null
}

/**
 * Users Management Page
 *
 * HQ Admin can view and manage all users across the system
 */

const ROLE_ICONS: Record<string, React.ElementType> = {
  hq_admin: Shield,
  licensee_owner: Building2,
  director: Crown,
  coach: UserCheck,
  parent: User,
}

const ROLE_COLORS: Record<string, string> = {
  hq_admin: 'text-neon bg-neon/10 border-neon/30',
  licensee_owner: 'text-purple bg-purple/10 border-purple/30',
  director: 'text-magenta bg-magenta/10 border-magenta/30',
  coach: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  parent: 'text-white/60 bg-white/5 border-white/20',
}

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/users?action=withRoles&limit=100')
      const { data, error } = await res.json()

      if (error) {
        console.error('Error loading users:', error)
        setLoading(false)
        return
      }

      if (data) {
        setUsers(data)
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }

    setLoading(false)
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = searchQuery === '' ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === 'all' || u.role === roleFilter

    return matchesSearch && matchesRole
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <AdminLayout
      userRole="hq_admin"
      userName={userName}
    >
      <PageHeader
        title="Users"
        description="Manage all users across the system"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users' },
        ]}
      >
        <Button variant="neon">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 uppercase tracking-wider">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="hq_admin">HQ Admin</option>
            <option value="licensee_owner">Licensee Owner</option>
            <option value="director">Director</option>
            <option value="coach">Coach</option>
            <option value="parent">Parent</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <ContentCard>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neon" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-lg font-bold text-white/60">No Users Found</p>
            <p className="text-sm text-white/40 mt-1">
              {searchQuery || roleFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Users will appear here once they sign up'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">User</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const RoleIcon = ROLE_ICONS[u.role || 'parent'] || User
                  const roleColor = ROLE_COLORS[u.role || 'parent'] || ROLE_COLORS.parent
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unnamed User'

                  return (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-neon/10 border border-neon/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-neon font-black">
                              {(u.first_name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{fullName}</p>
                            <p className="text-xs text-white/40">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
                          roleColor
                        )}>
                          <RoleIcon className="h-3 w-3" />
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/60">
                        {u.tenant_name || '—'}
                      </td>
                      <td className="px-4 py-4 text-sm text-white/40">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="p-2 text-white/40 hover:text-white transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      {/* Stats */}
      <div className="mt-6 flex items-center justify-between text-xs text-white/40">
        <p>Showing {filteredUsers.length} of {users.length} users</p>
        <p>Last updated: just now</p>
      </div>
    </AdminLayout>
  )
}
