/**
 * Structured Logger
 *
 * Provides consistent logging format for production monitoring.
 * In production, these logs can be ingested by CloudWatch, Datadog, etc.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  tenantId?: string
  campId?: string
  requestId?: string
  duration?: number
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  service: string
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const isDev = process.env.NODE_ENV === 'development'

function formatLog(entry: LogEntry): string {
  if (isDev) {
    // Pretty print in development
    const { timestamp, level, service, message, context, error } = entry
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    const errorStr = error ? `\n  Error: ${error.message}${error.stack ? `\n  ${error.stack}` : ''}` : ''
    return `[${timestamp}] ${level.toUpperCase()} [${service}] ${message}${contextStr}${errorStr}`
  }
  // JSON in production for log aggregators
  return JSON.stringify(entry)
}

function createLogEntry(
  level: LogLevel,
  service: string,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
    ...(error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: isDev ? error.stack : undefined,
      }
    } : {}),
  }
}

export function createLogger(service: string) {
  return {
    debug(message: string, context?: LogContext) {
      if (isDev) {
        console.debug(formatLog(createLogEntry('debug', service, message, context)))
      }
    },

    info(message: string, context?: LogContext) {
      console.info(formatLog(createLogEntry('info', service, message, context)))
    },

    warn(message: string, context?: LogContext, error?: Error) {
      console.warn(formatLog(createLogEntry('warn', service, message, context, error)))
    },

    error(message: string, context?: LogContext, error?: Error) {
      console.error(formatLog(createLogEntry('error', service, message, context, error)))
    },

    // Measure async operation duration
    async withTiming<T>(
      operation: string,
      fn: () => Promise<T>,
      context?: LogContext
    ): Promise<T> {
      const start = Date.now()
      try {
        const result = await fn()
        this.info(`${operation} completed`, { ...context, duration: Date.now() - start })
        return result
      } catch (err) {
        this.error(`${operation} failed`, { ...context, duration: Date.now() - start }, err as Error)
        throw err
      }
    },
  }
}

// Pre-configured loggers for common services
export const apiLogger = createLogger('api')
export const dbLogger = createLogger('database')
export const authLogger = createLogger('auth')
export const coachDashboardLogger = createLogger('coach-dashboard')
