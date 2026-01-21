import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'
import prisma from '@/lib/db/client'
import { upsertQuiz } from '@/lib/services/empoweru'
import { QuestionType } from '@/generated/prisma'

/**
 * GET /api/empoweru/admin/modules/[id]/quiz
 * Get quiz with correct answers (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(req)
    if (!user || user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: moduleId } = await params

    const quiz = await prisma.empowerUQuiz.findUnique({
      where: { moduleId },
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
    })

    if (!quiz) {
      return NextResponse.json({ data: null })
    }

    const data = {
      id: quiz.id,
      module_id: quiz.moduleId,
      title: quiz.title,
      passing_score: quiz.passingScore,
      questions: quiz.questions.map((q) => ({
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

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API] Failed to get quiz:', error)
    return NextResponse.json({ error: 'Failed to get quiz' }, { status: 500 })
  }
}

/**
 * POST /api/empoweru/admin/modules/[id]/quiz
 * Create or update quiz (admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(req)
    if (!user || user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: moduleId } = await params
    const body = await req.json()

    const { title, passingScore, questions } = body

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Title and questions array are required' },
        { status: 400 }
      )
    }

    // Validate questions
    for (const q of questions) {
      if (!q.questionText) {
        return NextResponse.json(
          { error: 'Each question must have questionText' },
          { status: 400 }
        )
      }
      const qType = q.questionType || 'MULTIPLE_CHOICE'
      if (qType === 'SHORT_ANSWER' && !q.correctAnswer) {
        return NextResponse.json(
          { error: 'SHORT_ANSWER questions require correctAnswer' },
          { status: 400 }
        )
      }
      if (qType === 'MULTIPLE_CHOICE' && (!q.options || q.options.length < 2)) {
        return NextResponse.json(
          { error: 'MULTIPLE_CHOICE questions require at least 2 options' },
          { status: 400 }
        )
      }
    }

    // Check module exists
    const module = await prisma.empowerUModule.findUnique({ where: { id: moduleId } })
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    const result = await upsertQuiz({
      moduleId,
      title,
      passingScore: passingScore || 80,
      questions: questions.map((q: {
        questionText: string
        questionType?: string
        correctAnswer?: string
        options?: { optionText: string; isCorrect: boolean }[]
      }) => ({
        questionText: q.questionText,
        questionType: (q.questionType as QuestionType) || QuestionType.MULTIPLE_CHOICE,
        correctAnswer: q.correctAnswer,
        options: q.options,
      })),
    })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('[API] Failed to upsert quiz:', error)
    return NextResponse.json({ error: 'Failed to save quiz' }, { status: 500 })
  }
}

/**
 * DELETE /api/empoweru/admin/modules/[id]/quiz
 * Delete quiz (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(req)
    if (!user || user.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: moduleId } = await params

    const quiz = await prisma.empowerUQuiz.findUnique({ where: { moduleId } })
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    await prisma.empowerUQuiz.delete({ where: { moduleId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Failed to delete quiz:', error)
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 })
  }
}
