/**
 * Admin Venue Contract Send API
 *
 * POST /api/admin/venues/[id]/contracts/[contractId]/send - Email contract to venue contact
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import { getContractById, markContractAsSent } from '@/lib/services/venue-contracts'
import { getVenueById } from '@/lib/services/venues'
import { sendEmail, logEmail } from '@/lib/email/resend-client'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { downloadFile, extractKeyFromUrl, uploadFile } from '@/lib/storage/s3'

interface RouteParams {
  params: Promise<{ id: string; contractId: string }>
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)

  return lines
}

async function generateTermsPage(
  contract: NonNullable<Awaited<ReturnType<typeof getContractById>>['data']>,
  venueName: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const { height } = page.getSize()

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let yPosition = height - 50

  // Header
  page.drawText('CONTRACT TERMS SUMMARY', {
    x: 50,
    y: yPosition,
    size: 18,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  yPosition -= 30

  // Venue Name
  page.drawText(`Venue: ${venueName}`, {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  })
  yPosition -= 25

  // Contract Period
  page.drawText('Contract Period:', {
    x: 50,
    y: yPosition,
    size: 11,
    font: helveticaBold,
  })
  page.drawText(
    `${formatDate(contract.contract_start_date)} - ${formatDate(contract.contract_end_date)}`,
    {
      x: 160,
      y: yPosition,
      size: 11,
      font: helvetica,
    }
  )
  yPosition -= 20

  // Rental Rate
  page.drawText('Rental Rate:', {
    x: 50,
    y: yPosition,
    size: 11,
    font: helveticaBold,
  })
  page.drawText(formatCurrency(contract.rental_rate_cents), {
    x: 160,
    y: yPosition,
    size: 11,
    font: helvetica,
  })
  yPosition -= 20

  // Deposit
  if (contract.deposit_cents) {
    page.drawText('Deposit:', {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
    })
    page.drawText(formatCurrency(contract.deposit_cents), {
      x: 160,
      y: yPosition,
      size: 11,
      font: helvetica,
    })
    yPosition -= 20
  }

  // Payment Due Date
  if (contract.payment_due_date) {
    page.drawText('Payment Due:', {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
    })
    page.drawText(formatDate(contract.payment_due_date), {
      x: 160,
      y: yPosition,
      size: 11,
      font: helvetica,
    })
    yPosition -= 20
  }

  // Setup/Cleanup Times
  if (contract.setup_time_minutes || contract.cleanup_time_minutes) {
    page.drawText('Setup Time:', {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
    })
    page.drawText(`${contract.setup_time_minutes || 0} minutes`, {
      x: 160,
      y: yPosition,
      size: 11,
      font: helvetica,
    })
    yPosition -= 20

    page.drawText('Cleanup Time:', {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
    })
    page.drawText(`${contract.cleanup_time_minutes || 0} minutes`, {
      x: 160,
      y: yPosition,
      size: 11,
      font: helvetica,
    })
    yPosition -= 20
  }

  yPosition -= 10

  // Insurance Requirements
  if (contract.insurance_requirements) {
    page.drawText('Insurance Requirements:', {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
    })
    yPosition -= 15

    const insuranceLines = wrapText(contract.insurance_requirements, 80)
    for (const line of insuranceLines) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
      })
      yPosition -= 14
    }
    yPosition -= 10
  }

  // Cancellation Policy
  if (contract.cancellation_policy) {
    page.drawText('Cancellation Policy:', {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
    })
    yPosition -= 15

    const policyLines = wrapText(contract.cancellation_policy, 80)
    for (const line of policyLines) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
      })
      yPosition -= 14
    }
    yPosition -= 10
  }

  // Special Conditions
  if (contract.special_conditions) {
    page.drawText('Special Conditions:', {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
    })
    yPosition -= 15

    const conditionLines = wrapText(contract.special_conditions, 80)
    for (const line of conditionLines) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helvetica,
      })
      yPosition -= 14
    }
  }

  // Footer
  page.drawText(`Generated: ${new Date().toLocaleString()}`, {
    x: 50,
    y: 30,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })

  return pdfDoc.save()
}

async function generateMergedPdf(
  contract: NonNullable<Awaited<ReturnType<typeof getContractById>>['data']>,
  venueName: string
): Promise<Uint8Array> {
  // Generate terms summary page
  const termsPageBytes = await generateTermsPage(contract, venueName)

  if (contract.document_url) {
    // If there's an uploaded document, merge the terms page with it
    const key = extractKeyFromUrl(contract.document_url)
    if (key) {
      try {
        // Download the original PDF
        const originalPdfBuffer = await downloadFile(key)

        // Load both PDFs
        const termsPdf = await PDFDocument.load(termsPageBytes)
        const originalPdf = await PDFDocument.load(originalPdfBuffer)

        // Create merged PDF with terms page first
        const mergedPdf = await PDFDocument.create()

        // Copy terms page
        const termsPages = await mergedPdf.copyPages(termsPdf, termsPdf.getPageIndices())
        for (const page of termsPages) {
          mergedPdf.addPage(page)
        }

        // Copy original PDF pages
        const originalPages = await mergedPdf.copyPages(originalPdf, originalPdf.getPageIndices())
        for (const page of originalPages) {
          mergedPdf.addPage(page)
        }

        return mergedPdf.save()
      } catch (downloadError) {
        console.error('Error downloading/merging PDF:', downloadError)
        // Fall back to just the terms page if merge fails
        return termsPageBytes
      }
    }
  }

  // No uploaded document, just return the terms page
  return termsPageBytes
}

function buildContractEmailHtml(params: {
  venueName: string
  contactName: string
  contractStartDate: string
  contractEndDate: string
  rentalRate: string
  pdfUrl: string
}): string {
  const { venueName, contactName, contractStartDate, contractEndDate, rentalRate, pdfUrl } = params

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Venue Contract - Empowered Sports Camp</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #ffffff; padding: 30px 40px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
        .header .tagline { color: #00ff88; font-size: 12px; letter-spacing: 2px; margin-top: 8px; text-transform: uppercase; }
        .content { padding: 40px; color: #333333; line-height: 1.6; }
        .content h2 { color: #000000; margin-top: 0; font-size: 22px; }
        .content p { margin: 16px 0; }
        .highlight { background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%); color: #000000; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center; }
        .highlight strong { font-size: 18px; }
        .button { display: inline-block; background: #00ff88; color: #000000 !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .details { background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 24px 0; }
        .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eeeeee; }
        .details-row:last-child { border-bottom: none; }
        .details-label { color: #666666; font-weight: 500; }
        .details-value { color: #000000; font-weight: 600; text-align: right; }
        .footer { background: #1a1a1a; color: #888888; padding: 30px 40px; text-align: center; font-size: 12px; }
        .footer a { color: #00ff88; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EMPOWERED SPORTS CAMP</h1>
          <div class="tagline">Building Champions On & Off The Field</div>
        </div>
        <div class="content">
          <h2>Venue Contract</h2>
          <p>Dear ${contactName},</p>
          <p>Please find attached the venue rental contract for <strong>${venueName}</strong>. We are excited about the opportunity to partner with your facility for our upcoming camp sessions.</p>

          <div class="details">
            <div class="details-row"><span class="details-label">Venue</span><span class="details-value">${venueName}</span></div>
            <div class="details-row"><span class="details-label">Contract Period</span><span class="details-value">${contractStartDate} - ${contractEndDate}</span></div>
            <div class="details-row"><span class="details-label">Rental Rate</span><span class="details-value">${rentalRate}</span></div>
          </div>

          <p>Please review the attached contract document, which includes the complete terms summary and any attached documents. If you have any questions or need clarification on any terms, please don't hesitate to reach out.</p>

          <p style="text-align: center;">
            <a href="${pdfUrl}" class="button">Download Contract PDF</a>
          </p>

          <p>Once you've reviewed the contract, please sign and return a copy to confirm the booking.</p>

          <p>Thank you for your partnership!</p>

          <p>Best regards,<br/>
          <strong>Empowered Sports Camp Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Empowered Sports Camp. All rights reserved.</p>
          <p>
            <a href="https://empoweredsportscamp.com">Website</a> |
            <a href="https://empoweredsportscamp.com/privacy">Privacy Policy</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: venueId, contractId } = await params
    const body = await request.json().catch(() => ({}))

    const tenantId = user.role === 'hq_admin' ? undefined : user.tenantId || undefined

    // Get the contract
    const { data: contract, error: contractError } = await getContractById({
      id: contractId,
      venue_id: venueId,
      tenant_id: tenantId,
    })

    if (contractError) {
      return NextResponse.json({ error: contractError.message }, { status: 500 })
    }

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Get venue details
    const { data: venue } = await getVenueById({
      id: venueId,
      tenant_id: tenantId,
    })

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Determine recipient email
    const recipientEmail = body.email || venue.primary_contact_email
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No email address provided and venue has no contact email' },
        { status: 400 }
      )
    }

    const contactName = venue.primary_contact_name || 'Venue Contact'
    const venueName = venue.name

    // Generate the merged PDF
    const pdfBytes = await generateMergedPdf(contract, venueName)

    // Upload PDF to S3
    const timestamp = Date.now()
    const safeVenueName = venueName.replace(/[^a-zA-Z0-9]/g, '-')
    const pdfFilename = `${safeVenueName}-contract.pdf`

    let pdfUrl: string
    try {
      const fileInfo = await uploadFile(
        Buffer.from(pdfBytes),
        pdfFilename,
        {
          contentType: 'application/pdf',
          folder: `documents/contracts/${venueId}`,
        }
      )
      pdfUrl = fileInfo.url
    } catch (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      return NextResponse.json({ error: 'Failed to upload contract PDF' }, { status: 500 })
    }

    // Build email content
    const emailHtml = buildContractEmailHtml({
      venueName,
      contactName,
      contractStartDate: formatDate(contract.contract_start_date),
      contractEndDate: formatDate(contract.contract_end_date),
      rentalRate: formatCurrency(contract.rental_rate_cents),
      pdfUrl,
    })

    // Send email via Resend
    const emailSubject = `Venue Contract - ${venueName} - Empowered Sports Camp`
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
    })

    await logEmail({
      toEmail: recipientEmail,
      subject: emailSubject,
      emailType: 'system_alert',
      status: emailResult.success ? 'sent' : 'failed',
      providerMessageId: emailResult.messageId,
      errorMessage: emailResult.error,
    })

    if (!emailResult.success) {
      console.error('Error sending email:', emailResult.error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Mark contract as sent
    const { data: updatedContract, error: updateError } = await markContractAsSent({
      id: contractId,
      venue_id: venueId,
      tenant_id: tenantId,
      sent_to_email: recipientEmail,
    })

    if (updateError) {
      console.error('Error updating contract status:', updateError)
      // Don't fail the request - email was sent successfully
    }

    return NextResponse.json({
      success: true,
      data: updatedContract || contract,
      message: `Contract sent to ${recipientEmail}`,
      pdfUrl,
    })
  } catch (error) {
    console.error('[API] POST /api/admin/venues/[id]/contracts/[contractId]/send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
