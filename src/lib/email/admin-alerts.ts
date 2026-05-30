/**
 * Admin Alert Email Builders
 *
 * Each function returns { subject, bodyHtml, actionUrl } for a specific event type.
 * bodyHtml is inner content — notifyAdminSubscribers wraps it with brandWrap().
 */

import {
  BRAND,
  APP_URL,
  emailLabel,
  emailHeading,
  emailParagraph,
  emailDetailsCard,
  emailButton,
  emailCallout,
} from './brand-layout'

export interface AlertEmailContent {
  subject: string
  bodyHtml: string
  actionUrl: string
}

// ============================================================================
// Contact Form Submission
// ============================================================================

export function buildContactFormAlertEmail(data: {
  name: string
  email: string
  phone?: string
  inquiryType: string
  message: string
  organization?: string
  location?: string
}): AlertEmailContent {
  const rows = [
    { label: 'Name', value: data.name },
    { label: 'Email', value: data.email },
    ...(data.phone ? [{ label: 'Phone', value: data.phone }] : []),
    { label: 'Inquiry Type', value: data.inquiryType },
    ...(data.organization ? [{ label: 'Organization', value: data.organization }] : []),
    ...(data.location ? [{ label: 'Location', value: data.location }] : []),
  ]

  const bodyHtml = [
    emailLabel('NEW CONTACT', BRAND.neon),
    emailHeading('Contact Form Submission'),
    emailParagraph(`A new contact form submission has been received from <strong>${data.name}</strong>.`),
    emailDetailsCard(rows, 'Contact Details', BRAND.neon),
    emailCallout(`"${data.message.length > 300 ? data.message.slice(0, 300) + '...' : data.message}"`, 'info'),
    emailButton('View in Dashboard', `${APP_URL}/admin/contact`),
    emailParagraph(`<span style="color: ${BRAND.textMuted}; font-size: 12px;">Received at ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>`),
  ].join('\n')

  return {
    subject: `New Contact: ${data.inquiryType} — ${data.name}`,
    bodyHtml,
    actionUrl: '/admin/contact',
  }
}

// ============================================================================
// Camp Registration Confirmed
// ============================================================================

export function buildRegistrationAlertEmail(data: {
  athleteFirstName: string
  athleteLastName: string
  campName: string
  parentName: string
  parentEmail: string
  tenantName?: string
}): AlertEmailContent {
  const rows = [
    { label: 'Camper', value: `${data.athleteFirstName} ${data.athleteLastName}` },
    { label: 'Camp', value: data.campName },
    { label: 'Parent', value: data.parentName },
    { label: 'Parent Email', value: data.parentEmail },
    ...(data.tenantName ? [{ label: 'Tenant', value: data.tenantName }] : []),
  ]

  const bodyHtml = [
    emailLabel('NEW REGISTRATION', BRAND.success),
    emailHeading('Camp Registration Confirmed'),
    emailParagraph(`<strong>${data.athleteFirstName} ${data.athleteLastName}</strong> has been registered for <strong>${data.campName}</strong>.`),
    emailDetailsCard(rows, 'Registration Details', BRAND.success),
    emailButton('View Registrations', `${APP_URL}/admin/camps`),
    emailParagraph(`<span style="color: ${BRAND.textMuted}; font-size: 12px;">Confirmed at ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>`),
  ].join('\n')

  return {
    subject: `New Registration: ${data.athleteFirstName} ${data.athleteLastName} — ${data.campName}`,
    bodyHtml,
    actionUrl: '/admin/camps',
  }
}

// ============================================================================
// Waitlist Join
// ============================================================================

export function buildWaitlistAlertEmail(data: {
  athleteFirstName: string
  athleteLastName: string
  campName: string
  parentName: string
  waitlistPosition: number
}): AlertEmailContent {
  const rows = [
    { label: 'Camper', value: `${data.athleteFirstName} ${data.athleteLastName}` },
    { label: 'Camp', value: data.campName },
    { label: 'Parent', value: data.parentName },
    { label: 'Waitlist Position', value: `#${data.waitlistPosition}` },
  ]

  const bodyHtml = [
    emailLabel('WAITLIST JOIN', BRAND.warning),
    emailHeading('New Waitlist Entry'),
    emailParagraph(`<strong>${data.athleteFirstName} ${data.athleteLastName}</strong> has joined the waitlist for <strong>${data.campName}</strong> at position #${data.waitlistPosition}.`),
    emailDetailsCard(rows, 'Waitlist Details', BRAND.warning),
    emailButton('View Waitlist', `${APP_URL}/admin/camps`),
    emailParagraph(`<span style="color: ${BRAND.textMuted}; font-size: 12px;">Joined at ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>`),
  ].join('\n')

  return {
    subject: `Waitlist: ${data.athleteFirstName} ${data.athleteLastName} — ${data.campName} (#${data.waitlistPosition})`,
    bodyHtml,
    actionUrl: '/admin/camps',
  }
}

