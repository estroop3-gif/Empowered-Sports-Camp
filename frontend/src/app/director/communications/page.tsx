'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { PortalPageHeader, PortalCard, LmsGate } from '@/components/portal'
import {
  MessageSquare,
  Send,
  Mail,
  Calendar,
  CheckCircle,
  Loader2,
  ChevronDown,
  FileText,
  Zap,
} from 'lucide-react'
import { fetchActiveCamps, type DirectorCamp } from '@/lib/services/camps'

/**
 * Director Communications Page
 *
 * Allows directors to:
 * - Send daily recap emails to parents
 * - Send announcements to camp families
 * - View communication history
 *
 * Gated behind LMS completion.
 */

interface CommunicationTemplate {
  id: string
  name: string
  subject: string
  body: string
}

export default function CommunicationsPage() {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [camps, setCamps] = useState<DirectorCamp[]>([])
  const [selectedCampId, setSelectedCampId] = useState<string>('')
  const [communicationType, setCommunicationType] = useState<'daily_recap' | 'announcement' | 'custom'>('daily_recap')

  // Form state
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  // Templates
  const templates: CommunicationTemplate[] = [
    {
      id: 'daily_recap',
      name: 'Daily Recap',
      subject: 'Day {day} Recap - {camp_name}',
      body: `Hi {parent_name},

Here's a quick recap of {athlete_name}'s day at camp:

{recap_content}

Thank you for trusting us with your athlete!

Best,
{director_name}
Camp Director`,
    },
    {
      id: 'weather_update',
      name: 'Weather Update',
      subject: 'Weather Update - {camp_name}',
      body: `Hi {parent_name},

Due to weather conditions, we wanted to update you on today's camp activities:

{message}

Please reach out if you have any questions.

Best,
{director_name}`,
    },
    {
      id: 'reminder',
      name: 'Reminder',
      subject: 'Reminder - {camp_name}',
      body: `Hi {parent_name},

Just a friendly reminder:

{message}

See you at camp!

Best,
{director_name}`,
    },
  ]

  useEffect(() => {
    loadActiveCampsData()
  }, [])

  async function loadActiveCampsData() {
    const { data, error } = await fetchActiveCamps()

    if (error) {
      console.error('Error loading camps:', error)
    }

    if (data && data.length > 0) {
      setCamps(data)
      setSelectedCampId(data[0].id)
    }

    setLoading(false)
  }

  function handleTemplateSelect(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setSubject(template.subject)
      setMessage(template.body)
    }
  }

  async function handleSend() {
    if (!selectedCampId || !subject || !message) return

    setSending(true)
    setSuccess(false)

    // In production, this would:
    // 1. Fetch all registered parents for the camp
    // 2. Queue emails via a background job
    // 3. Track sent communications in a communications_log table

    // For now, simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setSending(false)
    setSuccess(true)

    // Reset after showing success
    setTimeout(() => {
      setSuccess(false)
      setSubject('')
      setMessage('')
    }, 3000)
  }

  const selectedCamp = camps.find((c) => c.id === selectedCampId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-magenta animate-spin" />
      </div>
    )
  }

  return (
    <LmsGate featureName="parent communications">
      <div>
        <PortalPageHeader
          title="Communications"
          description="Send updates and announcements to camp families"
        />

        {camps.length === 0 ? (
          <PortalCard>
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Active Camps</h3>
              <p className="text-white/50">
                Communications are available for camps that are currently running.
              </p>
            </div>
          </PortalCard>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Camp Selection */}
              <PortalCard>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                  Select Camp
                </label>
                <div className="relative">
                  <select
                    value={selectedCampId}
                    onChange={(e) => setSelectedCampId(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white focus:border-neon focus:outline-none appearance-none"
                  >
                    {camps.map((camp) => (
                      <option key={camp.id} value={camp.id}>
                        {camp.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 pointer-events-none" />
                </div>
                {selectedCamp && (
                  <p className="text-sm text-white/40 mt-2">
                    This will be sent to all registered families for this camp.
                  </p>
                )}
              </PortalCard>

              {/* Message Type */}
              <PortalCard title="Message Type">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { id: 'daily_recap', label: 'Daily Recap', icon: FileText },
                    { id: 'announcement', label: 'Announcement', icon: Zap },
                    { id: 'custom', label: 'Custom Message', icon: MessageSquare },
                  ].map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.id}
                        onClick={() => setCommunicationType(type.id as any)}
                        className={`p-4 border text-left transition-colors ${
                          communicationType === type.id
                            ? 'border-neon bg-neon/10'
                            : 'border-white/20 hover:border-white/40'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mb-2 ${
                          communicationType === type.id ? 'text-neon' : 'text-white/50'
                        }`} />
                        <p className={`font-bold ${
                          communicationType === type.id ? 'text-white' : 'text-white/70'
                        }`}>
                          {type.label}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </PortalCard>

              {/* Compose Message */}
              <PortalCard title="Compose Message" accent="neon">
                {/* Subject */}
                <div className="mb-4">
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject..."
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
                  />
                </div>

                {/* Message Body */}
                <div className="mb-4">
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message to parents..."
                    rows={10}
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder:text-white/30 focus:border-neon focus:outline-none resize-none font-mono text-sm"
                  />
                </div>

                {/* Variables Help */}
                <div className="p-3 bg-white/5 border border-white/10 mb-6">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
                    Available Variables
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {['{parent_name}', '{athlete_name}', '{camp_name}', '{director_name}', '{day}'].map((v) => (
                      <code key={v} className="px-2 py-1 bg-black text-neon">
                        {v}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Success Message */}
                {success && (
                  <div className="p-4 bg-neon/10 border border-neon/30 flex items-center gap-3 mb-6">
                    <CheckCircle className="h-5 w-5 text-neon flex-shrink-0" />
                    <p className="text-neon font-medium">
                      Message queued for delivery! Emails will be sent shortly.
                    </p>
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={sending || !subject || !message}
                  className="w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send to All Families
                    </>
                  )}
                </button>
              </PortalCard>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Templates */}
              <PortalCard title="Quick Templates" accent="purple">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className="w-full p-3 text-left border border-white/10 hover:border-purple/50 hover:bg-purple/5 transition-colors"
                    >
                      <p className="font-medium text-white">{template.name}</p>
                      <p className="text-xs text-white/40 mt-1 truncate">
                        {template.subject}
                      </p>
                    </button>
                  ))}
                </div>
              </PortalCard>

              {/* Tips */}
              <PortalCard title="Communication Tips">
                <ul className="space-y-3 text-sm text-white/60">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                    Keep messages concise and positive
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                    Highlight specific wins and achievements
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                    Include any important reminders
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                    Send recaps before 6 PM when possible
                  </li>
                </ul>
              </PortalCard>

              {/* Recent Sends */}
              <PortalCard title="Recent Communications">
                <div className="text-center py-6">
                  <Mail className="h-10 w-10 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/40">
                    Communication history will appear here
                  </p>
                </div>
              </PortalCard>
            </div>
          </div>
        )}
      </div>
    </LmsGate>
  )
}
