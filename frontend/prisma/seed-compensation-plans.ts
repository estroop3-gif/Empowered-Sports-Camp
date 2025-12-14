/**
 * Seed Compensation Plans
 *
 * Seeds the four compensation plan types based on PDF documentation:
 * - HIGH: High Range plan with maximum bonuses
 * - MID: Mid Range plan with moderate bonuses
 * - ENTRY: Entry Level plan with lower thresholds
 * - FIXED: Fixed Stipend only (no variable bonuses)
 */

import { PrismaClient, CompensationPlanCode } from '../src/generated/prisma'

const prisma = new PrismaClient()

const compensationPlans = [
  {
    name: 'High Range',
    planCode: CompensationPlanCode.HIGH,
    preCampStipendAmount: 500.0,
    onSiteStipendAmount: 2000.0,
    enrollmentThreshold: 25,
    enrollmentBonusPerCamper: 25.0,
    csatRequiredScore: 4.5,
    csatBonusAmount: 250.0,
    budgetEfficiencyRate: 0.2, // 20% of savings
    guestSpeakerRequiredCount: 2,
    guestSpeakerBonusAmount: 150.0,
    isActive: true,
  },
  {
    name: 'Mid Range',
    planCode: CompensationPlanCode.MID,
    preCampStipendAmount: 400.0,
    onSiteStipendAmount: 1500.0,
    enrollmentThreshold: 30,
    enrollmentBonusPerCamper: 20.0,
    csatRequiredScore: 4.5,
    csatBonusAmount: 200.0,
    budgetEfficiencyRate: 0.15, // 15% of savings
    guestSpeakerRequiredCount: 2,
    guestSpeakerBonusAmount: 100.0,
    isActive: true,
  },
  {
    name: 'Entry Level',
    planCode: CompensationPlanCode.ENTRY,
    preCampStipendAmount: 300.0,
    onSiteStipendAmount: 1000.0,
    enrollmentThreshold: 35,
    enrollmentBonusPerCamper: 15.0,
    csatRequiredScore: 4.5,
    csatBonusAmount: 150.0,
    budgetEfficiencyRate: 0.1, // 10% of savings
    guestSpeakerRequiredCount: 2,
    guestSpeakerBonusAmount: 75.0,
    isActive: true,
  },
  {
    name: 'Fixed Stipend',
    planCode: CompensationPlanCode.FIXED,
    preCampStipendAmount: 350.0,
    onSiteStipendAmount: 1200.0,
    // No variable bonuses for fixed stipend plan
    enrollmentThreshold: null,
    enrollmentBonusPerCamper: null,
    csatRequiredScore: null,
    csatBonusAmount: null,
    budgetEfficiencyRate: null,
    guestSpeakerRequiredCount: null,
    guestSpeakerBonusAmount: null,
    isActive: true,
  },
]

async function seedCompensationPlans() {
  console.log('Seeding compensation plans...')

  for (const plan of compensationPlans) {
    await prisma.compensationPlan.upsert({
      where: { planCode: plan.planCode },
      update: {
        name: plan.name,
        preCampStipendAmount: plan.preCampStipendAmount,
        onSiteStipendAmount: plan.onSiteStipendAmount,
        enrollmentThreshold: plan.enrollmentThreshold,
        enrollmentBonusPerCamper: plan.enrollmentBonusPerCamper,
        csatRequiredScore: plan.csatRequiredScore,
        csatBonusAmount: plan.csatBonusAmount,
        budgetEfficiencyRate: plan.budgetEfficiencyRate,
        guestSpeakerRequiredCount: plan.guestSpeakerRequiredCount,
        guestSpeakerBonusAmount: plan.guestSpeakerBonusAmount,
        isActive: plan.isActive,
      },
      create: plan,
    })
    console.log(`  ✓ ${plan.name} (${plan.planCode})`)
  }

  console.log('Compensation plans seeded successfully!')
}

// Run if called directly
seedCompensationPlans()
  .catch((e) => {
    console.error('Error seeding compensation plans:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

export { seedCompensationPlans }
