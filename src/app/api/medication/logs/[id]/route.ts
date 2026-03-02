import { NextRequest, NextResponse } from 'next/server'
import { badRequest, parseOptionalDate, requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

const STATUSES = ['TAKEN', 'MISSED'] as const

function isMedicationStatus(value: unknown): value is (typeof STATUSES)[number] {
  return typeof value === 'string' && STATUSES.includes(value as (typeof STATUSES)[number])
}

async function getOwnedMedicationLog(id: string, patientId: string) {
  return prisma.medicationLog.findFirst({
    where: { id, patientId },
    include: { schedule: true },
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const log = await getOwnedMedicationLog(params.id, session!.user.profileId)
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(log)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedMedicationLog(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const input = body as Record<string, unknown>
  const data: { datetime?: Date; status?: string; notes?: string | null } = {}

  if (input.datetime !== undefined) {
    const parsed = parseOptionalDate(input.datetime, 'datetime')
    if (parsed.error) return parsed.error
    if (parsed.value) data.datetime = parsed.value
  }
  if (input.status !== undefined) {
    if (!isMedicationStatus(input.status)) return badRequest('status must be TAKEN or MISSED')
    data.status = input.status
  }
  if (input.notes !== undefined) {
    if (input.notes !== null && typeof input.notes !== 'string') return badRequest('notes must be a string')
    data.notes = typeof input.notes === 'string' ? input.notes.trim() : null
  }

  if (Object.keys(data).length === 0) return badRequest('No valid fields provided for update')

  const updated = await prisma.medicationLog.update({
    where: { id: params.id },
    data,
    include: { schedule: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedMedicationLog(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.medicationLog.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
