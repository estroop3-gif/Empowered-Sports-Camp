'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PortalCard } from '@/components/portal'
import { AdminLayout } from '@/components/admin/admin-layout'
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
  Trophy,
  Mic,
  Download,
  DollarSign,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { parseDateSafe } from '@/lib/utils'
import { generateReportPDF } from '@/lib/utils/pdf-export'

interface GuestSpeaker {
  id: string
  name: string
  title: string | null
  organization: string | null
  topic: string | null
  speakerDate: string | null
  isHighProfile: boolean
}

interface DayRecap {
  dayTheme: string | null
  wordOfTheDay: string | null
  wordOfTheDayExample: string | null
  primarySport: string | null
  primarySportFocus: string | null
  secondarySport: string | null
  secondarySportFocus: string | null
  guestSpeakerName: string | null
  guestSpeakerTitle: string | null
  guestSpeakerTopic: string | null
  pinkPointSkill: string | null
  purplePointSkill: string | null
  highlights: string | null
  tomorrowSport1: string | null
  tomorrowSport2: string | null
  tomorrowWordOfTheDay: string | null
}

interface DaySummary {
  id: string
  dayNumber: number
  date: string
  status: string
  title: string | null
  notes: string | null
  stats: {
    total: number
    checkedIn: number
    checkedOut: number
    attended: number
    absent: number
    notArrived: number
    attendanceRate: number
  }
  recap: DayRecap | null
}

interface ComprehensiveReport {
  campId: string
  campName: string
  startDate: string
  endDate: string
  status: string
  registration: {
    total: number
    confirmed: number
    pending: number
    cancelled: number
    gradeDistribution: Array<{ grade: string; count: number }>
    genderDistribution: Array<{ gender: string; count: number }>
    addonsRevenue: number
  }
  attendance: {
    totalDays: number
    completedDays: number
    averageAttendance: number
    averageAttendanceRate: number
    totalAbsences: number
  }
  highlights: {
    sports: string[]
    wordsOfTheDay: string[]
    guestSpeakers: GuestSpeaker[]
  }
  days: DaySummary[]
}

