import { NextRequest, NextResponse } from 'next/server'
import { parseLimitParam, requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

interface FoodSuggestion {
  name: string
  source: 'favorite' | 'frequent'
  count?: number
}

export async function GET(req: NextRequest) {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const patientId = session!.user.profileId
  const { searchParams } = new URL(req.url)
  const limit = parseLimitParam(searchParams.get('limit'), 15, 60)

  const [favorites, items] = await Promise.all([
    prisma.favoriteFood.findMany({
      where: { patientId },
      include: { canonicalFood: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.mealFoodItem.findMany({
      where: { mealLog: { patientId } },
      include: { canonicalFood: true },
      orderBy: { mealLog: { datetime: 'desc' } },
      take: 300,
    }),
  ])

  const favoriteNames = favorites.map((f) => f.canonicalFood?.name ?? f.rawInput)
  const favoriteSuggestions: FoodSuggestion[] = favoriteNames.map((name) => ({ name, source: 'favorite' }))

  const frequencyMap = new Map<string, number>()
  for (const item of items) {
    const key = item.canonicalFood?.name ?? item.rawInput
    frequencyMap.set(key, (frequencyMap.get(key) ?? 0) + 1)
  }
  const frequentSuggestions: FoodSuggestion[] = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, source: 'frequent', count }))

  const deduped = new Map<string, FoodSuggestion>()
  for (const suggestion of [...favoriteSuggestions, ...frequentSuggestions]) {
    if (!deduped.has(suggestion.name.toLowerCase())) {
      deduped.set(suggestion.name.toLowerCase(), suggestion)
    }
  }

  return NextResponse.json({
    favorites: favoriteSuggestions,
    frequent: frequentSuggestions,
    suggestions: Array.from(deduped.values()).slice(0, limit),
  })
}
