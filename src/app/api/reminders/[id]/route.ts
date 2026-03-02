import { NextRequest, NextResponse } from 'next/server'
import {
  badRequest,
  isIntegerInRange,
  parseOptionalDate,
  requireSession,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && TIME_REGEX.test(value)
}

async function getOwnedReminder(id: string, patientId: string) {
  return prisma.symptomReminder.findFirst({
    where: { id, patientId },
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const reminder = await getOwnedReminder(params.id, session!.user.profileId)
  if (!reminder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(reminder)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedReminder(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const input = body as Record<string, unknown>
  const data: {
    label?: string
    timeOfDay?: string
    enabled?: boolean
    snoozeMinutes?: number
    quietHoursStart?: string | null
    quietHoursEnd?: string | null
    snoozedUntil?: Date | null
  } = {}

  if (input.action === 'SNOOZE_NOW') {
    data.snoozedUntil = new Date(Date.now() + existing.snoozeMinutes * 60 * 1000)
  }
  if (input.action === 'CLEAR_SNOOZE') {
    data.snoozedUntil = null
  }

  if (input.label !== undefined) {
    if (typeof input.label !== 'string' || !input.label.trim()) return badRequest('label must be a non-empty string')
    data.label = input.label.trim()
  }
  if (input.timeOfDay !== undefined) {
    if (!isTimeString(input.timeOfDay)) return badRequest('timeOfDay must be in HH:mm format')
    data.timeOfDay = input.timeOfDay
  }
  if (input.enabled !== undefined) {
    if (typeof input.enabled !== 'boolean') return badRequest('enabled must be a boolean')
    data.enabled = input.enabled
  }
  if (input.snoozeMinutes !== undefined) {
    if (!isIntegerInRange(input.snoozeMinutes, 5, 240)) {
      return badRequest('snoozeMinutes must be an integer between 5 and 240')
    }
    data.snoozeMinutes = input.snoozeMinutes
  }
  if (input.quietHoursStart !== undefined) {
    if (input.quietHoursStart !== null && !isTimeString(input.quietHoursStart)) {
      return badRequest('quietHoursStart must be in HH:mm format')
    }
    data.quietHoursStart = input.quietHoursStart as string | null
  }
  if (input.quietHoursEnd !== undefined) {
    if (input.quietHoursEnd !== null && !isTimeString(input.quietHoursEnd)) {
      return badRequest('quietHoursEnd must be in HH:mm format')
    }
    data.quietHoursEnd = input.quietHoursEnd as string | null
  }
  if (input.snoozedUntil !== undefined) {
    const parsed = parseOptionalDate(input.snoozedUntil, 'snoozedUntil')
    if (parsed.error) return parsed.error
    data.snoozedUntil = parsed.value ?? null
  }

  if (Object.keys(data).length === 0) {
    return badRequest('No valid fields provided for update')
  }

  const updated = await prisma.symptomReminder.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedReminder(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.symptomReminder.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
