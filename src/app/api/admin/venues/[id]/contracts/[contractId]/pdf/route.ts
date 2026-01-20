/**
 * Admin Venue Contract PDF API
 *
 * GET /api/admin/venues/[id]/contracts/[contractId]/pdf - Download contract PDF with terms page
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/auth/server'
import { getContractById } from '@/lib/services/venue-contracts'
import { downloadFile, extractKeyFromUrl } from '@/lib/storage/s3'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getVenueById } from '@/lib/services/venues'

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
    yPosition -= 10
  }

  // Status & Dates
  yPosition -= 20
  page.drawText('Status Information:', {
    x: 50,
    y: yPosition,
    size: 11,
    font: helveticaBold,
  })
  yPosition -= 15

  page.drawText(`Status: ${contract.status.toUpperCase()}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helvetica,
  })
  yPosition -= 14

  if (contract.sent_at) {
    page.drawText(`Sent: ${new Date(contract.sent_at).toLocaleString()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helvetica,
    })
    yPosition -= 14
  }

  if (contract.signed_at) {
    page.drawText(`Signed: ${new Date(contract.signed_at).toLocaleString()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helvetica,
    })
    yPosition -= 14
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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['hq_admin', 'licensee_owner', 'director']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: venueId, contractId } = await params

    const { data: contract, error } = await getContractById({
      id: contractId,
      venue_id: venueId,
      tenant_id: user.role === 'hq_admin' ? undefined : user.tenantId || undefined,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Get venue name
    const { data: venue } = await getVenueById({
      id: venueId,
      tenant_id: user.role === 'hq_admin' ? undefined : user.tenantId || undefined,
    })
    const venueName = venue?.name || 'Unknown Venue'

    // Generate terms summary page
    const termsPageBytes = await generateTermsPage(contract, venueName)

    let finalPdfBytes: Uint8Array

    if (contract.document_url) {
      // If there's an uploaded document, merge the terms page with it
      const key = extractKeyFromUrl(contract.document_url)
      if (!key) {
        return NextResponse.json({ error: 'Invalid document URL' }, { status: 500 })
      }

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

        finalPdfBytes = await mergedPdf.save()
      } catch (downloadError) {
        console.error('Error downloading/merging PDF:', downloadError)
        // Fall back to just the terms page if merge fails
        finalPdfBytes = termsPageBytes
      }
    } else {
      // No uploaded document, just return the terms page
      finalPdfBytes = termsPageBytes
    }

    // Return the PDF as a download
    const filename = `contract-${contract.venue?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'venue'}-${contract.contract_start_date}.pdf`

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/admin/venues/[id]/contracts/[contractId]/pdf error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
