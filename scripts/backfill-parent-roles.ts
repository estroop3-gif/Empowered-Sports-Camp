/**
 * Backfill Parent Roles
 *
 * Finds all profiles that have confirmed registrations but are missing
 * an active "parent" role assignment, and adds one.
 *
 * This is a one-time fix for users who registered before the
 * ensureParentRole() server-side integration was added.
 *
 * Usage:
 *   npx tsx -r tsconfig-paths/register scripts/backfill-parent-roles.ts          # dry run
 *   npx tsx -r tsconfig-paths/register scripts/backfill-parent-roles.ts --apply  # apply
 */

import { prisma } from '@/lib/db/client'

async function main() {
  const dryRun = !process.argv.includes('--apply')

  console.log(dryRun ? '\n=== DRY RUN (pass --apply to actually update) ===\n' : '\n=== APPLYING PARENT ROLES ===\n')

  // Find all unique parent IDs from confirmed registrations
  const parentIds = await prisma.registration.findMany({
    where: { status: 'confirmed' },
    select: { parentId: true },
    distinct: ['parentId'],
  })

  console.log(`Found ${parentIds.length} unique parent(s) with confirmed registrations.\n`)

  // Find which already have an active parent role
  const existingParentRoles = await prisma.userRoleAssignment.findMany({
    where: {
      userId: { in: parentIds.map(p => p.parentId) },
      role: 'parent',
      isActive: true,
    },
    select: { userId: true },
  })

  const hasParentRole = new Set(existingParentRoles.map(r => r.userId))

  const missing = parentIds.filter(p => !hasParentRole.has(p.parentId))

  if (missing.length === 0) {
    console.log('All registered parents already have the parent role. Nothing to do!')
    return
  }

  // Get profile details for logging
  const profiles = await prisma.profile.findMany({
    where: { id: { in: missing.map(m => m.parentId) } },
    select: { id: true, email: true, firstName: true, lastName: true },
  })

  const profileMap = new Map(profiles.map(p => [p.id, p]))

  console.log(`${missing.length} parent(s) are MISSING the parent role:\n`)
  console.log('---')
  for (const m of missing) {
    const p = profileMap.get(m.parentId)
    console.log(`  ID:    ${m.parentId}`)
    console.log(`  Email: ${p?.email || 'unknown'}`)
    console.log(`  Name:  ${p?.firstName || ''} ${p?.lastName || ''}`.trim())
    console.log('---')
  }

  if (dryRun) {
    console.log(`\nDry run complete. ${missing.length} parent role(s) would be added.`)
    console.log('Run with --apply to actually add them.')
    return
  }

  let added = 0
  let failed = 0

  for (const m of missing) {
    try {
      await prisma.userRoleAssignment.create({
        data: {
          userId: m.parentId,
          role: 'parent',
          isActive: true,
        },
      })
      const p = profileMap.get(m.parentId)
      console.log(`  Added parent role for ${p?.email || m.parentId}`)
      added++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Unique constraint')) {
        console.log(`  Skipped (already exists): ${m.parentId}`)
      } else {
        console.error(`  Failed for ${m.parentId}: ${msg}`)
        failed++
      }
    }
  }

  console.log(`\nDone! Added: ${added}, Failed: ${failed}`)
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
