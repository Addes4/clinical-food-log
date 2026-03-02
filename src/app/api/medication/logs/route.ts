import { NextRequest, NextResponse } from 'next/server'
import {
  badRequest,
  parseLimitParam,
  parseRequiredDate,
  requireSession,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { findDuplicateMedicationLog } from '@/lib/duplicates'

const STATUSES = ['TAKEN', 'MISSED'] as const

function isMedicationStatus(value: unknown): value is (typeof STATUSES)[number] {
  return typeof value === 'string' && STATUSES.includes(value as (typeof STATUSES)[number])
}

export async function GET(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const limit = parseLimitParam(searchParams.get('limit'), 80, 300)

  const logs = await prisma.medicationLog.findMany({
    where: { patientId: session!.user.profileId },
    include: { schedule: true },
    orderBy: { datetime: 'desc' },
    take: limit,
  })

  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const { scheduleId, datetime, status, notes } = body as {
    scheduleId?: unknown
    datetime?: unknown
    status?: unknown
    notes?: unknown
  }

  const parsedDate = parseRequiredDate(datetime, 'datetime')
  if (parsedDate.error) return parsedDate.error
  if (!isMedicationStatus(status)) return badRequest('status must be TAKEN or MISSED')
  if (notes !== undefined && notes !== null && typeof notes !== 'string') return badRequest('notes must be a string')

  let validatedScheduleId: string | null = null
  if (scheduleId != null) {
    if (typeof scheduleId !== 'string' || !scheduleId) return badRequest('scheduleId must be a string')
    const schedule = await prisma.medicationSchedule.findFirst({
      where: {
        id: scheduleId,
        patientId: session!.user.profileId,
      },
      select: { id: true },
    })
    if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    validatedScheduleId = schedule.id
  }

  const duplicateId = await findDuplicateMedicationLog({
    patientId: session!.user.profileId,
    scheduleId: validatedScheduleId,
    datetime: parsedDate.value,
    status,
  })
  if (duplicateId) {
    return NextResponse.json({ error: 'Possible duplicate medication log detected.', duplicateId }, { status: 409 })
  }

  const log = await prisma.medicationLog.create({
    data: {
      patientId: session!.user.profileId,
      scheduleId: validatedScheduleId,
      datetime: parsedDate.value,
      status,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    },
    include: { schedule: true },
  })

  return NextResponse.json(log, { status: 201 })
}
