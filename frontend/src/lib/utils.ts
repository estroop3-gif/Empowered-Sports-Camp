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

// Parse a date string safely: YYYY-MM-DD strings are treated as noon local time
// to avoid UTC midnight rolling back a day in US timezones
function parseDateSafe(date: string | Date): Date {
  if (date instanceof Date) return date
  // If it's a date-only string (YYYY-MM-DD), append noon to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T12:00:00`)
  }
  return new Date(date)
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
