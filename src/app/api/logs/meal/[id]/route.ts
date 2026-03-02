import { NextRequest, NextResponse } from 'next/server'
import {
  badRequest,
  isNumberInRange,
  isStringEnum,
  parseRequiredDate,
  requireSession,
} from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { normalizeFood } from '@/lib/food-normalization'

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER'] as const

interface ParsedFoodItem {
  rawInput: string
  quantity?: number
  unit?: string
}

function parseFoodItems(value: unknown): { value: ParsedFoodItem[]; error: NextResponse | null } {
  if (!Array.isArray(value)) return { value: [], error: badRequest('foodItems must be an array') }

  const parsed: ParsedFoodItem[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      return { value: [], error: badRequest('Each food item must be an object') }
    }

    const { rawInput, quantity, unit } = item as {
      rawInput?: unknown
      quantity?: unknown
      unit?: unknown
    }

    if (typeof rawInput !== 'string' || !rawInput.trim()) {
      return { value: [], error: badRequest('Each food item requires a non-empty rawInput') }
    }
    if (quantity !== undefined && quantity !== null && !isNumberInRange(quantity, 0, 10000)) {
      return { value: [], error: badRequest('Food item quantity must be between 0 and 10000') }
    }
    if (unit !== undefined && unit !== null && typeof unit !== 'string') {
      return { value: [], error: badRequest('Food item unit must be a string') }
    }

    parsed.push({
      rawInput: rawInput.trim(),
      quantity: quantity == null ? undefined : quantity,
      unit: typeof unit === 'string' && unit.trim() ? unit.trim() : undefined,
    })
  }

  return { value: parsed, error: null }
}

async function getOwnedMeal(id: string, patientId: string) {
  return prisma.mealLog.findFirst({
    where: { id, patientId },
    include: { foodItems: { include: { canonicalFood: true } } },
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const meal = await getOwnedMeal(params.id, session!.user.profileId)
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(meal)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedMeal(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return badRequest('Invalid request body')
  }

  const { datetime, mealType, title, notes, foodItems } = body as {
    datetime?: unknown
    mealType?: unknown
    title?: unknown
    notes?: unknown
    foodItems?: unknown
  }

  const parsedDate = parseRequiredDate(datetime, 'datetime')
  if (parsedDate.error) return parsedDate.error

  if (!isStringEnum(mealType, MEAL_TYPES)) {
    return badRequest('mealType must be one of BREAKFAST, LUNCH, DINNER, SNACK, or OTHER')
  }
  if (typeof title !== 'string' || !title.trim()) {
    return badRequest('title is required')
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return badRequest('notes must be a string')
  }

  const parsedFoodItems = parseFoodItems(foodItems)
  if (parsedFoodItems.error) {
    return parsedFoodItems.error
  }

  const updated = await prisma.mealLog.update({
    where: { id: params.id },
    data: {
      datetime: parsedDate.value,
      mealType,
      title: title.trim(),
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      foodItems: {
        // Keep replacement in one nested write to avoid partial updates on failures.
        deleteMany: {},
        create: await Promise.all(
          parsedFoodItems.value.map(async (item) => {
            const normalized = normalizeFood(item.rawInput)
            let canonicalFoodId: string | undefined
            if (normalized.confidence >= 0.5) {
              const canonical = await prisma.foodCanonical.upsert({
                where: { name: normalized.canonical },
                create: { name: normalized.canonical },
                update: {},
              })
              canonicalFoodId = canonical.id
            }
            return {
              rawInput: item.rawInput,
              canonicalFoodId,
              brand: normalized.brand,
              quantity: item.quantity,
              unit: item.unit,
              confidence: normalized.confidence,
            }
          })
        ),
      },
    },
    include: { foodItems: { include: { canonicalFood: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const existing = await getOwnedMeal(params.id, session!.user.profileId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.mealLog.delete({ where: { id: params.id } })

  return new NextResponse(null, { status: 204 })
}
