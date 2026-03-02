import { NextRequest, NextResponse } from 'next/server'
import { badRequest, requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && TIME_REGEX.test(value)
}

async function getOwnedSchedule(id: string, patientId: string) {
  return prisma.medicationSchedule.findFirst({ where: { id, patientId } })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const schedule = await getOwnedSchedule(params.id, session!.user.profileId)
  if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(schedule)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedSchedule(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const input = body as Record<string, unknown>
  const data: {
    medicationName?: string
    dosage?: string | null
    instructions?: string | null
    timeOfDay?: string
    active?: boolean
  } = {}

  if (input.medicationName !== undefined) {
    if (typeof input.medicationName !== 'string' || !input.medicationName.trim()) {
      return badRequest('medicationName must be a non-empty string')
    }
    data.medicationName = input.medicationName.trim()
  }
  if (input.dosage !== undefined) {
    if (input.dosage !== null && typeof input.dosage !== 'string') return badRequest('dosage must be a string')
    data.dosage = typeof input.dosage === 'string' ? input.dosage.trim() : null
  }
  if (input.instructions !== undefined) {
    if (input.instructions !== null && typeof input.instructions !== 'string') {
      return badRequest('instructions must be a string')
    }
    data.instructions = typeof input.instructions === 'string' ? input.instructions.trim() : null
  }
  if (input.timeOfDay !== undefined) {
    if (!isTimeString(input.timeOfDay)) return badRequest('timeOfDay must be in HH:mm format')
    data.timeOfDay = input.timeOfDay
  }
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') return badRequest('active must be a boolean')
    data.active = input.active
  }

  if (Object.keys(data).length === 0) return badRequest('No valid fields provided for update')

  const updated = await prisma.medicationSchedule.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedSchedule(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.medicationSchedule.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