// ============================================================================
// CIT / Volunteer Application
// ============================================================================

export function buildCitApplicationAlertEmail(data: {
  firstName: string
  lastName: string
  email: string
  phone?: string
  schoolName?: string
  gradeLevel?: string
  volunteerRoles?: string[]
  whyCit?: string
}): AlertEmailContent {
  const rows = [
    { label: 'Name', value: `${data.firstName} ${data.lastName}` },
    { label: 'Email', value: data.email },
    ...(data.phone ? [{ label: 'Phone', value: data.phone }] : []),
    ...(data.schoolName ? [{ label: 'School', value: data.schoolName }] : []),
    ...(data.gradeLevel ? [{ label: 'Grade', value: data.gradeLevel }] : []),
    ...(data.volunteerRoles?.length ? [{ label: 'Roles', value: data.volunteerRoles.join(', ') }] : []),
  ]

  const bodyHtml = [
    emailLabel('NEW APPLICATION', BRAND.purple),
    emailHeading('CIT / Volunteer Application'),
    emailParagraph(`<strong>${data.firstName} ${data.lastName}</strong> has submitted a CIT/volunteer application.`),
    emailDetailsCard(rows, 'Applicant Details', BRAND.purple),
    ...(data.whyCit ? [emailCallout(`"${data.whyCit.length > 300 ? data.whyCit.slice(0, 300) + '...' : data.whyCit}"`, 'purple')] : []),
    emailButton('Review Applications', `${APP_URL}/admin/cit`),
    emailParagraph(`<span style="color: ${BRAND.textMuted}; font-size: 12px;">Submitted at ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>`),
  ].join('\n')

  return {
    subject: `CIT Application: ${data.firstName} ${data.lastName}`,
    bodyHtml,
    actionUrl: '/admin/cit',
  }
}

// ============================================================================
// Licensee / Host-a-Camp Application
// ============================================================================

export function buildLicenseeApplicationAlertEmail(data: {
  firstName: string
  lastName: string
  email: string
  phone?: string
  companyName?: string
  city?: string
  state?: string
  territoryInterest: string
  whyInterested: string
}): AlertEmailContent {
  const rows = [
    { label: 'Name', value: `${data.firstName} ${data.lastName}` },
    { label: 'Email', value: data.email },
    ...(data.phone ? [{ label: 'Phone', value: data.phone }] : []),
    ...(data.companyName ? [{ label: 'Company', value: data.companyName }] : []),
    ...(data.city || data.state ? [{ label: 'Location', value: [data.city, data.state].filter(Boolean).join(', ') }] : []),
    { label: 'Territory Interest', value: data.territoryInterest },
  ]

  const bodyHtml = [
    emailLabel('NEW APPLICATION', BRAND.magenta),
    emailHeading('Host-a-Camp Application'),
    emailParagraph(`<strong>${data.firstName} ${data.lastName}</strong> has applied to host an Empowered Sports Camp.`),
    emailDetailsCard(rows, 'Applicant Details', BRAND.magenta),
    emailCallout(`"${data.whyInterested.length > 300 ? data.whyInterested.slice(0, 300) + '...' : data.whyInterested}"`, 'purple'),
    emailButton('Review Applications', `${APP_URL}/admin/licensee-applications`),
    emailParagraph(`<span style="color: ${BRAND.textMuted}; font-size: 12px;">Submitted at ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>`),
  ].join('\n')

  return {
    subject: `Licensee Application: ${data.firstName} ${data.lastName} — ${data.territoryInterest}`,
    bodyHtml,
    actionUrl: '/admin/licensee-applications',
  }
}