export default function ComprehensiveReportPage() {
  const params = useParams()
  const campId = params.campId as string

  const [report, setReport] = useState<ComprehensiveReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())

  const toggleDay = (dayNumber: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayNumber)) {
        next.delete(dayNumber)
      } else {
        next.add(dayNumber)
      }
      return next
    })
  }

  const handleDownloadPDF = () => {
    if (!report) return

    const dateRange = `${parseDateSafe(report.startDate).toLocaleDateString()} - ${parseDateSafe(report.endDate).toLocaleDateString()}`

    const stats = [
      { label: 'Total Registrations', value: report.registration.total },
      { label: 'Confirmed', value: report.registration.confirmed },
      { label: 'Pending', value: report.registration.pending },
      { label: 'Cancelled', value: report.registration.cancelled },
      { label: 'Days Completed', value: `${report.attendance.completedDays}/${report.attendance.totalDays}` },
      { label: 'Avg Attendance Rate', value: `${report.attendance.averageAttendanceRate.toFixed(0)}%` },
      { label: 'Total Absences', value: report.attendance.totalAbsences },
      { label: 'Add-ons Revenue', value: `$${(report.registration.addonsRevenue / 100).toFixed(2)}` },
    ]

    const tables: { title: string; data: { headers: string[]; rows: (string | number)[][] } }[] = []

    // Grade distribution
    if (report.registration.gradeDistribution.length > 0) {
      tables.push({
        title: 'Grade Distribution',
        data: {
          headers: ['Grade', 'Count'],
          rows: report.registration.gradeDistribution.map((item) => [item.grade, item.count]),
        },
      })
    }

    // Gender distribution
    if (report.registration.genderDistribution.length > 0) {
      tables.push({
        title: 'Gender Distribution',
        data: {
          headers: ['Gender', 'Count'],
          rows: report.registration.genderDistribution.map((item) => [item.gender, item.count]),
        },
      })
    }

    // Sports & Words
    if (report.highlights.sports.length > 0 || report.highlights.wordsOfTheDay.length > 0) {
      const highlightsRows: (string | number)[][] = []
      report.highlights.sports.forEach((sport) => highlightsRows.push(['Sport', sport]))
      report.highlights.wordsOfTheDay.forEach((word) => highlightsRows.push(['Word of Day', word]))
      tables.push({
        title: 'Session Highlights',
        data: {
          headers: ['Type', 'Value'],
          rows: highlightsRows,
        },
      })
    }

    // Guest speakers
    if (report.highlights.guestSpeakers.length > 0) {
      tables.push({
        title: 'Guest Speakers',
        data: {
          headers: ['Name', 'Title', 'Organization', 'Topic'],
          rows: report.highlights.guestSpeakers.map((s) => [
            s.name,
            s.title || '-',
            s.organization || '-',
            s.topic || '-',
          ]),
        },
      })
    }

    // Daily summary
    const completedDays = report.days.filter((d) => d.status === 'finished')
    if (completedDays.length > 0) {
      tables.push({
        title: 'Daily Summary',
        data: {
          headers: ['Day', 'Date', 'Word', 'Sport', 'Attended', 'Absent', 'Rate'],
          rows: completedDays.map((day) => [
            `Day ${day.dayNumber}`,
            parseDateSafe(day.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            }),
            day.recap?.wordOfTheDay || '-',
            day.recap?.primarySport || '-',
            day.stats.attended,
            day.stats.absent,
            `${day.stats.attendanceRate.toFixed(0)}%`,
          ]),
        },
      })
    }

    generateReportPDF(
      {
        title: 'Camp Report',
        subtitle: `${report.campName} - ${dateRange}`,
        filename: `camp-report-${new Date().toISOString().split('T')[0]}`,
      },
      stats,
      tables
    )
  }

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/camps/${campId}/reports/daily`)
        if (!res.ok) {
          throw new Error('Failed to load report')
        }
        const data = await res.json()
        setReport(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [campId])

  if (loading) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !report) {
    return (
      <AdminLayout userRole="hq_admin" userName="Admin">
        <PortalCard>
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Error</h3>
            <p className="text-white/50 mb-4">{error || 'Report not found'}</p>
            <Link
              href={`/admin/camps/${campId}/hq`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Camp HQ
            </Link>
          </div>
        </PortalCard>
      </AdminLayout>
    )
  }

  const completedDays = report.days.filter((d) => d.status === 'finished')

  return (
    <AdminLayout userRole="hq_admin" userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/admin/camps/${campId}/hq`}
              className="text-sm text-white/50 hover:text-white flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Camp HQ
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Star className="h-8 w-8 text-neon" />
              Camp Report
            </h1>
            <p className="text-white/50 mt-1">
              {report.campName} |{' '}
              {parseDateSafe(report.startDate).toLocaleDateString()} - {parseDateSafe(report.endDate).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/80 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <PortalCard accent="neon">
            <div className="text-center">
              <Users className="h-8 w-8 text-neon mx-auto mb-2" />
              <div className="text-3xl font-bold text-neon">{report.registration.confirmed}</div>
              <div className="text-sm text-white/50">Confirmed Campers</div>
            </div>
          </PortalCard>
          <PortalCard accent="purple">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-purple mx-auto mb-2" />
              <div className="text-3xl font-bold text-purple">
                {report.attendance.averageAttendanceRate.toFixed(0)}%
              </div>
              <div className="text-sm text-white/50">Avg Attendance</div>
            </div>
          </PortalCard>
          <PortalCard>
            <div className="text-center">
              <Calendar className="h-8 w-8 text-white/50 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">
                {report.attendance.completedDays}/{report.attendance.totalDays}
              </div>
              <div className="text-sm text-white/50">Days Completed</div>
            </div>
          </PortalCard>
          <PortalCard>
            <div className="text-center">
              <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{report.highlights.sports.length}</div>
              <div className="text-sm text-white/50">Sports Played</div>
            </div>
          </PortalCard>
        </div>

        {/* Registration Summary */}
        <PortalCard title="Registration Summary">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-neon/10 border border-neon/20">
                  <div className="text-2xl font-bold text-neon">{report.registration.confirmed}</div>
                  <div className="text-xs text-white/50">Confirmed</div>
                </div>
                <div className="text-center p-3 bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">{report.registration.pending}</div>
                  <div className="text-xs text-white/50">Pending</div>
                </div>
                <div className="text-center p-3 bg-magenta/10 border border-magenta/20">
                  <div className="text-2xl font-bold text-magenta">{report.registration.cancelled}</div>
                  <div className="text-xs text-white/50">Cancelled</div>
                </div>
              </div>
              {report.registration.addonsRevenue > 0 && (
                <div className="flex items-center gap-3 p-3 bg-neon/5 border border-neon/10">
                  <DollarSign className="h-6 w-6 text-neon" />
                  <div>
                    <div className="text-xl font-bold text-neon">
                      ${(report.registration.addonsRevenue / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-white/50">Add-ons Revenue</div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {report.registration.gradeDistribution.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Grade Distribution
                  </div>
                  <div className="space-y-2">
                    {report.registration.gradeDistribution.map((item) => (
                      <div key={item.grade} className="flex items-center gap-2">
                        <div className="w-16 text-sm text-white/70">{item.grade}</div>
                        <div className="flex-1 h-3 bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-purple"
                            style={{
                              width: `${(item.count / report.registration.confirmed) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="w-8 text-right text-sm text-white">{item.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.registration.genderDistribution.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Gender Distribution
                  </div>
                  <div className="space-y-2">
                    {report.registration.genderDistribution.map((item) => (
                      <div key={item.gender} className="flex items-center gap-2">
                        <div className="w-16 text-sm text-white/70 capitalize">{item.gender}</div>
                        <div className="flex-1 h-3 bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-neon"
                            style={{
                              width: `${(item.count / report.registration.confirmed) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="w-8 text-right text-sm text-white">{item.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </PortalCard>

        {/* Session Highlights */}
        <div className="grid gap-4 md:grid-cols-3">
          <PortalCard title="Sports Played" accent="neon">
            {report.highlights.sports.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {report.highlights.sports.map((sport, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-neon/20 text-neon text-sm font-medium"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">No sports recorded yet</p>
            )}
          </PortalCard>

          <PortalCard title="Words of the Day" accent="purple">
            {report.highlights.wordsOfTheDay.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {report.highlights.wordsOfTheDay.map((word, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple/20 text-purple text-sm font-medium"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">No words recorded yet</p>
            )}
          </PortalCard>

          <PortalCard title="Guest Speakers">
            {report.highlights.guestSpeakers.length > 0 ? (
              <div className="space-y-2">
                {report.highlights.guestSpeakers.map((speaker) => (
                  <div key={speaker.id} className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-white/50" />
                    <div>
                      <span className="text-white">{speaker.name}</span>
                      {speaker.isHighProfile && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-neon/20 text-neon uppercase">
                          High-Profile
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">No guest speakers recorded</p>
            )}
          </PortalCard>
        </div>

        {/* Daily Breakdown */}
        <PortalCard title="Daily Breakdown">
          {report.days.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No camp days scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {report.days.map((day) => {
                const isExpanded = expandedDays.has(day.dayNumber)
                const isCompleted = day.status === 'finished'

                return (
                  <div
                    key={day.dayNumber}
                    className={`border ${
                      isCompleted ? 'border-neon/20 bg-neon/5' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <button
                      onClick={() => toggleDay(day.dayNumber)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 flex items-center justify-center font-bold ${
                            isCompleted ? 'bg-neon text-black' : 'bg-white/10 text-white/50'
                          }`}
                        >
                          {day.dayNumber}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-white">
                            Day {day.dayNumber}
                            {day.title && <span className="text-white/50"> - {day.title}</span>}
                          </div>
                          <div className="text-sm text-white/50">
                            {parseDateSafe(day.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isCompleted && (
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-neon">{day.stats.attended} attended</span>
                            <span className="text-magenta">{day.stats.absent} absent</span>
                            <span
                              className={`font-medium ${
                                day.stats.attendanceRate >= 90
                                  ? 'text-neon'
                                  : day.stats.attendanceRate >= 75
                                  ? 'text-yellow-400'
                                  : 'text-magenta'
                              }`}
                            >
                              {day.stats.attendanceRate.toFixed(0)}%
                            </span>
                          </div>
                        )}
                        {!isCompleted && (
                          <span className="text-xs px-2 py-1 bg-white/10 text-white/50 uppercase">
                            {day.status.replace('_', ' ')}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-white/50" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-white/50" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 border-t border-white/10 space-y-4">
                        {/* Day Stats */}
                        <div className="grid grid-cols-5 gap-3">
                          <div className="text-center p-2 bg-white/5">
                            <div className="text-lg font-bold text-white">{day.stats.total}</div>
                            <div className="text-xs text-white/50">Total</div>
                          </div>
                          <div className="text-center p-2 bg-neon/10">
                            <div className="text-lg font-bold text-neon">{day.stats.checkedIn}</div>
                            <div className="text-xs text-white/50">Checked In</div>
                          </div>
                          <div className="text-center p-2 bg-purple/10">
                            <div className="text-lg font-bold text-purple">{day.stats.checkedOut}</div>
                            <div className="text-xs text-white/50">Checked Out</div>
                          </div>
                          <div className="text-center p-2 bg-magenta/10">
                            <div className="text-lg font-bold text-magenta">{day.stats.absent}</div>
                            <div className="text-xs text-white/50">Absent</div>
                          </div>
                          <div className="text-center p-2 bg-white/5">
                            <div className="text-lg font-bold text-white/50">{day.stats.notArrived}</div>
                            <div className="text-xs text-white/50">Not Arrived</div>
                          </div>
                        </div>

                        {/* Day Recap */}
                        {day.recap && (
                          <div className="grid gap-4 md:grid-cols-2">
                            {day.recap.wordOfTheDay && (
                              <div className="flex items-start gap-3 p-3 bg-purple/5 border border-purple/10">
                                <MessageSquare className="h-5 w-5 text-purple mt-0.5" />
                                <div>
                                  <div className="text-xs text-white/50 uppercase mb-1">Word of the Day</div>
                                  <div className="font-bold text-white">{day.recap.wordOfTheDay}</div>
                                  {day.recap.wordOfTheDayExample && (
                                    <div className="text-sm text-white/60 mt-1">
                                      {day.recap.wordOfTheDayExample}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {day.recap.primarySport && (
                              <div className="flex items-start gap-3 p-3 bg-neon/5 border border-neon/10">
                                <Trophy className="h-5 w-5 text-neon mt-0.5" />
                                <div>
                                  <div className="text-xs text-white/50 uppercase mb-1">Primary Sport</div>
                                  <div className="font-bold text-white">{day.recap.primarySport}</div>
                                  {day.recap.primarySportFocus && (
                                    <div className="text-sm text-white/60 mt-1">
                                      Focus: {day.recap.primarySportFocus}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {day.recap.secondarySport && (
                              <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10">
                                <Trophy className="h-5 w-5 text-white/50 mt-0.5" />
                                <div>
                                  <div className="text-xs text-white/50 uppercase mb-1">Secondary Sport</div>
                                  <div className="font-bold text-white">{day.recap.secondarySport}</div>
                                  {day.recap.secondarySportFocus && (
                                    <div className="text-sm text-white/60 mt-1">
                                      Focus: {day.recap.secondarySportFocus}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {day.recap.guestSpeakerName && (
                              <div className="flex items-start gap-3 p-3 bg-purple/5 border border-purple/10">
                                <Mic className="h-5 w-5 text-purple mt-0.5" />
                                <div>
                                  <div className="text-xs text-white/50 uppercase mb-1">Guest Speaker</div>
                                  <div className="font-bold text-white">{day.recap.guestSpeakerName}</div>
                                  {day.recap.guestSpeakerTopic && (
                                    <div className="text-sm text-white/60 mt-1">
                                      Topic: {day.recap.guestSpeakerTopic}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {day.recap.highlights && (
                              <div className="md:col-span-2 p-3 bg-neon/5 border border-neon/10">
                                <div className="text-xs text-white/50 uppercase mb-1">Highlights</div>
                                <div className="text-white">{day.recap.highlights}</div>
                              </div>
                            )}
                            {(day.recap.pinkPointSkill || day.recap.purplePointSkill) && (
                              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                {day.recap.pinkPointSkill && (
                                  <div className="p-3 bg-pink-500/5 border border-pink-500/10">
                                    <div className="text-xs text-white/50 uppercase mb-1">Pink Point Skill</div>
                                    <div className="text-white">{day.recap.pinkPointSkill}</div>
                                  </div>
                                )}
                                {day.recap.purplePointSkill && (
                                  <div className="p-3 bg-purple/5 border border-purple/10">
                                    <div className="text-xs text-white/50 uppercase mb-1">Purple Point Skill</div>
                                    <div className="text-white">{day.recap.purplePointSkill}</div>
                                  </div>
                                )}
                              </div>
                            )}
                            {(day.recap.tomorrowSport1 || day.recap.tomorrowWordOfTheDay) && (
                              <div className="md:col-span-2 p-3 bg-white/5 border border-white/10">
                                <div className="text-xs text-white/50 uppercase mb-1">Tomorrow's Plan</div>
                                <div className="text-white/70 space-y-1">
                                  {day.recap.tomorrowSport1 && <div>Sport 1: {day.recap.tomorrowSport1}</div>}
                                  {day.recap.tomorrowSport2 && <div>Sport 2: {day.recap.tomorrowSport2}</div>}
                                  {day.recap.tomorrowWordOfTheDay && <div>Word: {day.recap.tomorrowWordOfTheDay}</div>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Day Notes */}
                        {day.notes && (
                          <div className="p-3 bg-white/5 border border-white/10">
                            <div className="text-xs text-white/50 uppercase mb-1">Day Notes</div>
                            <div className="text-white/70 whitespace-pre-wrap">{day.notes}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </PortalCard>
      </div>
    </AdminLayout>
  )
}
