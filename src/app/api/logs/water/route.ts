import { NextRequest, NextResponse } from 'next/server'
import {
  badRequest,
  isIntegerInRange,
  parseLimitParam,
  parseRequiredDate,
  requireSession,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { findDuplicateWaterLog } from '@/lib/duplicates'

export async function GET(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const limit = parseLimitParam(searchParams.get('limit'), 50, 200)

  const logs = await prisma.waterLog.findMany({
    where: { patientId: session!.user.profileId },
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

  const { datetime, amountMl } = body as { datetime?: unknown; amountMl?: unknown }
  const parsedDate = parseRequiredDate(datetime, 'datetime')
  if (parsedDate.error) return parsedDate.error
  if (!isIntegerInRange(amountMl, 50, 5000)) return badRequest('amountMl must be an integer between 50 and 5000')

  const duplicateId = await findDuplicateWaterLog({
    patientId: session!.user.profileId,
    datetime: parsedDate.value,
    amountMl,
  })
  if (duplicateId) {
    return NextResponse.json({ error: 'Possible duplicate water log detected.', duplicateId }, { status: 409 })
  }

  const log = await prisma.waterLog.create({
    data: {
      patientId: session!.user.profileId,
      datetime: parsedDate.value,
      amountMl,
    },
  })

  return NextResponse.json(log, { status: 201 })
}
