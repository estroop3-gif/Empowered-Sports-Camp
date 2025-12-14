'use client'

import { useState } from 'react'
import { PortalPageHeader, PortalCard } from '@/components/portal'
import {
  Users,
  FileText,
  Download,
  ExternalLink,
  Clock,
  Target,
  MessageSquare,
  CheckCircle,
  BookOpen,
  Lightbulb,
} from 'lucide-react'

/**
 * Volunteer Guest Speakers Page
 *
 * Resources and curriculum for guest speaker sessions.
 * Includes guides, templates, and talking points.
 */

interface Resource {
  id: string
  title: string
  description: string
  type: 'guide' | 'template' | 'video' | 'external'
  url?: string
  duration?: string
}

interface Topic {
  id: string
  title: string
  description: string
  talkingPoints: string[]
  suggestedDuration: string
  ageGroups: string
}

export default function GuestSpeakersPage() {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)

  // Guest speaker resources
  const resources: Resource[] = [
    {
      id: '1',
      title: 'Guest Speaker Guide',
      description: 'Complete guide to presenting at Empowered Sports Camp',
      type: 'guide',
    },
    {
      id: '2',
      title: 'Presentation Template',
      description: 'PowerPoint/Google Slides template with camp branding',
      type: 'template',
    },
    {
      id: '3',
      title: 'Engagement Techniques',
      description: 'Tips for keeping young athletes engaged during your talk',
      type: 'guide',
    },
    {
      id: '4',
      title: 'Sample Presentation Video',
      description: 'Watch an example of an effective guest speaker session',
      type: 'video',
      duration: '15 min',
    },
  ]

  // Guest speaker topics/curriculum
  const topics: Topic[] = [
    {
      id: '1',
      title: 'Goal Setting & Dreams',
      description: 'Help athletes identify and pursue their personal goals',
      suggestedDuration: '15-20 min',
      ageGroups: 'All ages',
      talkingPoints: [
        'Share your own journey and goals you\'ve achieved',
        'Explain the difference between short-term and long-term goals',
        'Interactive activity: Have athletes write down one goal',
        'Discuss steps to achieve goals (small wins)',
        'Encourage them to share goals with someone who can help',
      ],
    },
    {
      id: '2',
      title: 'Overcoming Challenges',
      description: 'Stories and strategies for facing obstacles',
      suggestedDuration: '15-20 min',
      ageGroups: 'Ages 8+',
      talkingPoints: [
        'Share a personal challenge you\'ve overcome',
        'Normalize failure as part of growth',
        'Discuss the "growth mindset" concept',
        'Interactive: Ask athletes about challenges they\'ve faced',
        'Provide 2-3 concrete strategies for tough times',
      ],
    },
    {
      id: '3',
      title: 'Teamwork & Leadership',
      description: 'What it means to be a good teammate and leader',
      suggestedDuration: '20-25 min',
      ageGroups: 'All ages',
      talkingPoints: [
        'Define leadership (not just being the captain)',
        'Share examples of great teammates you\'ve had',
        'Discuss how everyone can be a leader',
        'Interactive: Team building activity or discussion',
        'Encourage supporting teammates both on and off the field',
      ],
    },
    {
      id: '4',
      title: 'Confidence & Self-Belief',
      description: 'Building confidence through sports and life',
      suggestedDuration: '15-20 min',
      ageGroups: 'All ages',
      talkingPoints: [
        'Share a time you doubted yourself and overcame it',
        'Discuss "positive self-talk" and its power',
        'Interactive: Affirmation exercise ("I am...")',
        'Connect confidence to preparation and practice',
        'Emphasize that confidence grows with effort',
      ],
    },
    {
      id: '5',
      title: 'Career in Sports',
      description: 'Exploring careers in athletics and sports industry',
      suggestedDuration: '20-25 min',
      ageGroups: 'Ages 10+',
      talkingPoints: [
        'Share your career path and how you got here',
        'Discuss various careers in sports (not just athletes)',
        'Importance of education alongside athletics',
        'Q&A session: Let athletes ask questions',
        'Encourage them to explore their interests',
      ],
    },
  ]

  return (
    <div>
      <PortalPageHeader
        title="Guest Speaker Resources"
        description="Curriculum and guides for guest speaker sessions"
      />

      {/* Overview */}
      <PortalCard className="mb-8" accent="purple">
        <div className="flex items-start gap-4">
          <Users className="h-8 w-8 text-purple flex-shrink-0" />
          <div>
            <h3 className="font-bold text-white mb-2">About Guest Speaker Sessions</h3>
            <p className="text-white/60 text-sm mb-4">
              Guest speakers play a vital role in inspiring our young athletes. Whether you're
              sharing your sports journey, career advice, or life lessons, these resources will
              help you prepare an impactful presentation.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-white/50">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                15-25 minute sessions
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Groups of 10-30 athletes
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Interactive & engaging
              </span>
            </div>
          </div>
        </div>
      </PortalCard>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Topic Curriculum */}
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-neon" />
              Session Topics
            </h2>
            <div className="space-y-4">
              {topics.map((topic) => (
                <PortalCard
                  key={topic.id}
                  className={`cursor-pointer transition-all ${
                    selectedTopic?.id === topic.id
                      ? 'border-neon'
                      : 'hover:border-white/30'
                  }`}
                  onClick={() => setSelectedTopic(selectedTopic?.id === topic.id ? null : topic)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white">{topic.title}</h3>
                      <p className="text-sm text-white/50 mt-1">{topic.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {topic.suggestedDuration}
                        </span>
                        <span>{topic.ageGroups}</span>
                      </div>
                    </div>
                    <Lightbulb className={`h-6 w-6 flex-shrink-0 ${
                      selectedTopic?.id === topic.id ? 'text-neon' : 'text-white/20'
                    }`} />
                  </div>

                  {/* Expanded Content */}
                  {selectedTopic?.id === topic.id && (
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                        Talking Points
                      </p>
                      <ul className="space-y-2">
                        {topic.talkingPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                            <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </PortalCard>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resources */}
          <PortalCard title="Resources & Downloads" accent="orange">
            <div className="space-y-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="p-3 bg-white/5 border border-white/10 hover:border-orange-500/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      {resource.type === 'video' ? (
                        <ExternalLink className="h-5 w-5 text-orange-400" />
                      ) : resource.type === 'external' ? (
                        <ExternalLink className="h-5 w-5 text-orange-400" />
                      ) : (
                        <FileText className="h-5 w-5 text-orange-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">{resource.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{resource.description}</p>
                      {resource.duration && (
                        <p className="text-xs text-orange-400 mt-1">{resource.duration}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/30 mt-4 text-center">
              Downloads coming soon
            </p>
          </PortalCard>

          {/* Tips */}
          <PortalCard title="Quick Tips">
            <ul className="space-y-3 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                Arrive 10 minutes early to set up
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                Use age-appropriate language
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                Include interactive elements
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                Share personal stories
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                Leave time for Q&A
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
                End with an actionable takeaway
              </li>
            </ul>
          </PortalCard>

          {/* Contact */}
          <PortalCard>
            <div className="text-center">
              <MessageSquare className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/50 mb-2">
                Questions about presenting?
              </p>
              <p className="text-sm text-purple">
                Contact your Camp Director
              </p>
            </div>
          </PortalCard>
        </div>
      </div>
    </div>
  )
}
