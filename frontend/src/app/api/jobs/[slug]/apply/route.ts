import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'
import { createJobApplication } from '@/lib/services/jobApplications'

/**
 * POST /api/jobs/[slug]/apply
 * Submit a job application (public endpoint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()

    const {
      firstName,
      lastName,
      email,
      phone,
      city,
      state,
      age,
      coverLetter,
      linkedinUrl,
      howHeard,
      availabilityJson,
      certificationsJson,
      applicantNotes,
      backgroundCheckAcknowledged,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

    // Find the job posting
    const job = await prisma.jobPosting.findFirst({
      where: {
        slug,
        status: 'open',
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job posting not found or is no longer accepting applications' },
        { status: 404 }
      )
    }

    // Create the application using service
    const { data, error } = await createJobApplication({
      job_id: job.id,
      tenant_id: job.tenantId || undefined,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      city,
      state,
      age,
      cover_letter: coverLetter,
      linkedin_url: linkedinUrl,
      how_heard: howHeard,
      availability_json: availabilityJson,
      certifications_json: certificationsJson,
      applicant_notes: applicantNotes,
      background_check_acknowledged: backgroundCheckAcknowledged,
    })

    if (error) {
      // Check for duplicate application error
      if (error.message.includes('already submitted')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        id: data!.id,
        message: 'Application submitted successfully',
      },
    })
  } catch (error) {
    console.error('Error submitting job application:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
