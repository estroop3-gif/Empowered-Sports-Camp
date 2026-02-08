import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

// Parse a date string safely: extracts the YYYY-MM-DD portion and treats it as
// local time to avoid UTC midnight rolling back a day in US timezones.
// Handles "2026-06-15", "2026-06-15T00:00:00.000Z", and Date objects.
export function parseDateSafe(date: string | Date): Date {
  if (date instanceof Date) return date
  // Extract just the date part (before any 'T') and construct as local
  const datePart = date.split('T')[0]
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Convert "HH:MM" or "HH:MM:SS" 24h time to "9:00 AM" 12h format */
export function formatTime12h(time?: string | null): string {
  if (!time) return ''
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${ampm}`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateSafe(date))
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const startDate = parseDateSafe(start)
  const endDate = parseDateSafe(end)

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`
  }

  return `${formatDate(start)} - ${formatDate(end)}`
}

export function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}
