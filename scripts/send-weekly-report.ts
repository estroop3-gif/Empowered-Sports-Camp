/**
 * Send Weekly Business Report — One-time Script
 *
 * Sends the weekly business report email immediately.
 *
 * Usage:
 *   npx tsx -r tsconfig-paths/register scripts/send-weekly-report.ts
 */

import { prisma } from '@/lib/db/client'
import { sendWeeklyReportEmail } from '@/lib/services/email'

async function main() {
  console.log('\n=== Sending Weekly Business Report ===\n')

  const { data, error } = await sendWeeklyReportEmail()

  if (error) {
    console.error('Failed to send report:', error.message)
    process.exit(1)
  }

  console.log('Report sent successfully!')
  console.log('  Message ID:', data?.messageId)
  console.log('  Sent At:', data?.sentAt)
  console.log('  Email Log ID:', data?.emailLogId)
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
