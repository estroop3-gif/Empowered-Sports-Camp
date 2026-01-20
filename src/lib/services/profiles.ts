/**
 * Profiles Service
 *
 * Prisma-based service for user profile management.
 */

import prisma from '@/lib/db/client'

// =============================================================================
// Types (snake_case for backward compatibility with pages)
// =============================================================================

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  avatar_url: string | null
  has_completed_lms_core: boolean
  has_completed_lms_director: boolean
  has_completed_lms_volunteer: boolean
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch a profile by ID
 */
export async function fetchProfileById(
  profileId: string
): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    })

    if (!profile) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        address_line_1: profile.addressLine1,
        address_line_2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zipCode,
        emergency_contact_name: profile.emergencyContactName,
        emergency_contact_phone: profile.emergencyContactPhone,
        emergency_contact_relationship: profile.emergencyContactRelationship,
        avatar_url: profile.avatarUrl,
        has_completed_lms_core: profile.hasCompletedLmsCore,
        has_completed_lms_director: profile.hasCompletedLmsDirector,
        has_completed_lms_volunteer: profile.hasCompletedLmsVolunteer,
        onboarding_completed_at: profile.onboardingCompletedAt?.toISOString() || null,
        created_at: profile.createdAt.toISOString(),
        updated_at: profile.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Profiles] Failed to fetch profile:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch a profile by email
 */
export async function fetchProfileByEmail(
  email: string
): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const profile = await prisma.profile.findFirst({
      where: { email },
    })

    if (!profile) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        address_line_1: profile.addressLine1,
        address_line_2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zipCode,
        emergency_contact_name: profile.emergencyContactName,
        emergency_contact_phone: profile.emergencyContactPhone,
        emergency_contact_relationship: profile.emergencyContactRelationship,
        avatar_url: profile.avatarUrl,
        has_completed_lms_core: profile.hasCompletedLmsCore,
        has_completed_lms_director: profile.hasCompletedLmsDirector,
        has_completed_lms_volunteer: profile.hasCompletedLmsVolunteer,
        onboarding_completed_at: profile.onboardingCompletedAt?.toISOString() || null,
        created_at: profile.createdAt.toISOString(),
        updated_at: profile.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Profiles] Failed to fetch profile by email:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Mutations
// =============================================================================

export interface CreateProfileInput {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  zip_code?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
}

export interface UpdateProfileInput {
  first_name?: string
  last_name?: string
  phone?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  zip_code?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  avatar_url?: string
}

/**
 * Create a new profile
 */
