/**
 * Volunteer Sign-Up Services
 *
 * Prisma-based data access for volunteer sign-ups.
 * Returns { data, error } pattern matching existing service conventions.
 */

import prisma from '@/lib/db/client'

export interface CreateVolunteerSignupInput {
  first_name: string
  last_name: string
  age: number
  incoming_grade: string
  phone: string
  camp_ids: string[]
  notes?: string
}

export interface VolunteerSignup {
  id: string
  first_name: string
  last_name: string
  age: number
  incoming_grade: string
  phone: string
  camp_ids: string[]
  notes: string | null
  status: string
  created_at: string
  updated_at: string
}

export async function createVolunteerSignup(
  input: CreateVolunteerSignupInput
): Promise<{ data: VolunteerSignup | null; error: Error | null }> {
  try {
    const signup = await prisma.volunteerSignup.create({
      data: {
        firstName: input.first_name,
        lastName: input.last_name,
        age: input.age,
        incomingGrade: input.incoming_grade,
        phone: input.phone,
        campIds: input.camp_ids,
        notes: input.notes || null,
        status: 'pending',
      },
    })

    const mapped: VolunteerSignup = {
      id: signup.id,
      first_name: signup.firstName,
      last_name: signup.lastName,
      age: signup.age,
      incoming_grade: signup.incomingGrade,
      phone: signup.phone,
      camp_ids: signup.campIds,
      notes: signup.notes,
      status: signup.status,
      created_at: signup.createdAt.toISOString(),
      updated_at: signup.updatedAt.toISOString(),
    }

    return { data: mapped, error: null }
  } catch (err) {
    console.error('Failed to create volunteer signup:', err)
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}
