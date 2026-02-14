/**
 * Backfill confirmation numbers for existing registrations.
 *
 * Groups registrations by stripeCheckoutSessionId so siblings from the same
 * checkout share one confirmation number. Orphans (no session ID) each get
 * their own.
 *
 * Usage: npx tsx scripts/backfill-confirmation-numbers.ts
 */

import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `EA-${code}`
}

async function main() {
  // 1. Group registrations that share a checkout session
  const withSession = await prisma.registration.findMany({
    where: { confirmationNumber: null, stripeCheckoutSessionId: { not: null } },
    select: { id: true, stripeCheckoutSessionId: true },
    orderBy: { createdAt: 'asc' },
  })

  const sessionGroups = new Map<string, string[]>()
  for (const reg of withSession) {
    const key = reg.stripeCheckoutSessionId!
    if (!sessionGroups.has(key)) sessionGroups.set(key, [])
    sessionGroups.get(key)!.push(reg.id)
  }

  let updated = 0

  for (const [sessionId, regIds] of sessionGroups) {
    const confirmationNumber = generateConfirmationNumber()
    await prisma.registration.updateMany({
      where: { id: { in: regIds } },
      data: { confirmationNumber },
    })
    console.log(`  ${confirmationNumber} → ${regIds.length} registration(s) [session: ...${sessionId.slice(-12)}]`)
    updated += regIds.length
  }

  // 2. Handle orphan registrations (no checkout session)
  const orphans = await prisma.registration.findMany({
    where: { confirmationNumber: null, stripeCheckoutSessionId: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  for (const reg of orphans) {
    const confirmationNumber = generateConfirmationNumber()
    await prisma.registration.update({
      where: { id: reg.id },
      data: { confirmationNumber },
    })
    console.log(`  ${confirmationNumber} → 1 registration [orphan: ${reg.id.slice(0, 8)}]`)
    updated++
  }

  // 3. Verify
  const remaining = await prisma.registration.count({ where: { confirmationNumber: null } })

  console.log(`\nDone. Updated ${updated} registrations.`)
  console.log(`Remaining without confirmation number: ${remaining}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
