'use client'

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import {
  Plus,
  Save,
  Trash2,
  Pencil,
  X,
  Loader2,
  AlertCircle,
  Tag,
} from 'lucide-react'

interface SportTag {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  campCount: number
  venueCount: number
}

export default function AdminSportTagsPage() {
  const [tags, setTags] = useState<SportTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', slug: '', description: '', sortOrder: 0 })

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', slug: '', description: '', sortOrder: 0, isActive: true })

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    try {
      const res = await fetch('/api/sport-tags?all=1', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load tags')
      const json = await res.json()
      setTags(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTag.name.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/sport-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newTag),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create')

      setNewTag({ name: '', slug: '', description: '', sortOrder: 0 })
      setShowAddForm(false)
      await loadTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(tag: SportTag) {
    setEditingId(tag.id)
    setEditForm({
      name: tag.name,
      slug: tag.slug,
      description: tag.description || '',
      sortOrder: tag.sortOrder,
      isActive: tag.isActive,
    })
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/sport-tags?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update')

      setEditingId(null)
      await loadTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(tag: SportTag) {
    try {
      const res = await fetch(`/api/sport-tags?id=${tag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !tag.isActive }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to toggle')
      }
      await loadTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle active state')
    }
  }

  async function handleDelete(tag: SportTag) {
    if (!confirm(`Delete "${tag.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/sport-tags?id=${tag.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete')

      await loadTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag')
    }
  }

  function usageText(tag: SportTag): string {
    const parts: string[] = []
    if (tag.campCount > 0) parts.push(`${tag.campCount} camp(s)`)
    if (tag.venueCount > 0) parts.push(`${tag.venueCount} venue(s)`)
    return parts.join(', ') || '0'
  }

  function deleteTooltip(tag: SportTag): string {
    const total = tag.campCount + tag.venueCount
    if (total === 0) return 'Delete'
    const parts: string[] = []
    if (tag.campCount > 0) parts.push(`${tag.campCount} camp(s)`)
    if (tag.venueCount > 0) parts.push(`${tag.venueCount} venue(s)`)
    return `Cannot delete: used by ${parts.join(' and ')}`
  }

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neon" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <PageHeader
        title="Sport Tags"
        description="Manage sports that appear in camp and venue forms"
      />

      {error && (
        <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-magenta flex-shrink-0" />
          <p className="text-magenta">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-magenta/60 hover:text-magenta">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Add New Button */}
      {!showAddForm && (
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-5 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Sport Tag
          </button>
        </div>
      )}

      {/* Add New Form */}
      {showAddForm && (
        <ContentCard title="Add New Sport Tag" accent="neon">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newTag.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
                    setNewTag(prev => ({ ...prev, name, slug }))
                  }}
                  placeholder="e.g., Pickleball"
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={newTag.slug}
                  onChange={(e) => setNewTag(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-generated"
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={newTag.sortOrder}
                  onChange={(e) => setNewTag(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newTag.description}
                  onChange={(e) => setNewTag(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !newTag.name.trim()}
                className="flex items-center gap-2 px-5 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Create
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewTag({ name: '', slug: '', description: '', sortOrder: 0 }) }}
                className="px-5 py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </ContentCard>
      )}

      {/* Tags Table */}
      <ContentCard title={`All Sports (${tags.length})`} accent="purple">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Name</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Slug</th>
                <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Sort</th>
                <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Active</th>
                <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Usage</th>
                <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-white/50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-white/[0.02] transition-colors">
                  {editingId === tag.id ? (
                    <>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editForm.slug}
                          onChange={(e) => setEditForm(prev => ({ ...prev, slug: e.target.value }))}
                          className="w-full px-3 py-2 bg-black border border-white/20 text-white text-sm focus:border-neon focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          value={editForm.sortOrder}
                          onChange={(e) => setEditForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                          className="w-16 px-2 py-2 bg-black border border-white/20 text-white text-sm text-center focus:border-neon focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors ${
                            editForm.isActive
                              ? 'border-neon/50 bg-neon/10 text-neon'
                              : 'border-white/20 text-white/40'
                          }`}
                        >
                          {editForm.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-white/50">{usageText(tag)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdate(tag.id)}
                            disabled={saving}
                            className="p-2 text-neon hover:bg-neon/10 transition-colors"
                            title="Save"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-purple flex-shrink-0" />
                          <span className="font-medium text-white">{tag.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm text-white/40 bg-white/5 px-2 py-1">{tag.slug}</code>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-white/50">{tag.sortOrder}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(tag)}
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors ${
                            tag.isActive
                              ? 'border-neon/50 bg-neon/10 text-neon'
                              : 'border-white/20 text-white/40'
                          }`}
                        >
                          {tag.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-white/50">{usageText(tag)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(tag)}
                            className="p-2 text-white/40 hover:text-neon hover:bg-neon/10 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tag)}
                            disabled={tag.campCount + tag.venueCount > 0}
                            className="p-2 text-white/40 hover:text-magenta hover:bg-magenta/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={deleteTooltip(tag)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {tags.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    No sport tags found. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ContentCard>
    </AdminLayout>
  )
}
