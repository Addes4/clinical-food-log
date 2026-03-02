import { NextRequest, NextResponse } from 'next/server'
import {
  badRequest,
  isIntegerInRange,
  isNumberInRange,
  isStringEnum,
  parseLimitParam,
  parseRequiredDate,
  requireSession,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { findDuplicateContextLog } from '@/lib/duplicates'

const EXERCISE_TYPES = ['NONE', 'LIGHT', 'MODERATE', 'INTENSE'] as const

export async function POST(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return badRequest('Invalid request body')
  }

  const { datetime, stressScore, sleepHours, medicationTaken, alcohol, exercise, notes } = body as {
    datetime?: unknown
    stressScore?: unknown
    sleepHours?: unknown
    medicationTaken?: unknown
    alcohol?: unknown
    exercise?: unknown
    notes?: unknown
  }

  const parsedDate = parseRequiredDate(datetime, 'datetime')
  if (parsedDate.error) return parsedDate.error

  if (!isIntegerInRange(stressScore, 0, 10)) {
    return badRequest('stressScore must be an integer from 0 to 10')
  }
  if (!isNumberInRange(sleepHours, 0, 24)) {
    return badRequest('sleepHours must be a number between 0 and 24')
  }
  if (typeof alcohol !== 'boolean') {
    return badRequest('alcohol must be a boolean')
  }
  if (!isStringEnum(exercise, EXERCISE_TYPES)) {
    return badRequest('exercise must be one of NONE, LIGHT, MODERATE, or INTENSE')
  }
  if (medicationTaken !== undefined && medicationTaken !== null && typeof medicationTaken !== 'string') {
    return badRequest('medicationTaken must be a string')
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return badRequest('notes must be a string')
  }

  const duplicateId = await findDuplicateContextLog({
    patientId: session!.user.profileId,
    datetime: parsedDate.value,
    stressScore,
    sleepHours,
    alcohol,
    exercise,
  })
  if (duplicateId) {
    return NextResponse.json(
      { error: 'Possible duplicate context log detected.', duplicateId },
      { status: 409 }
    )
  }

  const log = await prisma.contextLog.create({
    data: {
      patientId: session!.user.profileId,
      datetime: parsedDate.value,
      stressScore,
      sleepHours,
      medicationTaken:
        typeof medicationTaken === 'string' && medicationTaken.trim() ? medicationTaken.trim() : null,
      alcohol,
      exercise,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    },
  })

  return NextResponse.json(log, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const limit = parseLimitParam(searchParams.get('limit'))

  const logs = await prisma.contextLog.findMany({
    where: { patientId: session!.user.profileId },
    orderBy: { datetime: 'desc' },
    take: limit,
  })

  return NextResponse.json(logs)
}
