import { NextRequest, NextResponse } from 'next/server'
import { badRequest, isNumberInRange, requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

const METRICS = ['ADHERENCE_RATE', 'WATER_DAILY_ML'] as const

function isMetric(value: unknown): value is (typeof METRICS)[number] {
  return typeof value === 'string' && METRICS.includes(value as (typeof METRICS)[number])
}

async function getOwnedGoal(id: string, patientId: string) {
  return prisma.patientGoal.findFirst({ where: { id, patientId } })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const goal = await getOwnedGoal(params.id, session!.user.profileId)
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(goal)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedGoal(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const input = body as Record<string, unknown>
  const data: {
    metric?: string
    targetValue?: number
    periodDays?: number
    active?: boolean
  } = {}

  if (input.metric !== undefined) {
    if (!isMetric(input.metric)) return badRequest('metric must be ADHERENCE_RATE or WATER_DAILY_ML')
    data.metric = input.metric
  }
  if (input.targetValue !== undefined) {
    if (!isNumberInRange(input.targetValue, 0, 100000)) return badRequest('targetValue must be a positive number')
    data.targetValue = input.targetValue
  }
  if (input.periodDays !== undefined) {
    if (
      typeof input.periodDays !== 'number' ||
      !Number.isInteger(input.periodDays) ||
      input.periodDays < 1 ||
      input.periodDays > 120
    ) {
      return badRequest('periodDays must be an integer between 1 and 120')
    }
    data.periodDays = input.periodDays
  }
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') return badRequest('active must be a boolean')
    data.active = input.active
  }

  if (Object.keys(data).length === 0) return badRequest('No valid fields provided for update')

  const updated = await prisma.patientGoal.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedGoal(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.patientGoal.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
