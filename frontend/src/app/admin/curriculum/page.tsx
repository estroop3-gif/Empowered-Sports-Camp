'use client'

import { useState } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  FileText,
  Plus,
  Search,
  Filter,
  FolderOpen,
  Video,
  Image,
  File,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Dumbbell,
  Users,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Curriculum Management Page
 *
 * HQ Admin can manage camp curriculum, lesson plans, and resources
 */

// Sample categories for the curriculum structure
const CURRICULUM_CATEGORIES = [
  {
    id: 'lesson-plans',
    name: 'Lesson Plans',
    icon: BookOpen,
    description: 'Daily and weekly structured plans',
    count: 0,
    accent: 'neon' as const,
  },
  {
    id: 'drills',
    name: 'Drills & Activities',
    icon: Dumbbell,
    description: 'Sport-specific exercises and games',
    count: 0,
    accent: 'magenta' as const,
  },
  {
    id: 'team-building',
    name: 'Team Building',
    icon: Users,
    description: 'Group activities and icebreakers',
    count: 0,
    accent: 'purple' as const,
  },
  {
    id: 'safety',
    name: 'Safety & Guidelines',
    icon: FileText,
    description: 'Protocols and best practices',
    count: 0,
    accent: 'neon' as const,
  },
]

const ACCENT_COLORS = {
  neon: 'border-neon/30 hover:border-neon/50',
  magenta: 'border-magenta/30 hover:border-magenta/50',
  purple: 'border-purple/30 hover:border-purple/50',
}

const ACCENT_ICON_COLORS = {
  neon: 'text-neon bg-neon/10',
  magenta: 'text-magenta bg-magenta/10',
  purple: 'text-purple bg-purple/10',
}

export default function CurriculumPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin'

  return (
    <AdminLayout
      userRole="hq_admin"
      userName={userName}
    >
      <PageHeader
        title="Curriculum"
        description="Manage camp lesson plans, drills, and resources"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Curriculum' },
        ]}
      >
        <div className="flex items-center gap-3">
          <Button variant="outline-neon">
            <Upload className="h-4 w-4 mr-2" />
            Upload Resource
          </Button>
          <Button variant="neon">
            <Plus className="h-4 w-4 mr-2" />
            New Lesson Plan
          </Button>
        </div>
      </PageHeader>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <Input
            type="text"
            placeholder="Search curriculum..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {CURRICULUM_CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'bg-dark-100 border border-white/10 p-6 text-left transition-all hover:bg-white/5',
                ACCENT_COLORS[category.accent],
                selectedCategory === category.id && 'ring-2 ring-neon'
              )}
            >
              <div className={cn(
                'h-12 w-12 flex items-center justify-center mb-4',
                ACCENT_ICON_COLORS[category.accent]
              )}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white mb-1">{category.name}</h3>
              <p className="text-xs text-white/40 mb-3">{category.description}</p>
              <p className="text-sm text-white/60">
                <span className="text-neon font-bold">{category.count}</span> resources
              </p>
            </button>
          )
        })}
      </div>

      {/* Recent Resources / Empty State */}
      <ContentCard title="Resources" accent="neon">
        <div className="text-center py-12">
          <FolderOpen className="h-16 w-16 text-white/10 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Curriculum Resources Yet</h3>
          <p className="text-white/40 max-w-md mx-auto mb-6">
            Upload lesson plans, drills, videos, and other resources for your licensees and coaches to use.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline-neon">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            <Button variant="neon">
              <Plus className="h-4 w-4 mr-2" />
              Create Lesson Plan
            </Button>
          </div>
        </div>
      </ContentCard>

      {/* Resource Types Info */}
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div className="bg-dark-100 border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-neon/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-neon" />
            </div>
            <h4 className="font-bold text-white">Documents</h4>
          </div>
          <p className="text-xs text-white/40">
            PDF lesson plans, word documents, spreadsheets for scheduling
          </p>
        </div>
        <div className="bg-dark-100 border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-magenta/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-magenta" />
            </div>
            <h4 className="font-bold text-white">Videos</h4>
          </div>
          <p className="text-xs text-white/40">
            Training videos, drill demonstrations, coach tutorials
          </p>
        </div>
        <div className="bg-dark-100 border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-purple/10 flex items-center justify-center">
              <Image className="h-5 w-5 text-purple" />
            </div>
            <h4 className="font-bold text-white">Images</h4>
          </div>
          <p className="text-xs text-white/40">
            Drill diagrams, field setup guides, branded materials
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}
