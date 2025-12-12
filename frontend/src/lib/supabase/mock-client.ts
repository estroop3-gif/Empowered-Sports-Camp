/**
 * Mock Supabase client for development while services are down
 *
 * Set NEXT_PUBLIC_USE_MOCK=true in .env.local to enable
 */

import { mockTenant, mockCamps, mockAddons, mockUser, mockAthletes, mockLocation, mockPublicCampCards } from './mock-data'

type MockQueryResult<T> = {
  data: T | null
  error: null | { message: string }
}

// Simulated delay to mimic network requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type FilterOp = { column: string; op: string; value: unknown }

class MockQueryBuilder<T> {
  private table: string
  private filters: Record<string, unknown> = {}
  private advancedFilters: FilterOp[] = []
  private orFilters: string[] = []
  private selectedFields: string = '*'
  private limitCount: number | null = null
  private rangeStart: number | null = null
  private rangeEnd: number | null = null
  private isSingle: boolean = false
  private countOption: 'exact' | null = null

  constructor(table: string) {
    this.table = table
  }

  select(fields: string = '*', options?: { count?: 'exact' }) {
    this.selectedFields = fields
    if (options?.count) {
      this.countOption = options.count
    }
    return this
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value
    return this
  }

  ilike(column: string, pattern: string) {
    this.advancedFilters.push({ column, op: 'ilike', value: pattern })
    return this
  }

  gte(column: string, value: unknown) {
    this.advancedFilters.push({ column, op: 'gte', value })
    return this
  }

  lte(column: string, value: unknown) {
    this.advancedFilters.push({ column, op: 'lte', value })
    return this
  }

  not(column: string, op: string, value: unknown) {
    this.advancedFilters.push({ column, op: `not_${op}`, value })
    return this
  }

