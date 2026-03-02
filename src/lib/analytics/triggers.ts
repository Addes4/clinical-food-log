import { prisma } from '@/lib/db'
import { FoodTrigger } from '@/types'

interface TriggersOptions {
  patientId: string
  symptomThreshold?: number
  windowHours?: number
}

export async function computeTriggers({
  patientId,
  symptomThreshold = 5,
  windowHours = 24,
}: TriggersOptions): Promise<FoodTrigger[]> {
  const symptomLogs = await prisma.symptomLog.findMany({
    where: { patientId },
    orderBy: { datetime: 'asc' },
  })

  const mealLogs = await prisma.mealLog.findMany({
    where: { patientId },
    include: {
      foodItems: {
        include: { canonicalFood: true },
      },
    },
    orderBy: { datetime: 'asc' },
  })

  // Count total occurrences per canonical food
  const totalOccurrences: Record<string, number> = {}
  // Count occurrences associated with high-symptom events
  const associatedOccurrences: Record<string, number> = {}

  for (const meal of mealLogs) {
    const foodNames = new Set<string>()
    for (const item of meal.foodItems) {
      const name = item.canonicalFood?.name ?? item.rawInput
      foodNames.add(name)
    }
    foodNames.forEach((name) => {
      totalOccurrences[name] = (totalOccurrences[name] ?? 0) + 1
    })
  }

  // For each high-symptom log, find foods eaten in the preceding window
  for (const symptom of symptomLogs) {
    const avg =
      (symptom.painScore + symptom.bloatingScore + symptom.urgencyScore + symptom.nauseaScore) / 4
    if (avg < symptomThreshold) continue

    const windowStart = new Date(symptom.datetime.getTime() - windowHours * 60 * 60 * 1000)
    const foodsInWindow = new Set<string>()

    for (const meal of mealLogs) {
      if (meal.datetime >= windowStart && meal.datetime <= symptom.datetime) {
        for (const item of meal.foodItems) {
          const name = item.canonicalFood?.name ?? item.rawInput
          foodsInWindow.add(name)
        }
      }
    }

    foodsInWindow.forEach((name) => {
      associatedOccurrences[name] = (associatedOccurrences[name] ?? 0) + 1
    })
  }

  const triggers: FoodTrigger[] = []
  for (const [food, total] of Object.entries(totalOccurrences)) {
    if (total < 2) continue
    const associated = associatedOccurrences[food] ?? 0
    const rate = associated / total
    if (associated > 0) {
      triggers.push({
        canonicalFood: food,
        associationRate: rate,
        associatedOccurrences: associated,
        totalOccurrences: total,
      })
    }
  }

  return triggers.sort((a, b) => b.associationRate - a.associationRate)
}
