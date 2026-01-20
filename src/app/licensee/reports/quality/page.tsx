'use client'

/**
 * Licensee Quality Reports Page
 *
 * Shows quality & compliance metrics including CSAT, complaints, and curriculum adherence.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import { cn } from '@/lib/utils'
import {
  Star,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from 'lucide-react'
import type { LicenseeQualityReport, CampQualityMetrics } from '@/lib/services/licensee-quality'

export default function LicenseeQualityPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<LicenseeQualityReport | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadReport()
  }, [])

  async function loadReport() {
    try {
      setLoading(true)
      const res = await fetch('/api/licensee/quality')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load report')
      }

      setReport(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <LmsGate featureName="quality reports">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </LmsGate>
    )
  }

  if (error || !report) {
    return (
      <LmsGate featureName="quality reports">
        <PortalPageHeader
          title="Quality & Compliance"
          description="Track quality metrics across your territory"
        />
        <PortalCard>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error Loading Report</h3>
            <p className="text-white/50 mb-4">{error}</p>
            <button
              onClick={loadReport}
              className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </PortalCard>
      </LmsGate>
    )
  }

  const filteredCamps = report.camps.filter((camp) => {
    if (filter === 'all') return true
    return camp.status === filter
  })

  return (
    <LmsGate featureName="quality reports">
      <div>
        <PortalPageHeader
          title="Quality & Compliance"
          description="Monitor CSAT, complaints, and curriculum adherence"
          actions={
            <Link
              href="/licensee/dashboard"
              className="px-4 py-2 bg-white/10 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition-colors"
            >
              Back to Dashboard
            </Link>
          }
        />

        {/* Warnings Banner */}
        {report.warnings.length > 0 && (
          <div className="mb-6 p-4 bg-magenta/10 border border-magenta/30">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-magenta" />
              <h3 className="font-bold text-white uppercase tracking-wider">
                Attention Required ({report.warnings.length})
              </h3>
            </div>
            <div className="space-y-2">
              {report.warnings.map((warning, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 flex items-start gap-3',
                    warning.severity === 'critical' ? 'bg-magenta/20' : 'bg-yellow-500/10'
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4 flex-shrink-0 mt-0.5',
                      warning.severity === 'critical' ? 'text-magenta' : 'text-yellow-400'
                    )}
                  />
                  <div>
                    <p className="text-white text-sm">{warning.message}</p>
                    <p className="text-white/50 text-xs mt-1">
                      Camps: {warning.affected_camps.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <PortalCard accent="neon">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-yellow-500/20 flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {report.overall.avg_csat !== null
                    ? report.overall.avg_csat.toFixed(1)
                    : 'N/A'}
                </div>
                <div className="text-sm text-white/50 uppercase">Avg CSAT</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-magenta/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-magenta" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {report.overall.complaint_ratio.toFixed(1)}%
                </div>
                <div className="text-sm text-white/50 uppercase">Complaint Ratio</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {report.overall.curriculum_adherence.toFixed(0)}%
                </div>
                <div className="text-sm text-white/50 uppercase">Curriculum Adherence</div>
              </div>
            </div>
          </PortalCard>

          <PortalCard>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-neon/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-neon" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {report.overall.camps_excellent + report.overall.camps_good} / {report.camps.length}
                </div>
                <div className="text-sm text-white/50 uppercase">Good+ Rating</div>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Status Distribution */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <StatusCard
            label="Excellent"
            count={report.overall.camps_excellent}
            total={report.camps.length}
            color="neon"
          />
          <StatusCard
            label="Good"
            count={report.overall.camps_good}
            total={report.camps.length}
            color="purple"
          />
          <StatusCard
            label="Needs Attention"
            count={report.overall.camps_attention}
            total={report.camps.length}
            color="yellow"
          />
          <StatusCard
            label="Critical"
            count={report.overall.camps_critical}
            total={report.camps.length}
            color="magenta"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'All Camps' },
            { value: 'excellent', label: 'Excellent' },
            { value: 'good', label: 'Good' },
            { value: 'needs_attention', label: 'Needs Attention' },
            { value: 'critical', label: 'Critical' },
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
              {opt.label}
            </button>
          ))}
        </div>

        {/* Camp List */}
        <PortalCard title="Camp Quality Breakdown">
          {filteredCamps.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No camps match this filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCamps.map((camp) => (
                <QualityRow key={camp.camp_id} camp={camp} />
              ))}
            </div>
          )}
        </PortalCard>

        {/* Methodology Footer */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10">
          <p className="text-sm text-white/50">
            <span className="font-bold text-white">Quality Methodology:</span> CSAT scores are collected from
            post-camp parent surveys. Complaint ratio is calculated per 100 campers. Curriculum adherence
            measures use of the Grouping Tool and completion of daily schedule blocks.
          </p>
        </div>
      </div>
    </LmsGate>
  )
}

