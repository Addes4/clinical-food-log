import { NextRequest, NextResponse } from 'next/server'
import {
  badRequest,
  isIntegerInRange,
  parseLimitParam,
  requireSession,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && TIME_REGEX.test(value)
}

export async function GET(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const limit = parseLimitParam(searchParams.get('limit'), 20, 100)

  const reminders = await prisma.symptomReminder.findMany({
    where: { patientId: session!.user.profileId },
    orderBy: [{ enabled: 'desc' }, { timeOfDay: 'asc' }],
    take: limit,
  })

  return NextResponse.json(reminders)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const { label, timeOfDay, enabled, snoozeMinutes, quietHoursStart, quietHoursEnd } = body as {
    label?: unknown
    timeOfDay?: unknown
    enabled?: unknown
    snoozeMinutes?: unknown
    quietHoursStart?: unknown
    quietHoursEnd?: unknown
  }

  if (typeof label !== 'string' || !label.trim()) return badRequest('label is required')
  if (!isTimeString(timeOfDay)) return badRequest('timeOfDay must be in HH:mm format')
  if (enabled !== undefined && typeof enabled !== 'boolean') return badRequest('enabled must be a boolean')
  if (snoozeMinutes !== undefined && !isIntegerInRange(snoozeMinutes, 5, 240)) {
    return badRequest('snoozeMinutes must be an integer between 5 and 240')
  }
  if (quietHoursStart != null && !isTimeString(quietHoursStart)) {
    return badRequest('quietHoursStart must be in HH:mm format')
  }
  if (quietHoursEnd != null && !isTimeString(quietHoursEnd)) {
    return badRequest('quietHoursEnd must be in HH:mm format')
  }

  const reminder = await prisma.symptomReminder.create({
    data: {
      patientId: session!.user.profileId,
      label: label.trim(),
      timeOfDay,
      enabled: enabled ?? true,
      snoozeMinutes: snoozeMinutes ?? 15,
      quietHoursStart: quietHoursStart ?? null,
      quietHoursEnd: quietHoursEnd ?? null,
    },
  })

  return NextResponse.json(reminder, { status: 201 })
}
