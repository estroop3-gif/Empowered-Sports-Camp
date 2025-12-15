/**
 * Admin Email Templates API
 *
 * GET /api/admin/email-templates - List all templates
 * POST /api/admin/email-templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAuthUser } from '@/lib/auth/server'
import { EmailType } from '@/generated/prisma'
import { invalidateTemplateCache } from '@/lib/services/email'

// Default template configurations
const DEFAULT_TEMPLATES: {
  emailType: EmailType
  name: string
  description: string
  availableVars: string[]
  defaultSubject: string
}[] = [
  {
    emailType: 'registration_confirmation',
    name: 'Registration Confirmation',
    description: 'Sent after successful payment to confirm camp registration',
    availableVars: ['parentName', 'athleteName', 'campName', 'campDates', 'campLocation', 'campTime', 'totalPaid'],
    defaultSubject: "You're Registered! {{athleteName}} is Going to {{campName}}",
  },
  {
    emailType: 'camp_two_weeks_out',
    name: '2 Weeks Out Reminder',
    description: 'Sent 2 weeks before camp starts with preparation tips',
    availableVars: ['parentName', 'athleteName', 'campName', 'campDates', 'campLocation', 'daysUntilCamp'],
    defaultSubject: "2 Weeks Until {{campName}}! Let's Get Ready",
  },
  {
    emailType: 'camp_two_days_before',
    name: '2 Days Before Reminder',
    description: 'Sent 2 days before camp with final checklist',
    availableVars: ['parentName', 'athleteName', 'campName', 'campDates', 'campLocation', 'campTime', 'checkInInfo'],
    defaultSubject: "{{campName}} Starts in 2 Days! Here's Your Checklist",
  },
  {
    emailType: 'camp_daily_recap',
    name: 'Daily Recap',
    description: 'Sent at end of each camp day with highlights',
    availableVars: ['parentName', 'athleteName', 'campName', 'dayNumber', 'dayTheme', 'wordOfTheDay', 'primarySport', 'secondarySport', 'guestSpeaker', 'tomorrowPreview'],
    defaultSubject: 'Day {{dayNumber}} Recap: {{athleteName}} at {{campName}}',
  },
  {
    emailType: 'camp_session_recap',
    name: 'Session Recap',
    description: 'Sent after camp week ends with full summary',
    availableVars: ['parentName', 'athleteName', 'campName', 'campDates', 'totalDays', 'sportsLearned', 'feedbackUrl'],
    defaultSubject: "What an Amazing Week! {{athleteName}}'s {{campName}} Journey",
  },
  {
    emailType: 'season_followup_jan',
    name: 'January Follow-up',
    description: 'New year re-engagement campaign',
    availableVars: ['parentName', 'year', 'registrationUrl', 'earlyBirdCode'],
    defaultSubject: 'New Year, New Goals - Camp Registration Opens Soon!',
  },
  {
    emailType: 'season_followup_feb',
    name: 'February Follow-up',
    description: "Valentine's Day themed sibling referral",
    availableVars: ['parentName', 'year', 'registrationUrl', 'referralCode'],
    defaultSubject: 'Share the Love - Bring a Friend to Camp!',
  },
  {
    emailType: 'season_followup_mar',
    name: 'March Follow-up',
    description: 'Spring training / early bird deadline',
    availableVars: ['parentName', 'year', 'registrationUrl', 'earlyBirdDeadline', 'earlyBirdCode'],
    defaultSubject: 'Spring Training Starts Here - Early Bird Deadline Approaching!',
  },
  {
    emailType: 'season_followup_apr',
    name: 'April Follow-up',
    description: 'Earth day / outdoor camp highlights',
    availableVars: ['parentName', 'year', 'registrationUrl', 'campHighlights'],
    defaultSubject: 'Get Outside This Summer - Camp Spots Filling Up!',
  },
  {
    emailType: 'season_followup_may',
    name: 'May Follow-up',
    description: 'Final countdown / last chance to register',
    availableVars: ['parentName', 'year', 'registrationUrl', 'spotsRemaining'],
    defaultSubject: 'Last Chance! Summer Camp Registration Closes Soon',
  },
]

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    // Only admin roles can view email templates
    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      console.log('[API] Email templates - User role not allowed:', user.role)
      return NextResponse.json({ error: `Forbidden - Role '${user.role}' cannot access email templates.` }, { status: 403 })
    }

    // Fetch templates from database (if any exist)
    let templates: any[] = []
    try {
      templates = await prisma.emailTemplate.findMany({
        orderBy: [{ emailType: 'asc' }],
        include: {
          tenant: {
            select: { name: true },
          },
        },
      })
    } catch (dbError) {
      // Table might not exist yet or other DB issue - continue with defaults
      console.log('[API] Email templates - DB query failed, using defaults only:', dbError)
    }

    // Return templates with default configs merged in
    const templatesWithDefaults = DEFAULT_TEMPLATES.map(defaultTemplate => {
      const existingTemplate = templates.find(t => t.emailType === defaultTemplate.emailType)
      return {
        ...defaultTemplate,
        id: existingTemplate?.id || null,
        subject: existingTemplate?.subject || defaultTemplate.defaultSubject,
        bodyHtml: existingTemplate?.bodyHtml || null,
        bodyText: existingTemplate?.bodyText || null,
        isActive: existingTemplate?.isActive ?? true,
        tenantId: existingTemplate?.tenantId || null,
        tenantName: existingTemplate?.tenant?.name || null,
        isCustomized: !!existingTemplate,
        updatedAt: existingTemplate?.updatedAt?.toISOString() || null,
      }
    })

    return NextResponse.json({ data: templatesWithDefaults })
  } catch (error) {
    console.error('[API] Email templates error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden - HQ admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { emailType, name, subject, bodyHtml, bodyText, description, availableVars, tenantId } = body

    if (!emailType || !name || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: 'emailType, name, subject, and bodyHtml are required' },
        { status: 400 }
      )
    }

    const template = await prisma.emailTemplate.create({
      data: {
        emailType,
        name,
        subject,
        bodyHtml,
        bodyText,
        description,
        availableVars: availableVars || [],
        tenantId: tenantId || null,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    // Invalidate cache so new template is used
    invalidateTemplateCache()

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('[API] Create email template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
