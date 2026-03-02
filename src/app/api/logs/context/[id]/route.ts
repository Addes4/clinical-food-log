import { NextRequest, NextResponse } from 'next/server'
import {
  badRequest,
  isIntegerInRange,
  isNumberInRange,
  isStringEnum,
  parseOptionalDate,
  requireSession,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

const EXERCISE_TYPES = ['NONE', 'LIGHT', 'MODERATE', 'INTENSE'] as const

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const log = await prisma.contextLog.findFirst({
    where: { id: params.id, patientId: session!.user.profileId },
  })
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(log)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await prisma.contextLog.findFirst({
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
    stressScore?: number
    sleepHours?: number
    medicationTaken?: string | null
    alcohol?: boolean
    exercise?: string
    notes?: string | null
  } = {}

  const parsedDate = parseOptionalDate(input.datetime, 'datetime')
  if (parsedDate.error) return parsedDate.error
  if (parsedDate.value) data.datetime = parsedDate.value

  if (input.stressScore !== undefined) {
    if (!isIntegerInRange(input.stressScore, 0, 10)) {
      return badRequest('stressScore must be an integer from 0 to 10')
    }
    data.stressScore = input.stressScore
  }
  if (input.sleepHours !== undefined) {
    if (!isNumberInRange(input.sleepHours, 0, 24)) {
      return badRequest('sleepHours must be a number between 0 and 24')
    }
    data.sleepHours = input.sleepHours
  }
  if (input.medicationTaken !== undefined) {
    if (input.medicationTaken !== null && typeof input.medicationTaken !== 'string') {
      return badRequest('medicationTaken must be a string')
    }
    data.medicationTaken = typeof input.medicationTaken === 'string' ? input.medicationTaken : null
  }
  if (input.alcohol !== undefined) {
    if (typeof input.alcohol !== 'boolean') return badRequest('alcohol must be a boolean')
    data.alcohol = input.alcohol
  }
  if (input.exercise !== undefined) {
    if (!isStringEnum(input.exercise, EXERCISE_TYPES)) {
      return badRequest('exercise must be one of NONE, LIGHT, MODERATE, or INTENSE')
    }
    data.exercise = input.exercise
  }
  if (input.notes !== undefined) {
    if (input.notes !== null && typeof input.notes !== 'string') return badRequest('notes must be a string')
    data.notes = typeof input.notes === 'string' ? input.notes : null
  }

  if (Object.keys(data).length === 0) {
    return badRequest('No valid fields provided for update')
  }

  const updated = await prisma.contextLog.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await prisma.contextLog.findFirst({
    where: { id: params.id, patientId: session!.user.profileId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.contextLog.delete({ where: { id: params.id } })

  return new NextResponse(null, { status: 204 })
}
