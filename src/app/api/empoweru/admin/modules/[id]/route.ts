import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'
import { updateModule, upsertQuiz } from '@/lib/services/empoweru'
import { PortalType, VideoProvider, QuestionType } from '@/generated/prisma'

/**
 * GET /api/empoweru/admin/modules/[id]
 * Get single module with full details (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth temporarily disabled for testing
    // const user = await getAuthenticatedUserFromRequest(req)
    // if (!user || user.role !== 'hq_admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { id } = await params

    const module = await prisma.empowerUModule.findUnique({
      where: { id },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                options: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
        roleRequirements: {
          where: { isActive: true },
          select: { role: true },
        },
      },
    })

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    console.log('[DEBUG] Module quiz:', JSON.stringify(module.quiz, null, 2))

    const data = {
      id: module.id,
      title: module.title,
      slug: module.slug,
      description: module.description,
      portal_type: module.portalType,
      level: module.level,
      video_provider: module.videoProvider,
      video_url: module.videoUrl,
      estimated_minutes: module.estimatedMinutes,
      is_published: module.isPublished,
      required_for_roles: module.roleRequirements.map((r) => r.role),
      created_at: module.createdAt.toISOString(),
      updated_at: module.updatedAt.toISOString(),
      quiz: module.quiz
        ? {
            id: module.quiz.id,
            title: module.quiz.title,
            passing_score: module.quiz.passingScore,
            questions: module.quiz.questions.map((q) => ({
              id: q.id,
              question_text: q.questionText,
              question_type: q.questionType,
              order_index: q.orderIndex,
              correct_answer: q.correctAnswer,
              options: q.options.map((o) => ({
                id: o.id,
                option_text: o.optionText,
                is_correct: o.isCorrect,
                order_index: o.orderIndex,
              })),
            })),
          }
        : null,
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Failed to get module:', error)
    return NextResponse.json({ error: 'Failed to get module' }, { status: 500 })
  }
}

/**
 * PATCH /api/empoweru/admin/modules/[id]
 * Update a module with optional quiz (admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth temporarily disabled for testing
    // const user = await getAuthenticatedUserFromRequest(req)
    // if (!user || user.role !== 'hq_admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { id } = await params
    const body = await req.json()

    // Check if module exists
    const existing = await prisma.empowerUModule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.portalType !== undefined) updateData.portalType = body.portalType as PortalType
    if (body.level !== undefined) updateData.level = body.level
    if (body.videoProvider !== undefined) updateData.videoProvider = body.videoProvider as VideoProvider
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl
    if (body.estimatedMinutes !== undefined) updateData.estimatedMinutes = body.estimatedMinutes
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished

    // If only using updateModule service fields
    if (body.title || body.description || body.level || body.videoUrl || body.estimatedMinutes || body.isPublished !== undefined) {
      const result = await updateModule({
        moduleId: id,
        title: body.title,
        description: body.description,
        level: body.level,
        videoUrl: body.videoUrl,
        estimatedMinutes: body.estimatedMinutes,
        isPublished: body.isPublished,
      })

      if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 500 })
      }
    }

    // Handle fields not in updateModule (portalType, videoProvider)
    if (body.portalType !== undefined || body.videoProvider !== undefined) {
      await prisma.empowerUModule.update({
        where: { id },
        data: {
          ...(body.portalType && { portalType: body.portalType as PortalType }),
          ...(body.videoProvider && { videoProvider: body.videoProvider as VideoProvider }),
        },
      })
    }

    // Handle quiz updates
    console.log('[DEBUG] Quiz data received:', JSON.stringify(body.quiz, null, 2))
    console.log('[DEBUG] Quiz questions length:', body.quiz?.questions?.length)
    if (body.quiz !== undefined) {
      if (body.quiz === null) {
        // Delete existing quiz if it exists
        await prisma.empowerUQuiz.deleteMany({ where: { moduleId: id } })
      } else if (body.quiz.questions && body.quiz.questions.length > 0) {
        // Upsert the quiz
        const quizResult = await upsertQuiz({
          moduleId: id,
          title: body.quiz.title || 'Module Quiz',
          passingScore: body.quiz.passingScore || 80,
          questions: body.quiz.questions.map((q: {
            questionText: string
            questionType?: string
            correctAnswer?: string
            options?: { optionText: string; isCorrect: boolean }[]
          }) => {
            // Validate and convert questionType
            let validQuestionType: QuestionType = QuestionType.MULTIPLE_CHOICE
            if (q.questionType === 'MULTIPLE_CHOICE') validQuestionType = QuestionType.MULTIPLE_CHOICE
            else if (q.questionType === 'TRUE_FALSE') validQuestionType = QuestionType.TRUE_FALSE
            else if (q.questionType === 'SHORT_ANSWER') validQuestionType = QuestionType.SHORT_ANSWER

            return {
              questionText: q.questionText,
              questionType: validQuestionType,
              correctAnswer: q.correctAnswer,
              options: q.options,
            }
          }),
        })

        console.log('[DEBUG] Quiz upsert result:', quizResult.data ? 'success' : 'no data')
        if (quizResult.error) {
          console.error('[API] Failed to update quiz:', quizResult.error)
        }
      } else {
        console.log('[DEBUG] No questions to save, skipping quiz')
      }
    } else {
      console.log('[DEBUG] body.quiz is undefined, not updating quiz')
    }

    // Handle role requirements updates
    if (body.requiredForRoles !== undefined) {
      // Deactivate all existing requirements for this module
      await prisma.empowerURoleRequirement.updateMany({
        where: { moduleId: id },
        data: { isActive: false },
      })

      // Create new requirements
      if (Array.isArray(body.requiredForRoles) && body.requiredForRoles.length > 0) {
        for (const role of body.requiredForRoles) {
          await prisma.empowerURoleRequirement.upsert({
            where: {
              role_moduleId: { role, moduleId: id },
            },
            create: {
              role,
              moduleId: id,
              isActive: true,
            },
            update: {
              isActive: true,
            },
          })
        }
      }
    }

    // Re-fetch updated module
    const updated = await prisma.empowerUModule.findUnique({
      where: { id },
      include: {
        quiz: { select: { id: true } },
      },
    })

    return NextResponse.json({
      data: {
        id: updated!.id,
        title: updated!.title,
        slug: updated!.slug,
        description: updated!.description,
        portal_type: updated!.portalType,
        level: updated!.level,
        video_provider: updated!.videoProvider,
        video_url: updated!.videoUrl,
        estimated_minutes: updated!.estimatedMinutes,
        is_published: updated!.isPublished,
        has_quiz: !!updated!.quiz,
      },
    })
  } catch (error) {
    console.error('[API] Failed to update module:', error)
    return NextResponse.json({ error: 'Failed to update module' }, { status: 500 })
  }
}

/**
 * DELETE /api/empoweru/admin/modules/[id]
 * Delete a module (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth temporarily disabled for testing
    // const user = await getAuthenticatedUserFromRequest(req)
    // if (!user || user.role !== 'hq_admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { id } = await params

    // Check if module exists
    const existing = await prisma.empowerUModule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Delete the module (cascades to quiz, questions, options, progress)
    await prisma.empowerUModule.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Failed to delete module:', error)
    return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 })
  }
}
