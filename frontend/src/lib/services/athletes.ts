/**
 * Athletes Service
 *
 * Prisma-based service for athlete management.
 */

import prisma from '@/lib/db/client'

// =============================================================================
// Types (snake_case for backward compatibility with pages)
// =============================================================================

export interface Athlete {
  id: string
  parent_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string | null
  grade: string | null
  school: string | null
  medical_notes: string | null
  allergies: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  photo_url: string | null
  tshirt_size?: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch athletes for a parent
 */
export async function fetchAthletesByParent(
  parentId: string
): Promise<{ data: Athlete[] | null; error: Error | null }> {
  try {
    const athletes = await prisma.athlete.findMany({
      where: { parentId },
      orderBy: { firstName: 'asc' },
    })

    return {
      data: athletes.map((a) => ({
        id: a.id,
        parent_id: a.parentId,
        first_name: a.firstName,
        last_name: a.lastName,
        date_of_birth: a.dateOfBirth.toISOString().split('T')[0],
        gender: a.gender,
        grade: a.grade,
        school: a.school,
        medical_notes: a.medicalNotes,
        allergies: a.allergies,
        emergency_contact_name: a.emergencyContactName,
        emergency_contact_phone: a.emergencyContactPhone,
        emergency_contact_relationship: a.emergencyContactRelationship,
        photo_url: a.photoUrl,
        tshirt_size: null, // Not in schema, kept for compatibility
        created_at: a.createdAt.toISOString(),
        updated_at: a.updatedAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    console.error('[Athletes] Failed to fetch athletes:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Fetch a single athlete by ID
 */
export async function fetchAthleteById(
  athleteId: string
): Promise<{ data: Athlete | null; error: Error | null }> {
  try {
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
    })

    if (!athlete) {
      return { data: null, error: null }
    }

    return {
      data: {
        id: athlete.id,
        parent_id: athlete.parentId,
        first_name: athlete.firstName,
        last_name: athlete.lastName,
        date_of_birth: athlete.dateOfBirth.toISOString().split('T')[0],
        gender: athlete.gender,
        grade: athlete.grade,
        school: athlete.school,
        medical_notes: athlete.medicalNotes,
        allergies: athlete.allergies,
        emergency_contact_name: athlete.emergencyContactName,
        emergency_contact_phone: athlete.emergencyContactPhone,
        emergency_contact_relationship: athlete.emergencyContactRelationship,
        photo_url: athlete.photoUrl,
        tshirt_size: null,
        created_at: athlete.createdAt.toISOString(),
        updated_at: athlete.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Athletes] Failed to fetch athlete:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// Mutations
// =============================================================================

export interface CreateAthleteInput {
  parent_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender?: string
  grade?: string
  school?: string
  medical_notes?: string
  allergies?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
}

export interface UpdateAthleteInput {
  first_name?: string
  last_name?: string
  date_of_birth?: string
  gender?: string
  grade?: string
  school?: string
  medical_notes?: string
  allergies?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  photo_url?: string
}

/**
 * Create a new athlete
 */
export async function createAthlete(
  input: CreateAthleteInput
): Promise<{ data: Athlete | null; error: Error | null }> {
  try {
    const athlete = await prisma.athlete.create({
      data: {
        parentId: input.parent_id,
        firstName: input.first_name,
        lastName: input.last_name,
        dateOfBirth: new Date(input.date_of_birth),
        gender: input.gender as 'male' | 'female' | 'other' | undefined,
        grade: input.grade || null,
        school: input.school || null,
        medicalNotes: input.medical_notes || null,
        allergies: input.allergies || null,
        emergencyContactName: input.emergency_contact_name || null,
        emergencyContactPhone: input.emergency_contact_phone || null,
        emergencyContactRelationship: input.emergency_contact_relationship || null,
      },
    })

    return {
      data: {
        id: athlete.id,
        parent_id: athlete.parentId,
        first_name: athlete.firstName,
        last_name: athlete.lastName,
        date_of_birth: athlete.dateOfBirth.toISOString().split('T')[0],
        gender: athlete.gender,
        grade: athlete.grade,
        school: athlete.school,
        medical_notes: athlete.medicalNotes,
        allergies: athlete.allergies,
        emergency_contact_name: athlete.emergencyContactName,
        emergency_contact_phone: athlete.emergencyContactPhone,
        emergency_contact_relationship: athlete.emergencyContactRelationship,
        photo_url: athlete.photoUrl,
        tshirt_size: null,
        created_at: athlete.createdAt.toISOString(),
        updated_at: athlete.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Athletes] Failed to create athlete:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update an athlete
 */
export async function updateAthlete(
  athleteId: string,
  input: UpdateAthleteInput
): Promise<{ data: Athlete | null; error: Error | null }> {
  try {
    const updateData: Record<string, unknown> = {}

    if (input.first_name !== undefined) updateData.firstName = input.first_name
    if (input.last_name !== undefined) updateData.lastName = input.last_name
    if (input.date_of_birth !== undefined) updateData.dateOfBirth = new Date(input.date_of_birth)
    if (input.gender !== undefined) updateData.gender = input.gender
    if (input.grade !== undefined) updateData.grade = input.grade
    if (input.school !== undefined) updateData.school = input.school
    if (input.medical_notes !== undefined) updateData.medicalNotes = input.medical_notes
    if (input.allergies !== undefined) updateData.allergies = input.allergies
    if (input.emergency_contact_name !== undefined) updateData.emergencyContactName = input.emergency_contact_name
    if (input.emergency_contact_phone !== undefined) updateData.emergencyContactPhone = input.emergency_contact_phone
    if (input.emergency_contact_relationship !== undefined) updateData.emergencyContactRelationship = input.emergency_contact_relationship
    if (input.photo_url !== undefined) updateData.photoUrl = input.photo_url

    const athlete = await prisma.athlete.update({
      where: { id: athleteId },
      data: updateData,
    })

    return {
      data: {
        id: athlete.id,
        parent_id: athlete.parentId,
        first_name: athlete.firstName,
        last_name: athlete.lastName,
        date_of_birth: athlete.dateOfBirth.toISOString().split('T')[0],
        gender: athlete.gender,
        grade: athlete.grade,
        school: athlete.school,
        medical_notes: athlete.medicalNotes,
        allergies: athlete.allergies,
        emergency_contact_name: athlete.emergencyContactName,
        emergency_contact_phone: athlete.emergencyContactPhone,
        emergency_contact_relationship: athlete.emergencyContactRelationship,
        photo_url: athlete.photoUrl,
        tshirt_size: null,
        created_at: athlete.createdAt.toISOString(),
        updated_at: athlete.updatedAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    console.error('[Athletes] Failed to update athlete:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete an athlete
 */
export async function deleteAthlete(
  athleteId: string,
  parentId: string
): Promise<{ error: Error | null }> {
  try {
    await prisma.athlete.delete({
      where: {
        id: athleteId,
        parentId, // Ensure parent owns the athlete
      },
    })

    return { error: null }
  } catch (error) {
    console.error('[Athletes] Failed to delete athlete:', error)
    return { error: error as Error }
  }
}
