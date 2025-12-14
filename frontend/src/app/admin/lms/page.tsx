'use client'

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Clock,
  Users,
  CheckCircle,
  Loader2,
  Save,
  X,
  ChevronDown,
} from 'lucide-react'
// Type definition (no longer imported from service)
interface LmsModule {
  id: string
  title: string
  slug: string
  description: string | null
  duration_minutes: number
  content_url: string | null
  required_for_roles: string[]
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Admin LMS Modules Page
 *
 * Manage training modules for the EmpowerU Studio LMS.
 * HQ Admin can create, edit, and manage modules for different roles.
 */

const ROLE_OPTIONS = [
  { value: 'director', label: 'Director' },
  { value: 'cit_volunteer', label: 'CIT / Volunteer' },
  { value: 'coach', label: 'Coach' },
  { value: 'licensee_owner', label: 'Licensee Owner' },
]

export default function AdminLmsPage() {
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState<LmsModule[]>([])
  const [editingModule, setEditingModule] = useState<LmsModule | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    duration_minutes: 15,
    content_url: '',
    required_for_roles: [] as string[],
    order_index: 0,
    is_active: true,
  })

  useEffect(() => {
    loadModules()
  }, [])

  async function loadModules() {
    try {
      const res = await fetch('/api/lms?action=modules')
      const { data, error } = await res.json()

      if (error) {
        console.error('Failed to load modules:', error)
      } else {
        setModules(data || [])
      }
    } catch (err) {
      console.error('Failed to load modules:', err)
    }
    setLoading(false)
  }

  function startCreate() {
    setFormData({
      title: '',
      slug: '',
      description: '',
      duration_minutes: 15,
      content_url: '',
      required_for_roles: [],
      order_index: modules.length,
      is_active: true,
    })
    setIsCreating(true)
    setEditingModule(null)
  }

  function startEdit(module: LmsModule) {
    setFormData({
      title: module.title,
      slug: module.slug,
      description: module.description || '',
      duration_minutes: module.duration_minutes,
      content_url: module.content_url || '',
      required_for_roles: module.required_for_roles,
      order_index: module.order_index,
      is_active: module.is_active,
    })
    setEditingModule(module)
    setIsCreating(false)
  }

  function cancelEdit() {
    setEditingModule(null)
    setIsCreating(false)
  }

  async function handleSave() {
    setSaving(true)

    const moduleData = {
      title: formData.title,
      slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
      description: formData.description,
      duration_minutes: formData.duration_minutes,
      content_url: formData.content_url || undefined,
      required_for_roles: formData.required_for_roles,
      order_index: formData.order_index,
      is_active: formData.is_active,
    }

    try {
      if (editingModule) {
        const res = await fetch('/api/lms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'updateModule', id: editingModule.id, ...moduleData }),
        })
        const { error } = await res.json()
        if (error) console.error('Failed to update module:', error)
      } else {
        const res = await fetch('/api/lms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'createModule', ...moduleData }),
        })
        const { error } = await res.json()
        if (error) console.error('Failed to create module:', error)
      }
    } catch (err) {
      console.error('Failed to save module:', err)
    }

    setSaving(false)
    cancelEdit()
    loadModules()
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this module?')) return

    try {
      const res = await fetch('/api/lms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteModule', moduleId: id }),
      })
      const { error } = await res.json()

      if (error) {
        console.error('Failed to delete module:', error)
      } else {
        loadModules()
      }
    } catch (err) {
      console.error('Failed to delete module:', err)
    }
  }

  function toggleRole(role: string) {
    setFormData(prev => ({
      ...prev,
      required_for_roles: prev.required_for_roles.includes(role)
        ? prev.required_for_roles.filter(r => r !== role)
        : [...prev.required_for_roles, role],
    }))
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
        title="EmpowerU Studio"
        description="Manage training modules for directors, volunteers, and staff"
      >
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Module
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-neon/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-neon" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{modules.length}</p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Total Modules</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                {modules.filter(m => m.required_for_roles.includes('director')).length}
              </p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Director Modules</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-orange-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                {modules.filter(m => m.required_for_roles.includes('cit_volunteer')).length}
              </p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Volunteer Modules</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-magenta/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-magenta" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                {modules.reduce((acc, m) => acc + m.duration_minutes, 0)}
              </p>
              <p className="text-xs text-white/50 uppercase tracking-wider">Total Minutes</p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Edit/Create Form */}
      {(editingModule || isCreating) && (
        <ContentCard className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              {isCreating ? 'Create Module' : 'Edit Module'}
            </h2>
            <button onClick={cancelEdit} className="p-2 text-white/50 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                placeholder="Module title"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                placeholder="module-slug"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none resize-none"
                placeholder="Module description"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Content URL (optional)
              </label>
              <input
                type="url"
                value={formData.content_url}
                onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Order Index
              </label>
              <input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Status
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-5 w-5 accent-neon"
                />
                <span className="text-white">Active</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Required For Roles
              </label>
              <div className="flex flex-wrap gap-3">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => toggleRole(role.value)}
                    className={`px-4 py-2 text-sm font-medium uppercase tracking-wider border transition-colors ${
                      formData.required_for_roles.includes(role.value)
                        ? 'bg-neon/10 border-neon text-neon'
                        : 'border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-white/10">
            <button
              onClick={cancelEdit}
              className="px-6 py-3 text-sm font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.title}
              className="flex items-center gap-2 px-6 py-3 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {isCreating ? 'Create Module' : 'Save Changes'}
            </button>
          </div>
        </ContentCard>
      )}

      {/* Modules List */}
      <ContentCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Order</th>
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Module</th>
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Duration</th>
                <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Required For</th>
                <th className="text-center py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Status</th>
                <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <span className="text-white/50">{module.order_index}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-bold text-white">{module.title}</div>
                      <div className="text-sm text-white/40">{module.description}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-white/70">{module.duration_minutes} min</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {module.required_for_roles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-0.5 text-xs font-medium bg-white/10 text-white/60"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {module.is_active ? (
                      <span className="px-2 py-1 text-xs font-bold uppercase bg-neon/10 text-neon">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-bold uppercase bg-white/10 text-white/40">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(module)}
                        className="p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(module.id)}
                        className="p-2 text-white/50 hover:text-magenta hover:bg-magenta/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modules.length === 0 && (
          <div className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Modules Yet</h3>
            <p className="text-white/50 mb-6">Create your first training module to get started</p>
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Module
            </button>
          </div>
        )}
      </ContentCard>
    </AdminLayout>
  )
}
