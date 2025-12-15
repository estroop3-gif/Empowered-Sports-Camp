/**
 * Admin Seed Script
 *
 * Creates or updates the hq_admin role assignment for an admin user.
 *
 * Usage:
 *   npx ts-node prisma/seed-admin.ts <email>
 *
 * Example:
 *   npx ts-node prisma/seed-admin.ts admin@empoweredsportscamp.com
 */

import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function seedAdmin() {
  const email = process.argv[2]

  if (!email) {
    console.error('❌ Error: Please provide an email address')
    console.log('Usage: npx ts-node prisma/seed-admin.ts <email>')
    process.exit(1)
  }

  console.log(`\n🔍 Looking for profile with email: ${email}`)

  try {
    // Find the profile by email
    const profile = await prisma.profile.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!profile) {
      console.error(`❌ No profile found with email: ${email}`)
      console.log('\nMake sure the user has logged in at least once to create their profile.')
      process.exit(1)
    }

    console.log(`✅ Found profile: ${profile.firstName || ''} ${profile.lastName || ''} (${profile.email})`)
    console.log(`   Profile ID: ${profile.id}`)

    // Check for existing hq_admin role
    const existingRole = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: profile.id,
        role: 'hq_admin',
      },
    })

    if (existingRole) {
      if (existingRole.isActive) {
        console.log('✅ User already has an active hq_admin role')
        return
      }

      // Reactivate the role if inactive
      await prisma.userRoleAssignment.update({
        where: { id: existingRole.id },
        data: { isActive: true },
      })
      console.log('✅ Reactivated hq_admin role for user')
      return
    }

    // Create new hq_admin role assignment
    const roleAssignment = await prisma.userRoleAssignment.create({
      data: {
        userId: profile.id,
        role: 'hq_admin',
        tenantId: null, // HQ admin has no tenant restriction
        isActive: true,
      },
    })

    console.log(`✅ Created hq_admin role assignment`)
    console.log(`   Role Assignment ID: ${roleAssignment.id}`)
    console.log('\n🎉 Admin authorization complete!')
    console.log('   The user can now access all admin features including Incentives Overview.')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedAdmin()
