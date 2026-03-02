import { NextRequest, NextResponse } from 'next/server'
import {
  badRequest,
  isIntegerInRange,
  parseLimitParam,
  parseRequiredDate,
  requireSession,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { findDuplicateSymptomLog } from '@/lib/duplicates'

export async function POST(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return badRequest('Invalid request body')
  }

  const { datetime, painScore, bloatingScore, urgencyScore, nauseaScore, bowelMovement, bristolScale, notes } =
    body as {
      datetime?: unknown
      painScore?: unknown
      bloatingScore?: unknown
      urgencyScore?: unknown
      nauseaScore?: unknown
      bowelMovement?: unknown
      bristolScale?: unknown
      notes?: unknown
    }

  const parsedDate = parseRequiredDate(datetime, 'datetime')
  if (parsedDate.error) return parsedDate.error

  if (
    !isIntegerInRange(painScore, 0, 10) ||
    !isIntegerInRange(bloatingScore, 0, 10) ||
    !isIntegerInRange(urgencyScore, 0, 10) ||
    !isIntegerInRange(nauseaScore, 0, 10)
  ) {
    return badRequest('painScore, bloatingScore, urgencyScore, and nauseaScore must be integers from 0 to 10')
  }
  if (bowelMovement !== undefined && bowelMovement !== null && typeof bowelMovement !== 'string') {
    return badRequest('bowelMovement must be a string')
  }
  if (bristolScale !== undefined && bristolScale !== null && !isIntegerInRange(bristolScale, 1, 7)) {
    return badRequest('bristolScale must be an integer from 1 to 7')
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return badRequest('notes must be a string')
  }

  const duplicateId = await findDuplicateSymptomLog({
    patientId: session!.user.profileId,
    datetime: parsedDate.value,
    painScore,
    bloatingScore,
    urgencyScore,
    nauseaScore,
    bowelMovement: typeof bowelMovement === 'string' ? bowelMovement : '',
    bristolScale: bristolScale == null ? null : bristolScale,
  })
  if (duplicateId) {
    return NextResponse.json(
      { error: 'Possible duplicate symptom log detected.', duplicateId },
      { status: 409 }
    )
  }

  const log = await prisma.symptomLog.create({
    data: {
      patientId: session!.user.profileId,
      datetime: parsedDate.value,
      painScore,
      bloatingScore,
      urgencyScore,
      nauseaScore,
      bowelMovement: typeof bowelMovement === 'string' ? bowelMovement : '',
      bristolScale: bristolScale == null ? null : bristolScale,
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

  const logs = await prisma.symptomLog.findMany({
    where: { patientId: session!.user.profileId },
    orderBy: { datetime: 'desc' },
    take: limit,
  })

  return NextResponse.json(logs)
}
