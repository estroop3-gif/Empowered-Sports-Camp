/**
 * Seed Coach Dashboard Test Data
 *
 * This script creates sample data for testing the coach dashboard including:
 * - A test coach user
 * - Camp assignments
 * - Session days with schedule blocks
 * - Groups and attendance records
 * - EmpowerU training modules
 * - Compensation data
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-coach-data.ts
 */

import { PrismaClient } from '../src/generated/prisma'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function seedCoachData() {
  console.log('🌱 Seeding coach dashboard test data...\n')

  // 1. Create or get a test tenant
  console.log('Creating tenant...')
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'test-licensee' },
    update: {},
    create: {
      name: 'Test Licensee',
      slug: 'test-licensee',
      contactEmail: 'test@example.com',
      licenseStatus: 'active',
    },
  })
  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.id})`)

  // 2. Create test coach profile
  console.log('\nCreating coach profile...')
  let coachProfile = await prisma.profile.findFirst({
    where: { email: 'coach@test.com' },
  })
  if (!coachProfile) {
    coachProfile = await prisma.profile.create({
      data: {
        id: randomUUID(),
        email: 'coach@test.com',
        firstName: 'Test',
        lastName: 'Coach',
        phone: '555-0100',
      },
    })
  }
  console.log(`  ✓ Coach: ${coachProfile.firstName} ${coachProfile.lastName} (${coachProfile.id})`)

  // 3. Create coach role assignment
  console.log('\nCreating role assignment...')
  await prisma.userRoleAssignment.upsert({
    where: {
      userId_tenantId_role: {
        userId: coachProfile.id,
        tenantId: tenant.id,
        role: 'coach',
      },
    },
    update: {},
    create: {
      userId: coachProfile.id,
      tenantId: tenant.id,
      role: 'coach',
    },
  })
  console.log(`  ✓ Role: coach`)

  // 4. Create location
  console.log('\nCreating location...')
  const location = await prisma.location.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: tenant.id,
      name: 'Test Sports Center',
      address: '123 Main St',
      city: 'Test City',
      state: 'TC',
      zip: '12345',
    },
  })
  console.log(`  ✓ Location: ${location.name}`)

  // 5. Create a test camp
  const today = new Date()
  const campStartDate = new Date(today)
  campStartDate.setDate(today.getDate() - 1) // Started yesterday
  const campEndDate = new Date(today)
  campEndDate.setDate(today.getDate() + 3) // Ends in 3 days

  console.log('\nCreating camp...')
  const camp = await prisma.camp.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'test-camp-2024',
      },
    },
    update: {
      startDate: campStartDate,
      endDate: campEndDate,
    },
    create: {
      tenantId: tenant.id,
      name: 'Test Summer Camp 2024',
      slug: 'test-camp-2024',
      description: 'A test camp for dashboard development',
      startDate: campStartDate,
      endDate: campEndDate,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T16:00:00'),
      capacity: 60,
      priceCents: 29900,
      locationId: location.id,
      status: 'published',
    },
  })
  console.log(`  ✓ Camp: ${camp.name} (${camp.id})`)

  // 6. Create camp staff assignment
  console.log('\nAssigning coach to camp...')
  await prisma.campStaffAssignment.upsert({
    where: {
      campId_userId: {
        campId: camp.id,
        userId: coachProfile.id,
      },
    },
    update: {},
    create: {
      campId: camp.id,
      userId: coachProfile.id,
      role: 'coach',
      stationName: 'Basketball Station',
      callTime: new Date('1970-01-01T08:30:00'),
      endTime: new Date('1970-01-01T16:30:00'),
      isLead: false,
    },
  })
  console.log(`  ✓ Assignment: Basketball Station`)

  // 7. Create session days
  console.log('\nCreating session days...')
  const sessionDays = []
  for (let i = 0; i < 5; i++) {
    const dayDate = new Date(campStartDate)
    dayDate.setDate(campStartDate.getDate() + i)

    const sessionDay = await prisma.campSessionDay.upsert({
      where: {
        campId_dayNumber: {
          campId: camp.id,
          dayNumber: i + 1,
        },
      },
      update: {
        actualDate: dayDate,
      },
      create: {
        campId: camp.id,
        dayNumber: i + 1,
        actualDate: dayDate,
        title: `Day ${i + 1}`,
        theme: ['Welcome Day', 'Basketball Focus', 'Soccer Day', 'Multi-Sport', 'Awards Day'][i],
        status: i < 2 ? 'completed' : i === 2 ? 'in_progress' : 'planned',
      },
    })
    sessionDays.push(sessionDay)
    console.log(`  ✓ Day ${i + 1}: ${sessionDay.theme}`)
  }

  // 8. Create schedule blocks for today's session
  const todaySession = sessionDays.find(
    (day) => day.actualDate?.toISOString().split('T')[0] === today.toISOString().split('T')[0]
  )

  if (todaySession) {
    console.log('\nCreating schedule blocks for today...')
    const scheduleBlocks: Array<{
      startTime: string
      endTime: string
      label: string
      type: 'activity' | 'transition' | 'break' | 'meal' | 'arrival' | 'departure' | 'special' | 'curriculum'
    }> = [
      { startTime: '09:00', endTime: '09:30', label: 'Morning Circle', type: 'arrival' },
      { startTime: '09:30', endTime: '10:30', label: 'Basketball Station', type: 'curriculum' },
      { startTime: '10:30', endTime: '11:30', label: 'Soccer Station', type: 'curriculum' },
      { startTime: '11:30', endTime: '12:30', label: 'Lunch', type: 'meal' },
      { startTime: '12:30', endTime: '13:30', label: 'Basketball Station', type: 'curriculum' },
      { startTime: '13:30', endTime: '14:30', label: 'Free Play', type: 'activity' },
      { startTime: '14:30', endTime: '15:30', label: 'Swimming', type: 'activity' },
      { startTime: '15:30', endTime: '16:00', label: 'Closing Circle', type: 'departure' },
    ]

    for (const block of scheduleBlocks) {
      await prisma.campSessionScheduleBlock.create({
        data: {
          campSessionDayId: todaySession.id,
          startTime: new Date(`1970-01-01T${block.startTime}:00`),
          endTime: new Date(`1970-01-01T${block.endTime}:00`),
          label: block.label,
          blockType: block.type,
        },
      })
      console.log(`  ✓ ${block.startTime}-${block.endTime}: ${block.label}`)
    }
  }

  // 9. Create camp groups
  console.log('\nCreating groups...')
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF']
  for (let i = 1; i <= 4; i++) {
    await prisma.campGroup.upsert({
      where: {
        campId_groupNumber: {
          campId: camp.id,
          groupNumber: i,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        campId: camp.id,
        groupNumber: i,
        groupName: ['Red Team', 'Green Team', 'Blue Team', 'Purple Team'][i - 1],
        groupColor: colors[i - 1],
        minGrade: i <= 2 ? 3 : 6,
        maxGrade: i <= 2 ? 5 : 8,
        camperCount: 12 + i,
      },
    })
    console.log(`  ✓ Group ${i}: ${['Red', 'Green', 'Blue', 'Purple'][i - 1]} Team`)
  }

  // 10. Create EmpowerU modules for coaches
  console.log('\nCreating EmpowerU modules...')
  const modules = [
    { title: 'Safety Fundamentals', slug: 'safety-fundamentals', level: 1 },
    { title: 'Age-Appropriate Coaching', slug: 'age-appropriate-coaching', level: 1 },
    { title: 'Conflict Resolution', slug: 'conflict-resolution', level: 1 },
    { title: 'Advanced Drills', slug: 'advanced-drills', level: 2 },
    { title: 'Leadership Development', slug: 'leadership-development', level: 2 },
  ]

  for (const mod of modules) {
    await prisma.empowerUModule.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: mod.slug,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        title: mod.title,
        slug: mod.slug,
        description: `Training module for ${mod.title.toLowerCase()}`,
        portalType: 'SKILL_STATION',
        level: mod.level,
        estimatedMinutes: 30,
        isPublished: true,
      },
    })
    console.log(`  ✓ Module: ${mod.title} (Level ${mod.level})`)
  }

  // 11. Create some module progress
  console.log('\nCreating module progress...')
  const empoweruModules = await prisma.empowerUModule.findMany({
    where: { tenantId: tenant.id, portalType: 'SKILL_STATION' },
    take: 3,
  })

  for (let i = 0; i < empoweruModules.length; i++) {
    const mod = empoweruModules[i]
    await prisma.empowerUModuleProgress.upsert({
      where: {
        moduleId_userId_tenantId: {
          moduleId: mod.id,
          userId: coachProfile.id,
          tenantId: tenant.id,
        },
      },
      update: {},
      create: {
        moduleId: mod.id,
        userId: coachProfile.id,
        tenantId: tenant.id,
        role: 'coach',
        status: i < 2 ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: i < 2 ? new Date() : null,
        quizScore: i < 2 ? 85 + i * 5 : null,
        quizPassed: i < 2 ? true : null,
      },
    })
    console.log(`  ✓ Progress: ${mod.title} (${i < 2 ? 'Completed' : 'In Progress'})`)
  }

  // 12. Create compensation plan
  console.log('\nCreating compensation data...')
  const compensationPlan = await prisma.compensationPlan.upsert({
    where: { planCode: 'MID' },
    update: {},
    create: {
      name: 'Mid Range',
      planCode: 'MID',
      preCampStipendAmount: 50,
      onSiteStipendAmount: 100,
      enrollmentThreshold: 30,
      enrollmentBonusPerCamper: 5,
      isActive: true,
    },
  })
  console.log(`  ✓ Plan: ${compensationPlan.name}`)

  // Create session compensation record
  await prisma.campSessionCompensation.upsert({
    where: {
      campId_staffProfileId: {
        campId: camp.id,
        staffProfileId: coachProfile.id,
      },
    },
    update: {},
    create: {
      campId: camp.id,
      tenantId: tenant.id,
      staffProfileId: coachProfile.id,
      compensationPlanId: compensationPlan.id,
      preCampStipendAmount: 50,
      onSiteStipendAmount: 100,
      enrollmentThreshold: 30,
      enrollmentBonusPerCamper: 5,
    },
  })
  console.log(`  ✓ Session compensation record created`)

  // 13. Create sample notifications
  console.log('\nCreating notifications...')
  const notifications: Array<{
    title: string
    body: string
    type: 'camp_reminder' | 'lms_module_assigned' | 'schedule_changed'
    category: 'camp' | 'lms' | 'system'
  }> = [
    {
      title: 'Welcome to Test Camp!',
      body: 'Your camp starts tomorrow. Review your schedule.',
      type: 'camp_reminder',
      category: 'camp',
    },
    {
      title: 'New Training Available',
      body: 'Complete your Safety Fundamentals module before camp.',
      type: 'lms_module_assigned',
      category: 'lms',
    },
    {
      title: 'Schedule Updated',
      body: 'The Day 3 schedule has been updated with a new activity.',
      type: 'schedule_changed',
      category: 'camp',
    },
  ]

  for (const notif of notifications) {
    await prisma.notification.create({
      data: {
        userId: coachProfile.id,
        tenantId: tenant.id,
        type: notif.type,
        category: notif.category,
        severity: 'info',
        title: notif.title,
        body: notif.body,
        isRead: false,
      },
    })
    console.log(`  ✓ Notification: ${notif.title}`)
  }

  console.log('\n✅ Seed complete!')
  console.log('\n📋 Test coach credentials:')
  console.log(`   Email: coach@test.com`)
  console.log(`   User ID: ${coachProfile.id}`)
  console.log(`   Tenant: ${tenant.name}`)
}

seedCoachData()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
