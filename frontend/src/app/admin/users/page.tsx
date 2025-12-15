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
  Edit,
  UserCog,
  Trash2,
  Eye,
  X,
  Check,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, Modal } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Type definitions
interface UserWithRole {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string
  role: string
  role_id: string | null
  tenant_id: string | null
  tenant_name: string | null
  is_active: boolean
}

interface UserDetails {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  city: string | null
  state: string | null
  avatarUrl: string | null
  createdAt: string
  roles: {
    id: string
    role: string
    tenantId: string | null
    tenantName: string | null
    isActive: boolean
    createdAt: string
  }[]
  athleteCount: number
  registrationCount: number
}

interface TenantOption {
  id: string
  name: string
  slug: string
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
  cit_volunteer: UserCheck,
}

const ROLE_COLORS: Record<string, string> = {
  hq_admin: 'text-neon bg-neon/10 border-neon/30',
  licensee_owner: 'text-purple bg-purple/10 border-purple/30',
  director: 'text-magenta bg-magenta/10 border-magenta/30',
  coach: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  parent: 'text-white/60 bg-white/5 border-white/20',
  cit_volunteer: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
}

const ROLE_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'coach', label: 'Coach' },
  { value: 'director', label: 'Director' },
  { value: 'licensee_owner', label: 'Licensee Owner' },
  { value: 'hq_admin', label: 'HQ Admin' },
  { value: 'cit_volunteer', label: 'CIT Volunteer' },
]

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)

  // Form states
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedTenant, setSelectedTenant] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Add user form states
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserFirstName, setNewUserFirstName] = useState('')
  const [newUserLastName, setNewUserLastName] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [newUserRole, setNewUserRole] = useState('parent')
  const [newUserTenant, setNewUserTenant] = useState('')

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'

  useEffect(() => {
    loadUsers()
    loadTenants()
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

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/users?action=tenants')
      const { data } = await res.json()
      if (data) {
        setTenants(data)
      }
    } catch (err) {
      console.error('Error loading tenants:', err)
    }
  }

  const loadUserDetails = async (userId: string) => {
    try {
      const res = await fetch(`/api/users?action=details&userId=${userId}`)
      const { data, error } = await res.json()
      if (error) {
        console.error('Error loading user details:', error)
        return
      }
      setUserDetails(data)
    } catch (err) {
      console.error('Error loading user details:', err)
    }
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

  // Action handlers
  const handleEditRole = (user: UserWithRole) => {
    setSelectedUser(user)
    setSelectedRole(user.role)
    setSelectedTenant(user.tenant_id || '')
    setActionError(null)
    setIsRoleModalOpen(true)
  }

  const handleAssignTenant = (user: UserWithRole) => {
    setSelectedUser(user)
    setSelectedTenant(user.tenant_id || '')
    setActionError(null)
    setIsTenantModalOpen(true)
  }

  const handleViewDetails = async (user: UserWithRole) => {
    setSelectedUser(user)
    setUserDetails(null)
    setIsDetailsModalOpen(true)
    await loadUserDetails(user.id)
  }

  const handleDeactivate = (user: UserWithRole) => {
    setSelectedUser(user)
    setActionError(null)
    setIsDeactivateModalOpen(true)
  }

  const submitRoleChange = async () => {
    if (!selectedUser || !selectedRole) return

    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateRole',
          userId: selectedUser.id,
          role: selectedRole,
          tenantId: selectedTenant || null,
        }),
      })

      const { error } = await res.json()

      if (error) {
        setActionError(error)
      } else {
        setIsRoleModalOpen(false)
        loadUsers()
      }
    } catch (err) {
      setActionError('Failed to update role')
    }

    setActionLoading(false)
  }

  const submitTenantAssignment = async () => {
    if (!selectedUser) return

    setActionLoading(true)
    setActionError(null)

    try {
      const action = selectedTenant ? 'assignTenant' : 'removeTenant'
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: selectedUser.id,
          tenantId: selectedTenant || undefined,
        }),
      })

      const { error } = await res.json()

      if (error) {
        setActionError(error)
      } else {
        setIsTenantModalOpen(false)
        loadUsers()
      }
    } catch (err) {
      setActionError('Failed to update tenant assignment')
    }

    setActionLoading(false)
  }

  const submitDeactivate = async () => {
    if (!selectedUser) return

    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deactivate',
          userId: selectedUser.id,
        }),
      })

      const { error } = await res.json()

      if (error) {
        setActionError(error)
      } else {
        setIsDeactivateModalOpen(false)
        loadUsers()
      }
    } catch (err) {
      setActionError('Failed to deactivate user')
    }

    setActionLoading(false)
  }

  const openAddUserModal = () => {
    setNewUserEmail('')
    setNewUserFirstName('')
    setNewUserLastName('')
    setNewUserPhone('')
    setNewUserRole('parent')
    setNewUserTenant('')
    setActionError(null)
    setIsAddUserModalOpen(true)
  }

  const submitAddUser = async () => {
    if (!newUserEmail) {
      setActionError('Email is required')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail)) {
      setActionError('Please enter a valid email address')
      return
    }

    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createUser',
          email: newUserEmail,
          firstName: newUserFirstName || undefined,
          lastName: newUserLastName || undefined,
          phone: newUserPhone || undefined,
          role: newUserRole,
          tenantId: newUserTenant || null,
        }),
      })

      const { data, error } = await res.json()

      if (error) {
        setActionError(error)
      } else {
        setIsAddUserModalOpen(false)
        loadUsers()
      }
    } catch (err) {
      setActionError('Failed to create user')
    }

    setActionLoading(false)
  }

  const getDropdownItems = (u: UserWithRole) => [
    {
      label: 'View Details',
      icon: Eye,
      onClick: () => handleViewDetails(u),
    },
    {
      label: 'Edit Role',
      icon: UserCog,
      onClick: () => handleEditRole(u),
    },
    {
      label: 'Assign Tenant',
      icon: Building2,
      onClick: () => handleAssignTenant(u),
    },
    {
      label: 'Deactivate',
      icon: Trash2,
      onClick: () => handleDeactivate(u),
      variant: 'danger' as const,
    },
  ]

  return (
    <AdminLayout userRole="hq_admin" userName={userName}>
      <PageHeader
        title="Users"
        description="Manage all users across the system"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users' },
        ]}
      >
        <div className="flex items-center gap-3">
          <Button variant="outline-neon" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="neon" size="sm" onClick={openAddUserModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
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
            <option value="cit_volunteer">CIT Volunteer</option>
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
                        <DropdownMenu
                          trigger={<MoreVertical className="h-4 w-4" />}
                          items={getDropdownItems(u)}
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

      {/* Stats */}
      <div className="mt-6 flex items-center justify-between text-xs text-white/40">
        <p>Showing {filteredUsers.length} of {users.length} users</p>
        <p>Last updated: just now</p>
      </div>

      {/* Edit Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Edit User Role"
        description={selectedUser ? `Update role for ${selectedUser.first_name || selectedUser.email}` : ''}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {['licensee_owner', 'director', 'coach'].includes(selectedRole) && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Assign to Tenant (optional)
              </label>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
              >
                <option value="">No tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionError && (
            <p className="text-red-400 text-sm">{actionError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline-white"
              className="flex-1"
              onClick={() => setIsRoleModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="neon"
              className="flex-1"
              onClick={submitRoleChange}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Tenant Modal */}
      <Modal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        title="Assign to Tenant"
        description={selectedUser ? `Assign ${selectedUser.first_name || selectedUser.email} to a licensee` : ''}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              Tenant
            </label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
            >
              <option value="">No tenant (remove assignment)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {actionError && (
            <p className="text-red-400 text-sm">{actionError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline-white"
              className="flex-1"
              onClick={() => setIsTenantModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="neon"
              className="flex-1"
              onClick={submitTenantAssignment}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {selectedTenant ? 'Assign' : 'Remove'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* User Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="User Details"
        className="max-w-lg"
      >
        {!userDetails ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neon" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <div className="h-14 w-14 bg-neon/10 border border-neon/30 flex items-center justify-center">
                <span className="text-neon font-black text-xl">
                  {(userDetails.firstName?.[0] || userDetails.email?.[0] || 'U').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-bold text-white text-lg">
                  {[userDetails.firstName, userDetails.lastName].filter(Boolean).join(' ') || 'Unnamed User'}
                </p>
                <p className="text-sm text-white/50">{userDetails.email}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Phone</p>
                <p className="text-white">{userDetails.phone || '—'}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Location</p>
                <p className="text-white">
                  {[userDetails.city, userDetails.state].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Athletes</p>
                <p className="text-white">{userDetails.athleteCount}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Registrations</p>
                <p className="text-white">{userDetails.registrationCount}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Joined</p>
                <p className="text-white">{formatDate(userDetails.createdAt)}</p>
              </div>
            </div>

            {/* Roles */}
            <div className="pt-2">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Role History</p>
              <div className="space-y-2">
                {userDetails.roles.map((role) => {
                  const RoleIcon = ROLE_ICONS[role.role] || User
                  const roleColor = ROLE_COLORS[role.role] || ROLE_COLORS.parent
                  return (
                    <div key={role.id} className="flex items-center justify-between">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider border',
                        roleColor,
                        !role.isActive && 'opacity-40'
                      )}>
                        <RoleIcon className="h-3 w-3" />
                        {role.role.replace('_', ' ')}
                        {role.tenantName && ` @ ${role.tenantName}`}
                      </span>
                      <span className="text-xs text-white/30">
                        {role.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline-white"
                className="w-full"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        title="Deactivate User Role"
        description="This will deactivate the user's current role assignment."
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 p-4">
            <p className="text-sm text-red-300">
              Are you sure you want to deactivate the role for{' '}
              <strong>{selectedUser?.first_name || selectedUser?.email}</strong>?
            </p>
            <p className="text-xs text-red-300/70 mt-2">
              The user will lose their current permissions. This action can be reversed by assigning a new role.
            </p>
          </div>

          {actionError && (
            <p className="text-red-400 text-sm">{actionError}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline-white"
              className="flex-1"
              onClick={() => setIsDeactivateModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="outline-white"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={submitDeactivate}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add New User"
        description="Create a new user account on the platform"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              Email <span className="text-red-400">*</span>
            </label>
            <Input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                First Name
              </label>
              <Input
                type="text"
                value={newUserFirstName}
                onChange={(e) => setNewUserFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Last Name
              </label>
              <Input
                type="text"
                value={newUserLastName}
                onChange={(e) => setNewUserLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              Phone
            </label>
            <Input
              type="tel"
              value={newUserPhone}
              onChange={(e) => setNewUserPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {['licensee_owner', 'director', 'coach'].includes(newUserRole) && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Assign to Tenant
              </label>
              <select
                value={newUserTenant}
                onChange={(e) => setNewUserTenant(e.target.value)}
                className="w-full bg-black border border-white/20 text-white px-3 py-2 text-sm focus:border-neon focus:outline-none"
              >
                <option value="">No tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionError && (
            <p className="text-red-400 text-sm">{actionError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline-white"
              className="flex-1"
              onClick={() => setIsAddUserModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="neon"
              className="flex-1"
              onClick={submitAddUser}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
