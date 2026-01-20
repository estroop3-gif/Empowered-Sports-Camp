/**
 * Health Check API
 *
 * GET /api/health - Returns service health status
 *
 * Used by load balancers, monitoring systems, and deployment pipelines
 * to verify the application is running and can connect to dependencies.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: {
      status: 'up' | 'down'
      latency?: number
      error?: string
    }
  }
}

const startTime = Date.now()

export async function GET() {
  const checks: HealthStatus['checks'] = {
    database: { status: 'down' },
  }

  let overallStatus: HealthStatus['status'] = 'healthy'

  // Check database connectivity
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'up',
      latency: Date.now() - dbStart,
    }
  } catch (error) {
    checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    overallStatus = 'unhealthy'
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  }

  const statusCode = overallStatus === 'healthy' ? 200 : 503

  return NextResponse.json(healthStatus, { status: statusCode })
}
