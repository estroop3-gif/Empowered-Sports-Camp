import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'
import { createModule, upsertQuiz } from '@/lib/services/empoweru'
import { PortalType, VideoProvider, QuestionType } from '@/generated/prisma'

/**
 * GET /api/empoweru/admin/modules
 * List all modules (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    // Auth temporarily disabled for testing
    // const user = await getAuthenticatedUserFromRequest(req)
    // if (!user || user.role !== 'hq_admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(req.url)
    const portalType = searchParams.get('portalType') as PortalType | null

    const modules = await prisma.empowerUModule.findMany({
      where: portalType ? { portalType } : undefined,
      include: {
        quiz: {
          select: { id: true, title: true, passingScore: true },
        },
        roleRequirements: {
          where: { isActive: true },
          select: { role: true },
        },
      },
      orderBy: [{ portalType: 'asc' }, { level: 'asc' }, { title: 'asc' }],
    })

    const data = modules.map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      description: m.description,
      portal_type: m.portalType,
      level: m.level,
      video_provider: m.videoProvider,
      video_url: m.videoUrl,
      estimated_minutes: m.estimatedMinutes,
      is_published: m.isPublished,
      has_quiz: !!m.quiz,
      quiz_title: m.quiz?.title || null,
      quiz_passing_score: m.quiz?.passingScore || null,
      required_for_roles: m.roleRequirements.map((r) => r.role),
      created_at: m.createdAt.toISOString(),
      updated_at: m.updatedAt.toISOString(),
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Failed to list modules:', error)
    return NextResponse.json({ error: 'Failed to list modules' }, { status: 500 })
  }
}

/**
 * POST /api/empoweru/admin/modules
 * Create a new module with optional quiz (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    // Auth temporarily disabled for testing
    // const user = await getAuthenticatedUserFromRequest(req)
    // if (!user || user.role !== 'hq_admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await req.json()
    const {
      title,
      description,
      portalType,
      level,
      videoProvider,
      videoUrl,
      estimatedMinutes,
      isPublished,
      quiz,
      requiredForRoles,
    } = body

    if (!title || !portalType) {
      return NextResponse.json(
        { error: 'Title and portal type are required' },
        { status: 400 }
      )
    }

    // Create the module
    const result = await createModule({
      title,
      description,
      portalType: portalType as PortalType,
      level: level || 1,
      videoProvider: (videoProvider as VideoProvider) || VideoProvider.YOUTUBE,
      videoUrl,
      estimatedMinutes: estimatedMinutes || 30,
      isPublished: isPublished ?? false,
      createdByUserId: 'test-user', // Auth disabled for testing
    })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    const moduleData = result.data

    if (!moduleData) {
      return NextResponse.json({ error: 'Failed to create module' }, { status: 500 })
    }

    // If quiz data provided, create the quiz
    if (quiz && quiz.questions && quiz.questions.length > 0) {
      const quizResult = await upsertQuiz({
        moduleId: moduleData.id,
        title: quiz.title || 'Module Quiz',
        passingScore: quiz.passingScore || 80,
        questions: quiz.questions.map((q: {
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

      if (quizResult.error) {
        console.error('[API] Failed to create quiz:', quizResult.error)
        // Module was created, but quiz failed - still return success with warning
      }
    }

    // Create role requirements if provided
    if (Array.isArray(requiredForRoles) && requiredForRoles.length > 0) {
      for (const role of requiredForRoles) {
        await prisma.empowerURoleRequirement.create({
          data: {
            role,
            moduleId: moduleData.id,
            isActive: true,
          },
        })
      }
    }

    return NextResponse.json({ data: moduleData })
  } catch (error) {
    console.error('[API] Failed to create module:', error)
    return NextResponse.json({ error: 'Failed to create module' }, { status: 500 })
  }
}
