/**
 * SportTag Service
 *
 * CRUD operations and cached label lookup for sport tags.
 */

import prisma from '@/lib/db/client'

// ============================================================================
// TYPES
// ============================================================================

export interface SportTagData {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SportTagWithUsage extends SportTagData {
  campCount: number
  venueCount: number
}

// ============================================================================
// CACHE
// ============================================================================

let tagMapCache: Map<string, string> | null = null
let tagMapCacheTime = 0
const CACHE_TTL_MS = 60_000 // 60 seconds

function invalidateCache() {
  tagMapCache = null
  tagMapCacheTime = 0
}

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Fetch active sport tags for dropdowns/filters
 */
export async function fetchActiveSportTags(): Promise<{ slug: string; name: string; sortOrder: number }[]> {
  const tags = await prisma.sportTag.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  })
  return tags
}

/**
 * Fetch all sport tags including inactive, with camp + venue usage counts
 */
export async function fetchAllSportTags(): Promise<SportTagWithUsage[]> {
  const tags = await prisma.sportTag.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  // Count usage per sport name across camps and venues
  const usageCounts = await Promise.all(
    tags.map(async (tag) => {
      const [campCount, venueCount] = await Promise.all([
        prisma.camp.count({ where: { sportsOffered: { has: tag.name } } }),
        prisma.venue.count({ where: { sportsSupported: { has: tag.name } } }),
      ])
      return { slug: tag.slug, campCount, venueCount }
    })
  )

  const usageMap = new Map(usageCounts.map(u => [u.slug, u]))

  return tags.map(tag => {
    const usage = usageMap.get(tag.slug) || { campCount: 0, venueCount: 0 }
    return {
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
      description: tag.description,
      sortOrder: tag.sortOrder,
      isActive: tag.isActive,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
      campCount: usage.campCount,
      venueCount: usage.venueCount,
    }
  })
}

// ============================================================================
// ADMIN MUTATIONS
// ============================================================================

/**
 * Create a new sport tag
 */
export async function createSportTag(data: {
  name: string
  slug?: string
  description?: string
  sortOrder?: number
}): Promise<SportTagData> {
  const baseSlug = data.slug || data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  // Find a unique slug — append _2, _3, etc. if the base already exists
  let slug = baseSlug
  let suffix = 1
  while (await prisma.sportTag.findUnique({ where: { slug } })) {
    suffix++
    slug = `${baseSlug}_${suffix}`
  }

  const tag = await prisma.sportTag.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      sortOrder: data.sortOrder ?? 0,
    },
  })

  invalidateCache()

  return {
    id: tag.id,
    slug: tag.slug,
    name: tag.name,
    description: tag.description,
    sortOrder: tag.sortOrder,
    isActive: tag.isActive,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  }
}

/**
 * Update an existing sport tag
 */
export async function updateSportTag(
  id: string,
  data: Partial<{
    name: string
    slug: string
    description: string | null
    sortOrder: number
    isActive: boolean
  }>
): Promise<SportTagData> {
  const tag = await prisma.sportTag.update({
    where: { id },
    data,
  })

  invalidateCache()

  return {
    id: tag.id,
    slug: tag.slug,
    name: tag.name,
    description: tag.description,
    sortOrder: tag.sortOrder,
    isActive: tag.isActive,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  }
}

/**
 * Delete a sport tag (only if no camps or venues reference it)
 */
export async function deleteSportTag(id: string): Promise<void> {
  const tag = await prisma.sportTag.findUnique({ where: { id } })
  if (!tag) throw new Error('Sport tag not found')

  // Check if any camps or venues use this tag
  const [campCount, venueCount] = await Promise.all([
    prisma.camp.count({ where: { sportsOffered: { has: tag.name } } }),
    prisma.venue.count({ where: { sportsSupported: { has: tag.name } } }),
  ])

  if (campCount > 0 || venueCount > 0) {
    const parts: string[] = []
    if (campCount > 0) parts.push(`${campCount} camp(s)`)
    if (venueCount > 0) parts.push(`${venueCount} venue(s)`)
    throw new Error(`Cannot delete: used by ${parts.join(' and ')}`)
  }

  await prisma.sportTag.delete({ where: { id } })
  invalidateCache()
}

// ============================================================================
// CACHED LABEL LOOKUP
// ============================================================================

/**
 * Get slug→name map with 60s TTL cache
 */
export async function getSportTagMap(): Promise<Map<string, string>> {
  const now = Date.now()
  if (tagMapCache && (now - tagMapCacheTime) < CACHE_TTL_MS) {
    return tagMapCache
  }

  const tags = await prisma.sportTag.findMany({
    select: { slug: true, name: true },
  })

  const map = new Map<string, string>()
  for (const tag of tags) {
    map.set(tag.slug, tag.name)
  }

  tagMapCache = map
  tagMapCacheTime = now
  return map
}

/**
 * Synchronous-style label lookup using the cached map.
 * Falls back to title-casing the slug if not found.
 */
export async function getSportTagLabel(slug: string): Promise<string> {
  const map = await getSportTagMap()
  return map.get(slug) || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
