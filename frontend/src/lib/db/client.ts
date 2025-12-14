/**
 * Prisma Database Client
 *
 * Singleton pattern for Prisma client to prevent multiple instances
 * in development (hot reload) and production.
 *
 * Note: Prisma queries only execute server-side. In client components,
 * the import is allowed but queries will fail if executed on the client.
 * Use API routes or Server Actions to call Prisma from client components.
 */

import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
