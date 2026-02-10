/**
 * Incentive Email Helper
 *
 * Sends compensation report emails using Resend.
 */

import prisma from '@/lib/db/client'
import { sendEmail, isEmailConfigured, logEmail } from './resend-client'
import { brandWrap, BRAND, emailLabel, emailHeading, emailSubheading, emailParagraph, emailDetailsCard } from './brand-layout'
import type { CompensationSummary } from '@/lib/services/incentives'

// HQ email for licensor notifications
const HQ_OPS_EMAIL = process.env.HQ_OPS_EMAIL || 'ops@empoweredathletes.com'
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production'

interface SendReportResult {
  success: boolean
  sent_to: string[]
}

/**
 * Send compensation report email to licensee and HQ
 */
export async function sendCompensationReportEmail(params: {
  summary: CompensationSummary
  tenantId: string
}): Promise<{ data: SendReportResult | null; error: Error | null }> {
  try {
    const { summary, tenantId } = params

    // Get tenant contact info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        contactEmail: true,
      },
    })

    if (!tenant) {
      return { data: null, error: new Error('Tenant not found') }
    }

    const recipients: string[] = []

    // Add licensee email
    if (tenant.contactEmail) {
      recipients.push(tenant.contactEmail)
    }

    // Add HQ email
    recipients.push(HQ_OPS_EMAIL)

    // Build email content
    const emailHtml = buildCompensationReportHtml(summary, tenant.name)
    const subject = `Compensation Report: ${summary.camp.name} - ${summary.staff.name}`

    // In development without AWS credentials, just log
    if (IS_DEVELOPMENT && !isEmailConfigured()) {
      console.log('[Email] Would send compensation report:', {
        to: recipients,
        cc: summary.staff.email,
        subject,
      })

      return {
        data: {
          success: true,
          sent_to: recipients,
        },
        error: null,
      }
    }

    // Send via Resend
    const result = await sendEmail({
      to: recipients,
      cc: summary.staff.email,
      subject,
      html: emailHtml,
    })

    // Log each recipient
    for (const email of recipients) {
      await logEmail({
        toEmail: email,
        subject,
        emailType: 'system_alert',
        tenantId,
        status: result.success ? 'sent' : 'failed',
        providerMessageId: result.messageId,
        errorMessage: result.error,
      })
    }

    if (!result.success) {
      console.error('[Email] Resend error:', result.error)
      return { data: null, error: new Error(result.error) }
    }

    return {
      data: {
        success: true,
        sent_to: recipients,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Email] Failed to send compensation report:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Build HTML content for compensation report email
 */
function buildCompensationReportHtml(summary: CompensationSummary, tenantName: string): string {
  const { session, staff, camp, plan } = summary

  const formatCurrency = (val: number | null) =>
    val !== null ? `$${val.toFixed(2)}` : '-'

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  const F = `font-family: 'Poppins', Arial, sans-serif;`

  const bonusColor = (val: number | null | undefined) =>
    val && val > 0 ? BRAND.success : BRAND.textMuted

  const bonusRow = (label: string, value: number | null | undefined, detail: string) => `
    <tr>
      <td style="padding: 8px 0; color: ${BRAND.textMuted}; font-size: 14px; ${F} width: 50%;">${label}</td>
      <td style="padding: 8px 0; color: ${bonusColor(value)}; font-size: 14px; font-weight: 600; ${F} text-align: right;">${formatCurrency(value ?? null)}</td>
    </tr>
    <tr>
      <td colspan="2" style="padding: 0 0 8px; color: ${BRAND.textFaint}; font-size: 12px; ${F}">${detail}</td>
    </tr>`

  return brandWrap(`
    ${emailLabel('Compensation Report')}
    ${emailHeading('Compensation<br/><span style="color: ' + BRAND.neon + ';">Report</span>')}

    ${emailDetailsCard([
      { label: 'Camp Name', value: camp.name },
      { label: 'Dates', value: `${formatDate(camp.start_date)} - ${formatDate(camp.end_date)}` },
      { label: 'Licensee', value: tenantName },
    ], 'Camp Details')}

    ${emailDetailsCard([
      { label: 'Name', value: staff.name },
      { label: 'Email', value: staff.email },
      { label: 'Plan', value: plan.name },
    ], 'Staff Member')}

    ${emailSubheading('Fixed Stipend')}
    ${emailDetailsCard([
      { label: 'Pre-Camp Stipend', value: formatCurrency(session.pre_camp_stipend_amount) },
      { label: 'On-Site Stipend', value: formatCurrency(session.on_site_stipend_amount) },
      { label: 'Fixed Total', value: formatCurrency(session.fixed_stipend_total) },
    ])}

    ${emailSubheading('Variable Bonuses')}
    <table cellpadding="0" cellspacing="0" style="margin: 8px 0 24px; width: 100%; border-radius: 6px; overflow: hidden;">
      <tr>
        <td style="background-color: rgba(204,255,0,0.04); border: 1px solid rgba(204,255,0,0.12); border-radius: 6px; padding: 20px 24px;">
          <table cellpadding="0" cellspacing="0" style="width: 100%;">
            ${bonusRow('Enrollment Bonus', session.enrollment_bonus_earned, `${session.total_enrolled_campers || 0} campers enrolled${session.enrollment_threshold ? ` (threshold: ${session.enrollment_threshold})` : ''}`)}
            ${bonusRow('CSAT Bonus', session.csat_bonus_earned, `Score: ${session.csat_avg_score?.toFixed(2) || '-'}${session.csat_required_score ? ` (required: ${session.csat_required_score})` : ''}`)}
            ${bonusRow('Budget Efficiency', session.budget_efficiency_bonus_earned, `Savings: ${formatCurrency(session.budget_savings_amount)}${session.budget_efficiency_rate ? ` @ ${(session.budget_efficiency_rate * 100).toFixed(0)}%` : ''}`)}
            ${bonusRow('Guest Speaker', session.guest_speaker_bonus_earned, `${session.guest_speaker_count || 0} speakers${session.guest_speaker_required_count ? ` (required: ${session.guest_speaker_required_count})` : ''}`)}
            <tr>
              <td colspan="2" style="height: 1px; background: ${BRAND.borderSubtle}; margin: 8px 0;"></td>
            </tr>
            <tr>
              <td style="padding: 12px 0 0; color: ${BRAND.textPrimary}; font-size: 14px; font-weight: 700; ${F}">Total Variable Bonus</td>
              <td style="padding: 12px 0 0; color: ${BRAND.textPrimary}; font-size: 14px; font-weight: 700; ${F} text-align: right;">${formatCurrency(session.total_variable_bonus)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Total Compensation -->
    <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px; width: 100%;">
      <tr>
        <td align="center" style="background-color: ${BRAND.neon}; padding: 20px 24px; border-radius: 6px;">
          <p style="margin: 0 0 4px; color: #000000; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; ${F}">Total Compensation</p>
          <p style="margin: 0; color: #000000; font-size: 32px; font-weight: 800; ${F}">${formatCurrency(session.total_compensation)}</p>
        </td>
      </tr>
    </table>

    <p style="margin: 0; color: ${BRAND.textFaint}; font-size: 12px; text-align: center; ${F}">Report generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  `)
}
