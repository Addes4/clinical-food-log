import { NextRequest, NextResponse } from 'next/server'
import { badRequest, parseLimitParam, requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { normalizeFood } from '@/lib/food-normalization'

export async function GET(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const limit = parseLimitParam(searchParams.get('limit'), 30, 100)

  const favorites = await prisma.favoriteFood.findMany({
    where: { patientId: session!.user.profileId },
    include: { canonicalFood: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(favorites)
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const { rawInput } = body as { rawInput?: unknown }
  if (typeof rawInput !== 'string' || !rawInput.trim()) {
    return badRequest('rawInput is required')
  }

  const cleaned = rawInput.trim().toLowerCase()
  const normalized = normalizeFood(cleaned)

  let canonicalFoodId: string | undefined
  if (normalized.confidence >= 0.5) {
    const canonical = await prisma.foodCanonical.upsert({
      where: { name: normalized.canonical },
      create: { name: normalized.canonical },
      update: {},
    })
    canonicalFoodId = canonical.id
  }

  const favorite = await prisma.favoriteFood.upsert({
    where: {
      patientId_rawInput: {
        patientId: session!.user.profileId,
        rawInput: cleaned,
      },
    },
    create: {
      patientId: session!.user.profileId,
      rawInput: cleaned,
      canonicalFoodId,
    },
    update: {
      canonicalFoodId,
    },
    include: { canonicalFood: true },
  })

  return NextResponse.json(favorite, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const rawInput = searchParams.get('rawInput')
  if (!rawInput) return badRequest('rawInput query parameter is required')

  const cleaned = rawInput.trim().toLowerCase()

  const existing = await prisma.favoriteFood.findFirst({
    where: {
      patientId: session!.user.profileId,
      rawInput: cleaned,
    },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.favoriteFood.delete({ where: { id: existing.id } })
  return new NextResponse(null, { status: 204 })
}
