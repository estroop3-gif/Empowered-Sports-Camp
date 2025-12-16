/**
 * Test Emails API
 *
 * POST /api/test-emails - Send test emails to a specified address
 * Requires HQ Admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import { sendRoleInviteEmail } from '@/lib/email/role-invites'
import {
  sendLicenseeApplicationEmail,
  sendLicenseeWelcomeEmail,
  sendCitApplicantConfirmationEmail,
  sendCitAdminNotificationEmail,
} from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    // Only HQ admins can send test emails
    if (user.role?.toLowerCase() !== 'hq_admin') {
      return NextResponse.json({ data: null, error: 'Forbidden - HQ Admin required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, emailType } = body

    if (!email) {
      return NextResponse.json({ data: null, error: 'Email address required' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'https://empoweredsportscamp.com'
    const results: { type: string; success: boolean; error?: string }[] = []

    // Send all email types or specific type
    const typesToSend = emailType ? [emailType] : ['role_invite_licensee', 'role_invite_director', 'role_invite_coach', 'role_invite_cit', 'licensee_application', 'licensee_welcome', 'cit_applicant', 'cit_admin']

    for (const type of typesToSend) {
      let result

      switch (type) {
        case 'role_invite_licensee':
          result = await sendRoleInviteEmail({
            to: email,
            firstName: 'Test',
            lastName: 'User',
            targetRole: 'licensee_owner',
            inviterName: 'Empowered Sports Camp HQ',
            inviteUrl: `${baseUrl}/join?token=test-token-123`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          results.push({ type: 'Role Invite - Licensee Owner', success: result.success, error: result.error })
          break

        case 'role_invite_director':
          result = await sendRoleInviteEmail({
            to: email,
            firstName: 'Test',
            lastName: 'User',
            targetRole: 'director',
            inviterName: 'Test Licensee',
            inviteUrl: `${baseUrl}/join?token=test-token-456`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          results.push({ type: 'Role Invite - Director', success: result.success, error: result.error })
          break

        case 'role_invite_coach':
          result = await sendRoleInviteEmail({
            to: email,
            firstName: 'Test',
            lastName: 'User',
            targetRole: 'coach',
            inviterName: 'Test Director',
            inviteUrl: `${baseUrl}/join?token=test-token-789`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          results.push({ type: 'Role Invite - Coach', success: result.success, error: result.error })
          break

        case 'role_invite_cit':
          result = await sendRoleInviteEmail({
            to: email,
            firstName: 'Test',
            lastName: 'User',
            targetRole: 'cit_volunteer',
            inviterName: 'Test Director',
            inviteUrl: `${baseUrl}/join?token=test-token-abc`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          results.push({ type: 'Role Invite - CIT Volunteer', success: result.success, error: result.error })
          break

        case 'licensee_application':
          result = await sendLicenseeApplicationEmail({
            to: email,
            subject: 'Complete Your Licensee Application - Test Territory',
            firstName: 'Test',
            lastName: 'User',
            territoryName: 'Test Territory',
            applicationUrl: `${baseUrl}/apply/licensee?token=test-token`,
          })
          results.push({ type: 'Licensee Application', success: result.success, error: result.error })
          break

        case 'licensee_welcome':
          result = await sendLicenseeWelcomeEmail({
            to: email,
            subject: 'Welcome to Empowered Sports Camp - Test Territory',
            firstName: 'Test',
            territoryName: 'Test Territory',
            loginUrl: `${baseUrl}/portal`,
          })
          results.push({ type: 'Licensee Welcome', success: result.success, error: result.error })
          break

        case 'cit_applicant':
          result = await sendCitApplicantConfirmationEmail({
            to: email,
            applicantName: 'Test User',
          })
          results.push({ type: 'CIT Applicant Confirmation', success: result.success, error: result.error })
          break

        case 'cit_admin':
          result = await sendCitAdminNotificationEmail({
            application: {
              firstName: 'Test',
              lastName: 'User',
              email: email,
              phone: '555-555-5555',
              schoolName: 'Test High School',
              gradeLevel: '11th Grade',
              sportsPlayed: 'Basketball, Soccer',
              whyCit: 'I want to help young athletes develop confidence and skills through sports.',
              parentName: 'Parent User',
              parentEmail: email,
            },
          })
          results.push({ type: 'CIT Admin Notification', success: result.success, error: result.error })
          break

        default:
          results.push({ type, success: false, error: 'Unknown email type' })
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const allSuccessful = results.every(r => r.success)
    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      data: {
        success: allSuccessful,
        sentTo: email,
        results,
        summary: `${successCount}/${results.length} emails sent successfully`,
      },
      error: allSuccessful ? null : 'Some emails failed to send',
    })
  } catch (err) {
    console.error('Error in POST /api/test-emails:', err)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
