/**
 * Backfill Registration Confirmation Emails
 *
 * Finds confirmed registrations that never received a confirmation email
 * and sends them using the same template as the Stripe webhook.
 *
 * Usage:
 *   npx tsx -r tsconfig-paths/register scripts/backfill-confirmation-emails.ts          # dry run
 *   npx tsx -r tsconfig-paths/register scripts/backfill-confirmation-emails.ts --send   # actually send
 */

import { prisma } from '@/lib/db/client'
import { sendRegistrationConfirmationEmail } from '@/lib/services/email'

async function main() {
  const dryRun = !process.argv.includes('--send')

  console.log(dryRun ? '\n=== DRY RUN (pass --send to actually send) ===\n' : '\n=== SENDING EMAILS ===\n')

  // 1. Find all confirmed registrations
  const confirmedRegistrations = await prisma.registration.findMany({
    where: { status: 'confirmed' },
    select: {
      id: true,
      tenantId: true,
      confirmationNumber: true,
      paidAt: true,
      createdAt: true,
      athlete: { select: { firstName: true, lastName: true } },
      parent: { select: { id: true, email: true, firstName: true, lastName: true } },
      camp: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${confirmedRegistrations.length} confirmed registration(s) total.\n`)

  if (confirmedRegistrations.length === 0) {
    console.log('Nothing to do.')
    return
  }

  // 2. Find which already have a successful confirmation email
  const existingEmails = await prisma.emailLog.findMany({
    where: {
      emailType: 'registration_confirmation',
      status: 'sent',
    },
    select: {
      payload: true,
    },
  })

  const emailedRegistrationIds = new Set<string>()
  for (const log of existingEmails) {
    const payload = log.payload as Record<string, unknown> | null
    if (payload?.registrationId && typeof payload.registrationId === 'string') {
      emailedRegistrationIds.add(payload.registrationId)
    }
  }

  console.log(`Found ${emailedRegistrationIds.size} registration(s) that already have confirmation emails.\n`)

  // 3. Filter to missing ones
  const missing = confirmedRegistrations.filter(r => !emailedRegistrationIds.has(r.id))

  if (missing.length === 0) {
    console.log('All confirmed registrations already have confirmation emails. Nothing to do!')
    return
  }

  console.log(`${missing.length} registration(s) are MISSING confirmation emails:\n`)
  console.log('---')
  for (const r of missing) {
    const athlete = `${r.athlete?.firstName || ''} ${r.athlete?.lastName || ''}`.trim()
    const parent = `${r.parent?.firstName || ''} ${r.parent?.lastName || ''}`.trim()
    console.log(`  Registration: ${r.id}`)
    console.log(`  Confirmation: ${r.confirmationNumber || 'N/A'}`)
    console.log(`  Athlete:      ${athlete}`)
    console.log(`  Parent:       ${parent} <${r.parent?.email}>`)
    console.log(`  Camp:         ${r.camp?.name}`)
    console.log(`  Paid At:      ${r.paidAt?.toISOString() || 'N/A'}`)
    console.log(`  Created:      ${r.createdAt.toISOString()}`)
    console.log('---')
  }

  if (dryRun) {
    console.log(`\nDry run complete. ${missing.length} email(s) would be sent.`)
    console.log('Run with --send to actually send them.')
    return
  }

  // 4. Send emails
  console.log(`\nSending ${missing.length} confirmation email(s)...\n`)

  let sent = 0
  let failed = 0

  for (const reg of missing) {
    const label = `${reg.parent?.email} (${reg.athlete?.firstName} ${reg.athlete?.lastName})`
    process.stdout.write(`  Sending to ${label}... `)

    const { error } = await sendRegistrationConfirmationEmail({
      registrationId: reg.id,
      tenantId: reg.tenantId,
    })

    if (error) {
      failed++
      console.log(`FAILED: ${error.message}`)
    } else {
      sent++
      console.log('OK')
    }
  }

  console.log(`\nDone! Sent: ${sent}, Failed: ${failed}`)
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