function StatusCard({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: 'neon' | 'purple' | 'yellow' | 'magenta'
}) {
  const colorMap = {
    neon: 'bg-neon/20 text-neon border-neon/30',
    purple: 'bg-purple/20 text-purple border-purple/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    magenta: 'bg-magenta/20 text-magenta border-magenta/30',
  }

  const percent = total > 0 ? (count / total) * 100 : 0

  return (
    <div className={cn('p-4 border', colorMap[color])}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="mt-2 w-full h-1 bg-white/10 overflow-hidden">
        <div
          className={cn('h-full', color === 'neon' ? 'bg-neon' : color === 'purple' ? 'bg-purple' : color === 'yellow' ? 'bg-yellow-400' : 'bg-magenta')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function QualityRow({ camp }: { camp: CampQualityMetrics }) {
  const statusConfig = {
    excellent: {
      label: 'Excellent',
      color: 'bg-neon/20 text-neon',
      icon: CheckCircle,
    },
    good: {
      label: 'Good',
      color: 'bg-purple/20 text-purple',
      icon: CheckCircle,
    },
    needs_attention: {
      label: 'Needs Attention',
      color: 'bg-yellow-500/20 text-yellow-400',
      icon: AlertTriangle,
    },
    critical: {
      label: 'Critical',
      color: 'bg-magenta/20 text-magenta',
      icon: AlertCircle,
    },
  }

  const config = statusConfig[camp.status]
  const StatusIcon = config.icon

  return (
    <div className="p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold text-white">{camp.camp_name}</span>
            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase', config.color)}>
              <StatusIcon className="h-3 w-3 inline mr-1" />
              {config.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {camp.camp_dates}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {camp.camper_count} campers
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* CSAT */}
          <div className="text-center">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-lg font-bold text-white">
                {camp.csat_score !== null ? camp.csat_score.toFixed(1) : 'N/A'}
              </span>
            </div>
            <div className="text-xs text-white/40">CSAT</div>
          </div>

          {/* Complaint Ratio */}
          <div className="text-center">
            <span
              className={cn(
                'text-lg font-bold',
                camp.complaint_ratio > 2 ? 'text-magenta' : 'text-white'
              )}
            >
              {camp.complaint_ratio.toFixed(1)}%
            </span>
            <div className="text-xs text-white/40">Complaints</div>
          </div>

          {/* Curriculum */}
          <div className="text-center">
            <span
              className={cn(
                'text-lg font-bold',
                camp.curriculum_adherence < 70 ? 'text-yellow-400' : 'text-white'
              )}
            >
              {camp.curriculum_adherence.toFixed(0)}%
            </span>
            <div className="text-xs text-white/40">Curriculum</div>
          </div>

          {/* Recaps */}
          <div className="text-center">
            <span className="text-lg font-bold text-white">
              {camp.daily_recaps_completed}/{camp.total_days}
            </span>
            <div className="text-xs text-white/40">Recaps</div>
          </div>

          {/* Grouping */}
          <div className="text-center">
            {camp.grouping_tool_used ? (
              <CheckCircle className="h-5 w-5 text-neon mx-auto" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-400 mx-auto" />
            )}
            <div className="text-xs text-white/40">Groups</div>
          </div>

          <Link
            href={`/licensee/camps/${camp.camp_id}/hq`}
            className="p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
