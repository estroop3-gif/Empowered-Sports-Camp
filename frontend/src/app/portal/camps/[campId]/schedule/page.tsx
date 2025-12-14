'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { CampCreateStepper, getStepsForCurrentStep } from '@/components/admin/camps/CampCreateStepper'
import { CampCurriculumSelector } from '@/components/admin/camps/CampCurriculumSelector'
import { CampScheduleBuilder } from '@/components/admin/camps/CampScheduleBuilder'
import { useAuth } from '@/lib/auth/context'
import {
  getCampWithSchedule,
  createCampDays,
  getCampDays,
  type CampSessionDay,
  type CampCurriculumAssignment,
} from '@/lib/services/camp-schedule'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  BookOpen,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ campId: string }>
}

export default function CampSchedulePage({ params }: PageProps) {
  const resolvedParams = use(params)
  const campId = resolvedParams.campId
  const router = useRouter()
  const { user, role, isHqAdmin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  // Camp data
  const [camp, setCamp] = useState<{
    id: string
    name: string
    start_date: string
    end_date: string
    start_time: string | null
    end_time: string | null
    sport: string | null
  } | null>(null)

  // Days and schedule
  const [days, setDays] = useState<CampSessionDay[]>([])
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)

  // Curriculum
  const [curriculum, setCurriculum] = useState<CampCurriculumAssignment | null>(null)

  const userName = user?.firstName || user?.email?.split('@')[0] || 'Admin'
  const canEdit = isHqAdmin || role === 'licensee_owner' || role === 'director'

  useEffect(() => {
    loadCampData()
  }, [campId])

  async function loadCampData() {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getCampWithSchedule(campId)

      if (fetchError) {
        throw fetchError
      }

      if (!data) {
        throw new Error('Camp not found')
      }

      setCamp({
        id: data.id,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        start_time: data.start_time,
        end_time: data.end_time,
        sport: data.sport,
      })

      // If no days exist yet, create them
      if (!data.days || data.days.length === 0) {
        const { data: newDays, error: daysError } = await createCampDays(
          campId,
          data.start_date,
          data.end_date
        )

        if (daysError) {
          console.error('Failed to create days:', daysError)
        } else if (newDays) {
          setDays(newDays)
          setSelectedDayId(newDays[0]?.id || null)
        }
      } else {
        setDays(data.days)
        setSelectedDayId(data.days[0]?.id || null)
      }

      setCurriculum(data.curriculum)
    } catch (err) {
      console.error('Failed to load camp:', err)
      setError(err instanceof Error ? err.message : 'Failed to load camp data')
    } finally {
      setLoading(false)
    }
  }

  async function handleCurriculumAssigned(assignment: CampCurriculumAssignment) {
    setCurriculum(assignment)
    setSuccess('Curriculum template assigned successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleDaysUpdated() {
    // Reload days data
    const { data: updatedDays } = await getCampDays(campId)
    if (updatedDays) {
      setDays(updatedDays)
    }
  }

  function handleFinish() {
    setShowCompleted(true)
    // Redirect to camps list after showing success
    setTimeout(() => {
      router.push('/portal/camps')
    }, 2500)
  }

  if (loading) {
    return (
      <AdminLayout userRole={role || 'licensee_owner'} userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-neon animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  // Show completion screen
  if (showCompleted) {
    return (
      <AdminLayout userRole={role || 'licensee_owner'} userName={userName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto">
            {/* Success Animation */}
            <div className="relative mb-8">
              <div className="h-24 w-24 mx-auto bg-neon/20 border-2 border-neon flex items-center justify-center animate-pulse">
                <CheckCircle className="h-12 w-12 text-neon" />
              </div>
              <div className="absolute inset-0 h-24 w-24 mx-auto border-2 border-neon animate-ping opacity-20" />
            </div>

            <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-4">
              Camp Created!
            </h1>
            <p className="text-white/60 mb-2">
              <span className="text-neon font-bold">{camp?.name}</span> has been set up successfully.
            </p>
            <p className="text-white/40 text-sm mb-8">
              {curriculum ? 'Curriculum assigned' : 'No curriculum assigned'} • {days.length} days scheduled
            </p>

            <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to camps...
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !camp) {
    return (
      <AdminLayout userRole={role || 'licensee_owner'} userName={userName}>
        <div className="mb-6">
          <Link
            href="/portal/camps"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Camps
          </Link>
        </div>
        <ContentCard>
          <div className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Error Loading Camp</h3>
            <p className="text-white/50 mb-6">{error || 'Camp not found'}</p>
            <button
              onClick={loadCampData}
              className="inline-flex items-center gap-2 px-6 py-3 bg-magenta text-white font-bold uppercase tracking-wider hover:bg-magenta/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </ContentCard>
      </AdminLayout>
    )
  }

  const selectedDay = days.find(d => d.id === selectedDayId)

  return (
    <AdminLayout userRole={role || 'licensee_owner'} userName={userName}>
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/portal/camps/new"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-neon transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Step 1
        </Link>
        <span className="text-sm text-white/40">
          Editing: <span className="text-white">{camp.name}</span>
        </span>
      </div>

      <PageHeader
        title="Curriculum & Schedule"
        description="Assign a curriculum template and build the daily schedule"
      />

      {/* Wizard Stepper */}
      <CampCreateStepper steps={getStepsForCurrentStep(2)} currentStep={2} />

      {/* Success Banner */}
      {success && (
        <div className="mb-6 p-4 bg-neon/10 border border-neon/30 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="h-5 w-5 text-neon flex-shrink-0" />
          <p className="text-neon font-medium">{success}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section A: Curriculum */}
          <ContentCard title="Curriculum Template" accent="purple">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-purple" />
              <p className="text-sm text-white/60">
                Choose a curriculum template that defines the skills and activities for each day.
              </p>
            </div>

            <CampCurriculumSelector
              campId={campId}
              campSport={camp.sport}
              currentAssignment={curriculum}
              onAssigned={handleCurriculumAssigned}
              canEdit={canEdit}
            />
          </ContentCard>

          {/* Section B: Schedule Builder */}
          <ContentCard title="Daily Schedule" accent="neon">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-neon" />
              <p className="text-sm text-white/60">
                Build the hour-by-hour schedule for each camp day.
              </p>
            </div>

            {/* Day Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setSelectedDayId(day.id)}
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    selectedDayId === day.id
                      ? 'bg-neon text-dark-200'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Day {day.day_number}
                  {day.actual_date && (
                    <span className="ml-2 text-xs opacity-70">
                      {new Date(day.actual_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Schedule Builder for Selected Day */}
            {selectedDay ? (
              <CampScheduleBuilder
                campId={campId}
                day={selectedDay}
                curriculumTemplateId={curriculum?.template_id}
                defaultStartTime={camp.start_time || '09:00'}
                defaultEndTime={camp.end_time || '15:00'}
                onUpdated={handleDaysUpdated}
                canEdit={canEdit}
              />
            ) : (
              <div className="py-8 text-center text-white/40">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No days available. Check camp dates.</p>
              </div>
            )}
          </ContentCard>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Camp Summary */}
            <ContentCard title="Camp Summary" accent="magenta">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Name</p>
                  <p className="text-white font-medium">{camp.name}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Dates</p>
                  <p className="text-white">
                    {new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Daily Hours</p>
                  <p className="text-white">{camp.start_time || '9:00 AM'} - {camp.end_time || '3:00 PM'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Days</p>
                  <p className="text-white">{days.length} days</p>
                </div>
                {camp.sport && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Sport</p>
                    <p className="text-white">{camp.sport}</p>
                  </div>
                )}
              </div>
            </ContentCard>

            {/* Curriculum Status */}
            <ContentCard
              title="Curriculum Status"
              accent={curriculum ? 'neon' : undefined}
            >
              {curriculum?.template ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-neon">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-bold">Assigned</span>
                  </div>
                  <p className="text-white font-medium">{curriculum.template.name}</p>
                  <p className="text-sm text-white/50">
                    {curriculum.template.total_days} days • Ages {curriculum.template.age_min}-{curriculum.template.age_max}
                  </p>
                  <Link
                    href={`/admin/curriculum/templates/${curriculum.template_id}`}
                    className="inline-flex items-center gap-1 text-sm text-purple hover:text-purple/80"
                  >
                    View template details
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-bold">Not Assigned</span>
                  </div>
                  <p className="text-sm text-white/50">
                    Assign a curriculum template to define the skills and activities for this camp.
                  </p>
                </div>
              )}
            </ContentCard>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleFinish}
                className="flex items-center justify-center gap-2 w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors"
              >
                Finish Setup
                <CheckCircle className="h-5 w-5" />
              </button>

              <Link
                href={`/portal/camps/${campId}`}
                className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 text-white/60 font-bold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors"
              >
                Skip for Now
              </Link>
            </div>

            {/* Help */}
            <div className="p-4 bg-black/30 border border-white/10">
              <h4 className="font-bold text-white mb-2">Building Your Schedule</h4>
              <ul className="text-sm text-white/60 space-y-2">
                <li>1. Assign a curriculum template (optional)</li>
                <li>2. Use a schedule template or build from scratch</li>
                <li>3. Add time blocks for each activity</li>
                <li>4. Link curriculum blocks to time slots</li>
                <li>5. Adjust times and locations as needed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
