/**
 * Incentive Email Helper
 *
 * Sends compensation report emails using Resend.
 */

import prisma from '@/lib/db/client'
import { sendEmail, isEmailConfigured, logEmail } from './resend-client'
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compensation Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
    }
    .header {
      background-color: #1a1a1a;
      color: #CCFF00;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .content {
      padding: 24px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #CCFF00;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .info-label {
      color: #666;
    }
    .info-value {
      font-weight: 600;
    }
    .total-row {
      background-color: #1a1a1a;
      color: #CCFF00;
      padding: 16px;
      margin-top: 24px;
    }
    .total-row .label {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .total-row .amount {
      font-size: 28px;
      font-weight: bold;
    }
    .bonus-earned {
      color: #22c55e;
    }
    .bonus-not-earned {
      color: #ef4444;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 16px 24px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Compensation Report</h1>
    </div>

    <div class="content">
      <div class="section">
        <div class="section-title">Camp Details</div>
        <div class="info-row">
          <span class="info-label">Camp Name</span>
          <span class="info-value">${camp.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dates</span>
          <span class="info-value">${formatDate(camp.start_date)} - ${formatDate(camp.end_date)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Licensee</span>
          <span class="info-value">${tenantName}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Staff Member</div>
        <div class="info-row">
          <span class="info-label">Name</span>
          <span class="info-value">${staff.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">${staff.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Compensation Plan</span>
          <span class="info-value">${plan.name}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Fixed Stipend</div>
        <div class="info-row">
          <span class="info-label">Pre-Camp Stipend</span>
          <span class="info-value">${formatCurrency(session.pre_camp_stipend_amount)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">On-Site Stipend</span>
          <span class="info-value">${formatCurrency(session.on_site_stipend_amount)}</span>
        </div>
        <div class="info-row">
          <span class="info-label"><strong>Fixed Stipend Total</strong></span>
          <span class="info-value"><strong>${formatCurrency(session.fixed_stipend_total)}</strong></span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Variable Bonuses</div>

        <div class="info-row">
          <span class="info-label">Enrollment Bonus</span>
          <span class="info-value ${session.enrollment_bonus_earned && session.enrollment_bonus_earned > 0 ? 'bonus-earned' : ''}">
            ${formatCurrency(session.enrollment_bonus_earned)}
          </span>
        </div>
        <div style="font-size: 12px; color: #666; padding: 4px 0 12px;">
          ${session.total_enrolled_campers || 0} campers enrolled
          ${session.enrollment_threshold ? `(threshold: ${session.enrollment_threshold})` : ''}
        </div>

        <div class="info-row">
          <span class="info-label">CSAT Bonus</span>
          <span class="info-value ${session.csat_bonus_earned && session.csat_bonus_earned > 0 ? 'bonus-earned' : ''}">
            ${formatCurrency(session.csat_bonus_earned)}
          </span>
        </div>
        <div style="font-size: 12px; color: #666; padding: 4px 0 12px;">
          Score: ${session.csat_avg_score?.toFixed(2) || '-'}
          ${session.csat_required_score ? `(required: ${session.csat_required_score})` : ''}
        </div>

        <div class="info-row">
          <span class="info-label">Budget Efficiency Bonus</span>
          <span class="info-value ${session.budget_efficiency_bonus_earned && session.budget_efficiency_bonus_earned > 0 ? 'bonus-earned' : ''}">
            ${formatCurrency(session.budget_efficiency_bonus_earned)}
          </span>
        </div>
        <div style="font-size: 12px; color: #666; padding: 4px 0 12px;">
          Savings: ${formatCurrency(session.budget_savings_amount)}
          ${session.budget_efficiency_rate ? ` @ ${(session.budget_efficiency_rate * 100).toFixed(0)}%` : ''}
        </div>

        <div class="info-row">
          <span class="info-label">Guest Speaker Bonus</span>
          <span class="info-value ${session.guest_speaker_bonus_earned && session.guest_speaker_bonus_earned > 0 ? 'bonus-earned' : ''}">
            ${formatCurrency(session.guest_speaker_bonus_earned)}
          </span>
        </div>
        <div style="font-size: 12px; color: #666; padding: 4px 0 12px;">
          ${session.guest_speaker_count || 0} speakers
          ${session.guest_speaker_required_count ? `(required: ${session.guest_speaker_required_count})` : ''}
        </div>

        <div class="info-row" style="border-top: 2px solid #e0e0e0; margin-top: 12px; padding-top: 12px;">
          <span class="info-label"><strong>Total Variable Bonus</strong></span>
          <span class="info-value"><strong>${formatCurrency(session.total_variable_bonus)}</strong></span>
        </div>
      </div>

      <div class="total-row">
        <div class="label">Total Compensation</div>
        <div class="amount">${formatCurrency(session.total_compensation)}</div>
      </div>
    </div>

    <div class="footer">
      <p>This report was generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
      <p>Empowered Sports Camp &bull; empoweredathletes.com</p>
    </div>
  </div>
</body>
</html>
  `
}
