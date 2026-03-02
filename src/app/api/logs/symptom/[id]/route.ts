import { NextRequest, NextResponse } from 'next/server'
import {
  badRequest,
  isIntegerInRange,
  parseOptionalDate,
  requireSession,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const log = await prisma.symptomLog.findFirst({
    where: { id: params.id, patientId: session!.user.profileId },
  })
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(log)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await prisma.symptomLog.findFirst({
    where: { id: params.id, patientId: session!.user.profileId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return badRequest('Invalid request body')
  }

  const input = body as Record<string, unknown>
  const data: {
    datetime?: Date
    painScore?: number
    bloatingScore?: number
    urgencyScore?: number
    nauseaScore?: number
    bowelMovement?: string
    bristolScale?: number | null
    notes?: string | null
  } = {}

  const parsedDate = parseOptionalDate(input.datetime, 'datetime')
  if (parsedDate.error) return parsedDate.error
  if (parsedDate.value) data.datetime = parsedDate.value

  if (input.painScore !== undefined) {
    if (!isIntegerInRange(input.painScore, 0, 10)) return badRequest('painScore must be an integer from 0 to 10')
    data.painScore = input.painScore
  }
  if (input.bloatingScore !== undefined) {
    if (!isIntegerInRange(input.bloatingScore, 0, 10)) {
      return badRequest('bloatingScore must be an integer from 0 to 10')
    }
    data.bloatingScore = input.bloatingScore
  }
  if (input.urgencyScore !== undefined) {
    if (!isIntegerInRange(input.urgencyScore, 0, 10)) {
      return badRequest('urgencyScore must be an integer from 0 to 10')
    }
    data.urgencyScore = input.urgencyScore
  }
  if (input.nauseaScore !== undefined) {
    if (!isIntegerInRange(input.nauseaScore, 0, 10)) {
      return badRequest('nauseaScore must be an integer from 0 to 10')
    }
    data.nauseaScore = input.nauseaScore
  }
  if (input.bowelMovement !== undefined) {
    if (typeof input.bowelMovement !== 'string') return badRequest('bowelMovement must be a string')
    data.bowelMovement = input.bowelMovement
  }
  if (input.bristolScale !== undefined) {
    if (input.bristolScale !== null && !isIntegerInRange(input.bristolScale, 1, 7)) {
      return badRequest('bristolScale must be an integer from 1 to 7')
    }
    data.bristolScale = input.bristolScale
  }
  if (input.notes !== undefined) {
    if (input.notes !== null && typeof input.notes !== 'string') return badRequest('notes must be a string')
    data.notes = typeof input.notes === 'string' ? input.notes : null
  }

  if (Object.keys(data).length === 0) {
    return badRequest('No valid fields provided for update')
  }

  const updated = await prisma.symptomLog.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await prisma.symptomLog.findFirst({
    where: { id: params.id, patientId: session!.user.profileId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.symptomLog.delete({ where: { id: params.id } })

  return new NextResponse(null, { status: 204 })
}
