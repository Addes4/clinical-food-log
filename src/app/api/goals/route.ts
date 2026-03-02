import { NextRequest, NextResponse } from 'next/server'
import { badRequest, isNumberInRange, requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

const METRICS = ['ADHERENCE_RATE', 'WATER_DAILY_ML'] as const

function isMetric(value: unknown): value is (typeof METRICS)[number] {
  return typeof value === 'string' && METRICS.includes(value as (typeof METRICS)[number])
}

export async function GET() {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const goals = await prisma.patientGoal.findMany({
    where: { patientId: session!.user.profileId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const { metric, targetValue, periodDays, active } = body as {
    metric?: unknown
    targetValue?: unknown
    periodDays?: unknown
    active?: unknown
  }

  if (!isMetric(metric)) return badRequest('metric must be ADHERENCE_RATE or WATER_DAILY_ML')
  if (!isNumberInRange(targetValue, 0, 100000)) return badRequest('targetValue must be a positive number')
  if (typeof periodDays !== 'number' || !Number.isInteger(periodDays) || periodDays < 1 || periodDays > 120) {
    return badRequest('periodDays must be an integer between 1 and 120')
  }
  if (active !== undefined && typeof active !== 'boolean') return badRequest('active must be a boolean')

  const goal = await prisma.patientGoal.upsert({
    where: {
      patientId_metric: {
        patientId: session!.user.profileId,
        metric,
      },
    },
    create: {
      patientId: session!.user.profileId,
      metric,
      targetValue,
      periodDays,
      active: active ?? true,
    },
    update: {
      targetValue,
      periodDays,
      active: active ?? true,
    },
  })

  return NextResponse.json(goal, { status: 201 })
}