  or(filterString: string) {
    this.orFilters.push(filterString)
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  range(start: number, end: number) {
    this.rangeStart = start
    this.rangeEnd = end
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  order(_column: string, _options?: { ascending?: boolean }) {
    return this
  }

  async then<TResult>(
    onfulfilled?: ((value: MockQueryResult<T>) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    await delay(100) // Simulate network delay

    let result: unknown = null

    switch (this.table) {
      case 'tenants':
        if (this.filters.slug) {
          result = this.filters.slug === mockTenant.slug ? mockTenant : null
        } else if (this.filters.id) {
          result = this.filters.id === mockTenant.id ? mockTenant : null
        } else {
          result = [mockTenant]
        }
        break

      case 'camps':
        if (this.filters.slug && this.filters.tenant_id) {
          result = mockCamps.find(c => c.slug === this.filters.slug) || null
        } else if (this.filters.tenant_id) {
          result = mockCamps.filter(c => c.tenant_id === this.filters.tenant_id)
        } else if (this.filters.id) {
          result = mockCamps.find(c => c.id === this.filters.id) || null
        } else {
          result = mockCamps
        }
        break

      case 'locations':
        if (this.filters.id) {
          result = this.filters.id === mockLocation.id ? mockLocation : null
        } else {
          result = [mockLocation]
        }
        break

      case 'addons':
        if (this.filters.camp_id) {
          result = mockAddons.filter(a => a.camp_id === this.filters.camp_id)
        } else {
          result = mockAddons
        }
        break

      case 'athletes':
        if (this.filters.parent_id) {
          result = mockAthletes.filter(a => a.parent_id === this.filters.parent_id)
        } else {
          result = mockAthletes
        }
        break

      case 'user_roles':
        result = this.isSingle ? { role: 'parent', tenant_id: null } : []
        break

      case 'profiles':
        result = this.isSingle ? { id: mockUser.id, email: mockUser.email, full_name: 'John Parent' } : []
        break

      case 'public_camp_cards':
        // Start with all camps
        let camps = [...mockPublicCampCards]

        // Apply eq filters
        if (this.filters.slug) {
          camps = camps.filter(c => c.slug === this.filters.slug)
        }
        if (this.filters.id) {
          camps = camps.filter(c => c.id === this.filters.id)
        }
        if (this.filters.featured !== undefined) {
          camps = camps.filter(c => c.featured === this.filters.featured)
        }
        if (this.filters.is_full !== undefined) {
          camps = camps.filter(c => c.is_full === this.filters.is_full)
        }
        if (this.filters.program_type) {
          camps = camps.filter(c => c.program_type === this.filters.program_type)
        }
        if (this.filters.tenant_id) {
          camps = camps.filter(c => c.tenant_id === this.filters.tenant_id)
        }

        // Apply advanced filters
        for (const filter of this.advancedFilters) {
          const { column, op, value } = filter
          if (op === 'ilike') {
            const pattern = String(value).replace(/%/g, '').toLowerCase()
            camps = camps.filter(c => {
              const fieldValue = (c as Record<string, unknown>)[column]
              return fieldValue && String(fieldValue).toLowerCase().includes(pattern)
            })
          } else if (op === 'gte') {
            camps = camps.filter(c => {
              const fieldValue = (c as Record<string, unknown>)[column]
              return fieldValue !== null && fieldValue !== undefined && Number(fieldValue) >= Number(value)
            })
          } else if (op === 'lte') {
            camps = camps.filter(c => {
              const fieldValue = (c as Record<string, unknown>)[column]
              return fieldValue !== null && fieldValue !== undefined && Number(fieldValue) <= Number(value)
            })
          }
        }

        // Apply OR filters (simplified - just check name and city)
        for (const orFilter of this.orFilters) {
          if (orFilter.includes('name.ilike') || orFilter.includes('city.ilike')) {
            const searchMatch = orFilter.match(/\.ilike\.%([^%]+)%/)
            if (searchMatch) {
              const searchTerm = searchMatch[1].toLowerCase()
              camps = camps.filter(c =>
                c.name.toLowerCase().includes(searchTerm) ||
                (c.city && c.city.toLowerCase().includes(searchTerm)) ||
                (c.description && c.description.toLowerCase().includes(searchTerm))
              )
            }
          }
        }

        result = camps
        break

      default:
        result = this.isSingle ? null : []
    }

    // Handle single vs array
    if (this.isSingle && Array.isArray(result)) {
      result = result[0] || null
    }

    // Get total count before pagination
    const totalCount = Array.isArray(result) ? result.length : (result ? 1 : 0)

    // Apply range (pagination)
    if (this.rangeStart !== null && this.rangeEnd !== null && Array.isArray(result)) {
      result = result.slice(this.rangeStart, this.rangeEnd + 1)
    }

    // Apply limit
    if (this.limitCount && Array.isArray(result)) {
      result = result.slice(0, this.limitCount)
    }

    const response: MockQueryResult<T> & { count?: number } = {
      data: result as T,
      error: null,
    }

    // Add count if requested
    if (this.countOption === 'exact') {
      response.count = totalCount
    }

    if (onfulfilled) {
      return onfulfilled(response)
    }
    return response as TResult
  }
}

class MockAuth {
  private currentUser = mockUser

  async getSession() {
    await delay(50)
    return {
      data: {
        session: {
          user: this.currentUser,
          access_token: 'mock-token',
        },
      },
      error: null,
    }
  }

  async getUser() {
    await delay(50)
    return {
      data: { user: this.currentUser },
      error: null,
    }
  }

  async signUp({ email, password }: { email: string; password: string }) {
    await delay(200)
    console.log('[Mock] Sign up:', email)
    return {
      data: {
        user: { ...mockUser, email },
        session: { user: { ...mockUser, email }, access_token: 'mock-token' },
      },
      error: null,
    }
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    await delay(200)
    console.log('[Mock] Sign in:', email)
    return {
      data: {
        user: { ...mockUser, email },
        session: { user: { ...mockUser, email }, access_token: 'mock-token' },
      },
      error: null,
    }
  }

  async signOut() {
    await delay(100)
    console.log('[Mock] Sign out')
    return { error: null }
  }

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    // Immediately call with current session
    setTimeout(() => {
      callback('SIGNED_IN', { user: this.currentUser })
    }, 100)

    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    }
  }
}

export class MockSupabaseClient {
  auth = new MockAuth()

  from<T = unknown>(table: string) {
    console.log(`[Mock] Query: ${table}`)
    return new MockQueryBuilder<T>(table)
  }
}

export function createMockClient() {
  return new MockSupabaseClient()
}

// Check if we should use mock
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'
