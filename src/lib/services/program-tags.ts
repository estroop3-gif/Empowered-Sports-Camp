/**
 * ProgramTag Service
 *
 * CRUD operations and cached label lookup for program tags.
 */

import prisma from '@/lib/db/client'

// ============================================================================
// TYPES
// ============================================================================

export interface ProgramTagData {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProgramTagWithCount extends ProgramTagData {
  campCount: number
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
 * Fetch active program tags for dropdowns/filters
 */
export async function fetchActiveProgramTags(): Promise<{ slug: string; name: string; sortOrder: number }[]> {
  const tags = await prisma.programTag.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  })
  return tags
}

/**
 * Fetch all program tags including inactive, with camp usage count
 */
export async function fetchAllProgramTags(): Promise<ProgramTagWithCount[]> {
  const tags = await prisma.programTag.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  // Get camp counts per program type slug
  const campCounts = await prisma.camp.groupBy({
    by: ['programType'],
    _count: { id: true },
  })

  const countMap = new Map<string, number>()
  for (const row of campCounts) {
    countMap.set(row.programType, row._count.id)
  }

  return tags.map(tag => ({
    id: tag.id,
    slug: tag.slug,
    name: tag.name,
    description: tag.description,
    sortOrder: tag.sortOrder,
    isActive: tag.isActive,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
    campCount: countMap.get(tag.slug) || 0,
  }))
}

// ============================================================================
// ADMIN MUTATIONS
// ============================================================================

/**
 * Create a new program tag
 */
export async function createProgramTag(data: {
  name: string
  slug?: string
  description?: string
  sortOrder?: number
}): Promise<ProgramTagData> {
  const slug = data.slug || data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  const tag = await prisma.programTag.create({
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
 * Update an existing program tag
 */
export async function updateProgramTag(
  id: string,
  data: Partial<{
    name: string
    slug: string
    description: string | null
    sortOrder: number
    isActive: boolean
  }>
): Promise<ProgramTagData> {
  const tag = await prisma.programTag.update({
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
 * Delete a program tag (only if no camps reference it)
 */
export async function deleteProgramTag(id: string): Promise<void> {
  const tag = await prisma.programTag.findUnique({ where: { id } })
  if (!tag) throw new Error('Program tag not found')

  // Check if any camps use this tag
  const campCount = await prisma.camp.count({
    where: { programType: tag.slug },
  })

  if (campCount > 0) {
    throw new Error(`Cannot delete: ${campCount} camp(s) use this program type`)
  }

  await prisma.programTag.delete({ where: { id } })
  invalidateCache()
}

// ============================================================================
// CACHED LABEL LOOKUP
// ============================================================================

/**
 * Get slug→name map with 60s TTL cache
 */
export async function getProgramTagMap(): Promise<Map<string, string>> {
  const now = Date.now()
  if (tagMapCache && (now - tagMapCacheTime) < CACHE_TTL_MS) {
    return tagMapCache
  }

  const tags = await prisma.programTag.findMany({
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
export async function getProgramTagLabel(slug: string): Promise<string> {
  const map = await getProgramTagMap()
  return map.get(slug) || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