export async function createProfile(
  input: CreateProfileInput
): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const profile = await prisma.profile.create({
      data: {
        id: input.id,
        email: input.email,
        firstName: input.first_name || null,
        lastName: input.last_name || null,
        phone: input.phone || null,
        addressLine1: input.address_line_1 || null,
        addressLine2: input.address_line_2 || null,
        city: input.city || null,
        state: input.state || null,
        zipCode: input.zip_code || null,
        emergencyContactName: input.emergency_contact_name || null,
        emergencyContactPhone: input.emergency_contact_phone || null,
        emergencyContactRelationship: input.emergency_contact_relationship || null,
      },
    })

    return {
      data: {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        address_line_1: profile.addressLine1,
        address_line_2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zipCode,
        emergency_contact_name: profile.emergencyContactName,
        emergency_contact_phone: profile.emergencyContactPhone,
        emergency_contact_relationship: profile.emergencyContactRelationship,
        avatar_url: profile.avatarUrl,
        has_completed_lms_core: profile.hasCompletedLmsCore,
        has_completed_lms_director: profile.hasCompletedLmsDirector,
        has_completed_lms_volunteer: profile.hasCompletedLmsVolunteer,
        onboarding_completed_at: profile.onboardingCompletedAt?.toISOString() || null,
        created_at: profile.createdAt.toISOString(),
        updated_at: profile.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Profiles] Failed to create profile:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a profile
 */
export async function updateProfile(
  profileId: string,
  input: UpdateProfileInput
): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const updateData: Record<string, unknown> = {}

    if (input.first_name !== undefined) updateData.firstName = input.first_name
    if (input.last_name !== undefined) updateData.lastName = input.last_name
    if (input.phone !== undefined) updateData.phone = input.phone
    if (input.address_line_1 !== undefined) updateData.addressLine1 = input.address_line_1
    if (input.address_line_2 !== undefined) updateData.addressLine2 = input.address_line_2
    if (input.city !== undefined) updateData.city = input.city
    if (input.state !== undefined) updateData.state = input.state
    if (input.zip_code !== undefined) updateData.zipCode = input.zip_code
    if (input.emergency_contact_name !== undefined) updateData.emergencyContactName = input.emergency_contact_name
    if (input.emergency_contact_phone !== undefined) updateData.emergencyContactPhone = input.emergency_contact_phone
    if (input.emergency_contact_relationship !== undefined) updateData.emergencyContactRelationship = input.emergency_contact_relationship
    if (input.avatar_url !== undefined) updateData.avatarUrl = input.avatar_url

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: updateData,
    })

    return {
      data: {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        address_line_1: profile.addressLine1,
        address_line_2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zipCode,
        emergency_contact_name: profile.emergencyContactName,
        emergency_contact_phone: profile.emergencyContactPhone,
        emergency_contact_relationship: profile.emergencyContactRelationship,
        avatar_url: profile.avatarUrl,
        has_completed_lms_core: profile.hasCompletedLmsCore,
        has_completed_lms_director: profile.hasCompletedLmsDirector,
        has_completed_lms_volunteer: profile.hasCompletedLmsVolunteer,
        onboarding_completed_at: profile.onboardingCompletedAt?.toISOString() || null,
        created_at: profile.createdAt.toISOString(),
        updated_at: profile.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Profiles] Failed to update profile:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(
  profileId: string
): Promise<{ error: Error | null }> {
  try {
    await prisma.profile.update({
      where: { id: profileId },
      data: { onboardingCompletedAt: new Date() },
    })

    return { error: null }
  } catch (error) {
    console.error('[Profiles] Failed to complete onboarding:', error)
    return { error: error as Error }
  }
}

// =============================================================================
// Registration-specific queries
// =============================================================================

export interface ProfileWithAthletes extends Profile {
  athletes: {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string
    gender: string | null
    grade: string | null
    tshirt_size: string | null
    medical_notes: string | null
    allergies: string | null
  }[]
}

/**
 * Fetch a profile with athletes for registration flow
 */
export async function fetchProfileWithAthletes(
  profileId: string
): Promise<{ data: ProfileWithAthletes | null; error: Error | null }> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        athletes: {
          where: { isActive: true },
          orderBy: { firstName: 'asc' },
        },
      },
    })

    if (!profile) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        address_line_1: profile.addressLine1,
        address_line_2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zipCode,
        emergency_contact_name: profile.emergencyContactName,
        emergency_contact_phone: profile.emergencyContactPhone,
        emergency_contact_relationship: profile.emergencyContactRelationship,
        avatar_url: profile.avatarUrl,
        has_completed_lms_core: profile.hasCompletedLmsCore,
        has_completed_lms_director: profile.hasCompletedLmsDirector,
        has_completed_lms_volunteer: profile.hasCompletedLmsVolunteer,
        onboarding_completed_at: profile.onboardingCompletedAt?.toISOString() || null,
        created_at: profile.createdAt.toISOString(),
        updated_at: profile.updatedAt.toISOString(),
        athletes: profile.athletes.map((a) => ({
          id: a.id,
          first_name: a.firstName,
          last_name: a.lastName,
          date_of_birth: a.dateOfBirth.toISOString().split('T')[0],
          gender: a.gender,
          grade: a.grade,
          tshirt_size: a.tShirtSize,
          medical_notes: a.medicalNotes,
          allergies: a.allergies,
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Profiles] Failed to fetch profile with athletes:', error)
    return { data: null, error: error as Error }
  }
}
