'use client'

/**
 * Coach Curriculum Library Page
 *
 * Shows curriculum blocks and drills for the coach's assigned stations.
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  AlertCircle,
  CheckCircle,
  Dumbbell,
  Zap,
} from 'lucide-react'
import type { CoachCurriculumBlock } from '@/lib/services/coach-dashboard'

export default function CoachCurriculumPage() {
  const searchParams = useSearchParams()
  const campIdParam = searchParams.get('campId')

  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<CoachCurriculumBlock[]>([])
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCurriculum()
  }, [campIdParam])

  async function loadCurriculum() {
    try {
      const url = campIdParam
        ? `/api/coach/curriculum?campId=${campIdParam}`
        : '/api/coach/curriculum'
      const res = await fetch(url)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Failed to load curriculum')

      setBlocks(json.data?.curriculum_blocks || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load curriculum')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PortalPageHeader
        title="Curriculum Library"
        description="Drills and activities for your assigned stations"
      />

      <LmsGate variant="card" featureName="curriculum">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          </div>
        ) : error ? (
          <PortalCard>
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
              <p className="text-white/50">{error}</p>
              <button
                onClick={loadCurriculum}
                className="mt-4 px-4 py-2 bg-blue-400 text-black font-bold uppercase text-sm"
              >
                Retry
              </button>
            </div>
          </PortalCard>
        ) : blocks.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Curriculum Available</h3>
              <p className="text-white/50">
                {campIdParam
                  ? 'No curriculum blocks are assigned to this camp yet.'
                  : 'No curriculum blocks are available for your assigned camps.'}
              </p>
            </div>
          </PortalCard>
        ) : (
          <div className="space-y-4">
            {blocks.map((block) => (
              <CurriculumBlockCard
                key={block.id}
                block={block}
                isExpanded={expandedBlock === block.id}
                onToggle={() =>
                  setExpandedBlock(expandedBlock === block.id ? null : block.id)
                }
              />
            ))}
          </div>
        )}
      </LmsGate>
    </div>
  )
}

function CurriculumBlockCard({
  block,
  isExpanded,
  onToggle,
}: {
  block: CoachCurriculumBlock
  isExpanded: boolean
  onToggle: () => void
}) {
  const intensityColors: Record<string, string> = {
    low: 'bg-green-500/20 text-green-400',
    moderate: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-orange-500/20 text-orange-400',
    very_high: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="bg-white/5 border border-white/10">
      {/* Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-400/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">{block.title}</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/50 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {block.duration_minutes} min
              </span>
              <span className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                {block.sport.replace('_', ' ')}
              </span>
              <span className={cn(
                'px-2 py-0.5 text-xs flex items-center gap-1',
                intensityColors[block.intensity] || 'bg-white/10 text-white/50'
              )}>
                <Zap className="h-3 w-3" />
                {block.intensity.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40 uppercase px-2 py-1 bg-white/10">
            {block.block_type.replace('_', ' ')}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-white/40" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/40" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/10">
          {/* Description */}
          {block.description && (
            <div className="p-4 bg-white/5 border-b border-white/10">
              <div className="text-xs text-white/40 uppercase mb-1">Description</div>
              <p className="text-white/70">{block.description}</p>
            </div>
          )}

          {/* Equipment */}
          {block.equipment_needed && (
            <div className="p-4 bg-white/5 border-b border-white/10">
              <div className="text-xs text-white/40 uppercase mb-1">Equipment Needed</div>
              <p className="text-white/70">{block.equipment_needed}</p>
            </div>
          )}

          {/* Setup Notes */}
          {block.setup_notes && (
            <div className="p-4 bg-white/5 border-b border-white/10">
              <div className="text-xs text-white/40 uppercase mb-1">Setup Notes</div>
              <p className="text-white/70">{block.setup_notes}</p>
            </div>
          )}

          {/* Coaching Points */}
          {block.coaching_points && block.coaching_points.length > 0 && (
            <div className="p-4">
              <div className="text-xs text-white/40 uppercase mb-3">Coaching Points</div>
              <ul className="space-y-2">
                {block.coaching_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                    <span className="text-white/70">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
