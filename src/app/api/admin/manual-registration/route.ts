/**
 * Admin Manual Registration API
 *
 * POST /api/admin/manual-registration
 *
 * Creates a Cognito user, profile, athlete, and confirmed registration
 * for campers registered through external systems (e.g., GoFan).
 * Sends a branded invitation email with temporary credentials.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { prisma } from '@/lib/db/client'
import { adminCreateCognitoUser, adminSetCognitoUserPassword } from '@/lib/auth/cognito-admin'
import { ensureParentRole } from '@/lib/services/users'
import { createRegistration } from '@/lib/services/registrations'
import { sendEmail } from '@/lib/email/resend-client'
import {
  brandWrap,
  emailLabel,
  emailHeading,
  emailParagraph,
  emailButton,
  emailDetailsCard,
  emailCallout,
  APP_URL,
  BRAND,
} from '@/lib/email/brand-layout'

const TEMP_PASSWORD = 'Empowered123!'
const ALLOWED_ROLES = ['hq_admin', 'licensee_owner', 'director']

function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `EA-${code}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = user.role?.toLowerCase() || ''
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      campId,
      parentEmail,
      parentFirstName,
      parentLastName,
      camperFirstName,
      camperLastName,
      camperDob,
      camperGrade,
      shirtSize,
    } = body

    // Validate required fields
    if (!campId || !parentEmail || !parentFirstName || !parentLastName || !camperFirstName || !camperLastName || !camperDob) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Look up camp
    const camp = await prisma.camp.findUnique({
      where: { id: campId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    })

    if (!camp || !camp.tenantId) {
      return NextResponse.json({ error: 'Camp not found' }, { status: 404 })
    }

    // Step 1: Create or find Cognito user
    const { sub, isNew } = await adminCreateCognitoUser(
      parentEmail.toLowerCase().trim(),
      parentFirstName.trim(),
      parentLastName.trim()
    )

    // Set temp password for new users
    if (isNew) {
      await adminSetCognitoUserPassword(parentEmail.toLowerCase().trim(), TEMP_PASSWORD)
    }

    // Step 2: Upsert profile
    await prisma.profile.upsert({
      where: { id: sub },
      create: {
        id: sub,
        email: parentEmail.toLowerCase().trim(),
        firstName: parentFirstName.trim(),
        lastName: parentLastName.trim(),
      },
      update: {
        // Don't overwrite existing profile data for returning users
      },
    })

    // Step 3: Ensure parent role
    await ensureParentRole(sub)

    // Step 4: Create athlete
    const athlete = await prisma.athlete.create({
      data: {
        parentId: sub,
        tenantId: camp.tenantId,
        firstName: camperFirstName.trim(),
        lastName: camperLastName.trim(),
        dateOfBirth: new Date(camperDob),
        grade: camperGrade || null,
        tShirtSize: shirtSize || null,
      },
    })

    // Step 5: Create registration with $0 pricing
    const { data: regData, error: regError } = await createRegistration({
      tenantId: camp.tenantId,
      campId: camp.id,
      athleteId: athlete.id,
      parentId: sub,
      basePriceCents: 0,
      discountCents: 0,
      promoDiscountCents: 0,
      addonsTotalCents: 0,
      shirtSize: shirtSize || null,
    })

    if (regError || !regData) {
      return NextResponse.json(
        { error: regError?.message || 'Failed to create registration' },
        { status: 400 }
      )
    }

    // Step 6: Confirm registration with waived payment
    const confirmationNumber = generateConfirmationNumber()
    await prisma.registration.update({
      where: { id: regData.registrationId },
      data: {
        status: 'confirmed',
        paymentStatus: 'waived',
        confirmationNumber,
      },
    })

    // Step 7: Send invitation email
    const campDates = `${formatDate(camp.startDate)} – ${formatDate(camp.endDate)}`
    const F = `font-family: 'Poppins', Arial, sans-serif;`

    const emailHtml = brandWrap(`
      ${emailLabel('REGISTRATION CONFIRMED')}
      ${emailHeading('Action Needed! Complete Your Registration')}
      ${emailParagraph(`Hi ${parentFirstName},`)}
      ${emailParagraph(`Great news! <strong>${camperFirstName} ${camperLastName}</strong> has been registered for <strong>${camp.name}</strong> through the school system. Your spot is confirmed!`)}
      ${emailParagraph(`We've created your parent portal account so you can manage your camper's registration. Please sign in to complete a few important details.`)}

      ${emailDetailsCard([
        { label: 'Email', value: parentEmail },
        { label: 'Temporary Password', value: TEMP_PASSWORD },
      ], 'YOUR LOGIN CREDENTIALS')}

      ${emailCallout('Please change your password after your first sign-in for security.', 'warning')}

      <table cellpadding="0" cellspacing="0" style="margin: 24px 0; width: 100%;">
        <tr>
          <td style="padding: 16px 20px; background-color: rgba(111,0,216,0.08); border-radius: 6px;">
            <p style="margin: 0 0 12px; color: ${BRAND.neon}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; ${F}">Complete These In Your Dashboard</p>
            <table cellpadding="0" cellspacing="0" style="width: 100%;">
              ${[
                'Add authorized pickup contacts',
                'Set up concession credits',
                'Submit friend grouping requests',
                'Confirm shirt size',
                'Review camp details & schedule',
              ].map(item => `
              <tr>
                <td style="padding: 4px 0; color: ${BRAND.textSecondary}; font-size: 14px; ${F}">
                  <span style="color: ${BRAND.neon}; margin-right: 8px;">✓</span> ${item}
                </td>
              </tr>`).join('')}
            </table>
          </td>
        </tr>
      </table>

      ${emailButton('Sign In Now', APP_URL)}

      ${emailDetailsCard([
        { label: 'Camp', value: camp.name },
        { label: 'Dates', value: campDates },
        { label: 'Camper', value: `${camperFirstName} ${camperLastName}` },
        { label: 'Confirmation #', value: confirmationNumber },
      ], 'CAMP DETAILS')}

      ${emailParagraph(`If you have any questions, please don't hesitate to reach out. We can't wait to see ${camperFirstName} at camp!`)}
    `)

    await sendEmail({
      to: parentEmail.toLowerCase().trim(),
      subject: 'Action Needed! Complete Registration for Empowered Athletes Camp',
      html: emailHtml,
      from: 'Empowered Sports Camp <info@empoweredsportscamp.com>',
    })

    return NextResponse.json({
      data: {
        registrationId: regData.registrationId,
        confirmationNumber,
        isNewCognitoUser: isNew,
      },
    })
  } catch (error) {
    console.error('[ManualRegistration] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    )
  }
}
