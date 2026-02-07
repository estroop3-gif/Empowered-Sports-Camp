/**
 * Geo Utilities
 *
 * Postal code lookup with worldwide support:
 *  1. US zip codes — instant local lookup via `zipcodes` npm package
 *  2. International postal codes — free Nominatim (OpenStreetMap) geocoding, no API key
 *
 * Server-only — do not import from client components.
 */

import zipcodes from 'zipcodes'

export interface ZipLookupResult {
  latitude: number
  longitude: number
  city: string
  state: string
  zip: string
  country?: string
}

/**
 * Look up a postal code and return its coordinates and location info.
 * Tries US local lookup first (instant), then falls back to Nominatim for worldwide coverage.
 * Returns null if the postal code is not found anywhere.
 */
export async function lookupZipCode(zip: string): Promise<ZipLookupResult | null> {
  const trimmed = zip.trim()

  // 1. Try US local lookup (instant, no network)
  const usResult = zipcodes.lookup(trimmed)
  if (usResult) {
    return {
      latitude: usResult.latitude,
      longitude: usResult.longitude,
      city: usResult.city,
      state: usResult.state,
      zip: usResult.zip,
      country: 'US',
    }
  }

  // 2. Fall back to Nominatim for international postal codes
  return lookupViaNominatim(trimmed)
}

/**
 * Geocode a postal code using OpenStreetMap Nominatim (free, no API key).
 * Rate limit: 1 req/sec — fine for user-initiated searches.
 */
async function lookupViaNominatim(postalCode: string): Promise<ZipLookupResult | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('postalcode', postalCode)
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', '1')

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'EmpoweredSportsCamp/1.0',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const result = data[0]
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    if (isNaN(lat) || isNaN(lng)) return null

    const addr = result.address || {}

    return {
      latitude: lat,
      longitude: lng,
      city: addr.city || addr.town || addr.village || addr.municipality || addr.county || '',
      state: addr.state || addr.province || addr.region || '',
      zip: postalCode,
      country: addr.country_code?.toUpperCase() || '',
    }
  } catch {
    return null
  }
}

/**
 * Calculate the great-circle distance between two points using the Haversine formula.
 * Returns distance in miles.
 */
export function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
