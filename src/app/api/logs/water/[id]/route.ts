import { NextRequest, NextResponse } from 'next/server'
import { badRequest, parseOptionalDate, requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

async function getOwnedWaterLog(id: string, patientId: string) {
  return prisma.waterLog.findFirst({ where: { id, patientId } })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const log = await getOwnedWaterLog(params.id, session!.user.profileId)
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(log)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedWaterLog(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const input = body as Record<string, unknown>
  const data: { datetime?: Date; amountMl?: number } = {}

  if (input.datetime !== undefined) {
    const parsedDate = parseOptionalDate(input.datetime, 'datetime')
    if (parsedDate.error) return parsedDate.error
    if (parsedDate.value) data.datetime = parsedDate.value
  }

  if (input.amountMl !== undefined) {
    if (typeof input.amountMl !== 'number' || !Number.isInteger(input.amountMl) || input.amountMl < 50 || input.amountMl > 5000) {
      return badRequest('amountMl must be an integer between 50 and 5000')
    }
    data.amountMl = input.amountMl
  }

  if (Object.keys(data).length === 0) return badRequest('No valid fields provided for update')

  const updated = await prisma.waterLog.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedWaterLog(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.waterLog.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
