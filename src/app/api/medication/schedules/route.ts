import { NextRequest, NextResponse } from 'next/server'
import { badRequest, parseLimitParam, requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && TIME_REGEX.test(value)
}

export async function GET(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const limit = parseLimitParam(searchParams.get('limit'), 50, 200)
  const includeInactive = searchParams.get('includeInactive') === '1'

  const schedules = await prisma.medicationSchedule.findMany({
    where: {
      patientId: session!.user.profileId,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: [{ active: 'desc' }, { timeOfDay: 'asc' }],
    take: limit,
  })

  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const { medicationName, dosage, instructions, timeOfDay, active } = body as {
    medicationName?: unknown
    dosage?: unknown
    instructions?: unknown
    timeOfDay?: unknown
    active?: unknown
  }

  if (typeof medicationName !== 'string' || !medicationName.trim()) {
    return badRequest('medicationName is required')
  }
  if (dosage !== undefined && dosage !== null && typeof dosage !== 'string') return badRequest('dosage must be a string')
  if (instructions !== undefined && instructions !== null && typeof instructions !== 'string') {
    return badRequest('instructions must be a string')
  }
  if (!isTimeString(timeOfDay)) return badRequest('timeOfDay must be in HH:mm format')
  if (active !== undefined && typeof active !== 'boolean') return badRequest('active must be a boolean')

  const schedule = await prisma.medicationSchedule.create({
    data: {
      patientId: session!.user.profileId,
      medicationName: medicationName.trim(),
      dosage: typeof dosage === 'string' && dosage.trim() ? dosage.trim() : null,
      instructions: typeof instructions === 'string' && instructions.trim() ? instructions.trim() : null,
      timeOfDay,
      active: active ?? true,
    },
  })

  return NextResponse.json(schedule, { status: 201 })
}
