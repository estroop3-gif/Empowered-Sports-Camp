import { prisma } from '@/lib/db/client'

async function main() {
  const devLogs = await prisma.emailLog.deleteMany({
    where: {
      emailType: 'registration_confirmation',
      providerMessageId: { startsWith: 'dev-' },
    },
  })
  console.log(`Deleted ${devLogs.count} dev-mode email log(s)`)
}

main().finally(() => prisma.$disconnect())
