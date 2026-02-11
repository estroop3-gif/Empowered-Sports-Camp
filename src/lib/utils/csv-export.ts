/**
 * CSV Export Utility
 *
 * Client-side CSV generation and download. Zero dependencies.
 */

/**
 * Escape a CSV field value (handles commas, quotes, newlines)
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generate CSV string from array of objects
 */
export function generateCSV(rows: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (rows.length === 0) return ''

  const cols = columns || Object.keys(rows[0]).map(key => ({ key, label: key }))
  const header = cols.map(c => escapeCSVField(c.label)).join(',')
  const body = rows.map(row =>
    cols.map(c => escapeCSVField(row[c.key])).join(',')
  ).join('\n')

  return `${header}\n${body}`
}

/**
 * Trigger a CSV file download in the browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
