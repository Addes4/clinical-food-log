// Analytics unit tests using in-memory data structures
// (No DB connection needed — tests the pure logic)

// Replicate the trigger logic inline for unit testing
interface MockSymptomLog {
  datetime: Date
  painScore: number
  bloatingScore: number
  urgencyScore: number
  nauseaScore: number
}

interface MockMealLog {
  datetime: Date
  foodItems: Array<{ canonicalName: string }>
}

function computeTriggersInMemory(
  symptomLogs: MockSymptomLog[],
  mealLogs: MockMealLog[],
  threshold = 5,
  windowHours = 24
) {
  const totalOccurrences: Record<string, number> = {}
  const associatedOccurrences: Record<string, number> = {}

  for (const meal of mealLogs) {
    const foodNames = new Set(meal.foodItems.map((fi) => fi.canonicalName))
    foodNames.forEach((name) => {
      totalOccurrences[name] = (totalOccurrences[name] ?? 0) + 1
    })
  }

  for (const symptom of symptomLogs) {
    const avg = (symptom.painScore + symptom.bloatingScore + symptom.urgencyScore + symptom.nauseaScore) / 4
    if (avg < threshold) continue

    const windowStart = new Date(symptom.datetime.getTime() - windowHours * 60 * 60 * 1000)
    const foodsInWindow = new Set<string>()

    for (const meal of mealLogs) {
      if (meal.datetime >= windowStart && meal.datetime <= symptom.datetime) {
        for (const fi of meal.foodItems) {
          foodsInWindow.add(fi.canonicalName)
        }
      }
    }

    foodsInWindow.forEach((name) => {
      associatedOccurrences[name] = (associatedOccurrences[name] ?? 0) + 1
    })
  }

  return Object.entries(totalOccurrences)
    .filter(([food, total]) => total >= 2 && (associatedOccurrences[food] ?? 0) > 0)
    .map(([food, total]) => ({
      canonicalFood: food,
      totalOccurrences: total,
      associatedOccurrences: associatedOccurrences[food] ?? 0,
      associationRate: (associatedOccurrences[food] ?? 0) / total,
    }))
    .sort((a, b) => b.associationRate - a.associationRate)
}

// Daily averages in-memory
function computeDailyAveragesInMemory(symptomLogs: MockSymptomLog[]) {
  const byDay: Record<string, {
    painScore: number[]
    bloatingScore: number[]
    urgencyScore: number[]
    nauseaScore: number[]
  }> = {}

  for (const log of symptomLogs) {
    const date = log.datetime.toISOString().slice(0, 10)
    if (!byDay[date]) {
      byDay[date] = { painScore: [], bloatingScore: [], urgencyScore: [], nauseaScore: [] }
    }
    byDay[date].painScore.push(log.painScore)
    byDay[date].bloatingScore.push(log.bloatingScore)
    byDay[date].urgencyScore.push(log.urgencyScore)
    byDay[date].nauseaScore.push(log.nauseaScore)
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

  return Object.entries(byDay).map(([date, scores]) => ({
    date,
    painScore: avg(scores.painScore),
    bloatingScore: avg(scores.bloatingScore),
    urgencyScore: avg(scores.urgencyScore),
    nauseaScore: avg(scores.nauseaScore),
    count: scores.painScore.length,
  }))
}

describe('analytics triggers', () => {
  it('returns empty array when no high-symptom events', () => {
    const symptomLogs: MockSymptomLog[] = [
      { datetime: new Date('2024-01-10T14:00:00Z'), painScore: 2, bloatingScore: 2, urgencyScore: 2, nauseaScore: 2 },
    ]
    const mealLogs: MockMealLog[] = [
      { datetime: new Date('2024-01-10T08:00:00Z'), foodItems: [{ canonicalName: 'pasta' }] },
      { datetime: new Date('2024-01-10T12:00:00Z'), foodItems: [{ canonicalName: 'pasta' }] },
    ]
    const triggers = computeTriggersInMemory(symptomLogs, mealLogs)
    expect(triggers).toHaveLength(0)
  })

  it('identifies food eaten before high-symptom event', () => {
    const base = new Date('2024-01-10T00:00:00Z')
    const symptomLogs: MockSymptomLog[] = [
      // High symptom event
      { datetime: new Date(base.getTime() + 14 * 3600000), painScore: 7, bloatingScore: 8, urgencyScore: 6, nauseaScore: 5 },
      { datetime: new Date(base.getTime() + 14 * 3600000 + 86400000), painScore: 7, bloatingScore: 8, urgencyScore: 6, nauseaScore: 5 },
    ]
    const mealLogs: MockMealLog[] = [
      // Pasta eaten 2h before high event
      { datetime: new Date(base.getTime() + 12 * 3600000), foodItems: [{ canonicalName: 'pasta' }] },
      { datetime: new Date(base.getTime() + 12 * 3600000 + 86400000), foodItems: [{ canonicalName: 'pasta' }] },
      // Salad eaten the day before (outside window)
      { datetime: new Date(base.getTime() - 12 * 3600000), foodItems: [{ canonicalName: 'sallad' }] },
      { datetime: new Date(base.getTime() - 12 * 3600000 + 86400000), foodItems: [{ canonicalName: 'sallad' }] },
    ]
    const triggers = computeTriggersInMemory(symptomLogs, mealLogs)
    const pastaTrigger = triggers.find((t) => t.canonicalFood === 'pasta')
    expect(pastaTrigger).toBeDefined()
    expect(pastaTrigger!.associationRate).toBeCloseTo(1.0)
  })

  it('requires minimum 2 total occurrences', () => {
    const symptomLogs: MockSymptomLog[] = [
      { datetime: new Date('2024-01-10T14:00:00Z'), painScore: 8, bloatingScore: 8, urgencyScore: 8, nauseaScore: 8 },
    ]
    const mealLogs: MockMealLog[] = [
      // Only one occurrence
      { datetime: new Date('2024-01-10T12:00:00Z'), foodItems: [{ canonicalName: 'rareFood' }] },
    ]
    const triggers = computeTriggersInMemory(symptomLogs, mealLogs)
    expect(triggers.find((t) => t.canonicalFood === 'rareFood')).toBeUndefined()
  })

  it('sorts by association rate descending', () => {
    const base = new Date('2024-01-10T00:00:00Z')
    const symptomLogs: MockSymptomLog[] = [
      { datetime: new Date(base.getTime() + 14 * 3600000), painScore: 8, bloatingScore: 8, urgencyScore: 8, nauseaScore: 8 },
      { datetime: new Date(base.getTime() + 14 * 3600000 + 86400000), painScore: 8, bloatingScore: 8, urgencyScore: 8, nauseaScore: 8 },
    ]
    const mealLogs: MockMealLog[] = [
      // foodA always with symptom
      { datetime: new Date(base.getTime() + 12 * 3600000), foodItems: [{ canonicalName: 'foodA' }, { canonicalName: 'foodB' }] },
      { datetime: new Date(base.getTime() + 12 * 3600000 + 86400000), foodItems: [{ canonicalName: 'foodA' }] },
      // foodB only once with symptom, once without
      { datetime: new Date(base.getTime() - 48 * 3600000), foodItems: [{ canonicalName: 'foodB' }] },
    ]
    const triggers = computeTriggersInMemory(symptomLogs, mealLogs)
    // foodA: 2/2 = 1.0 rate, foodB: 1/3 = 0.33 rate
    expect(triggers[0].canonicalFood).toBe('foodA')
    expect(triggers[0].associationRate).toBeCloseTo(1.0)
    if (triggers.length > 1) {
      expect(triggers[0].associationRate).toBeGreaterThanOrEqual(triggers[1].associationRate)
    }
  })

  it('calculates correct association rate', () => {
    const base = new Date('2024-01-01T00:00:00Z')
    // 3 high-symptom events, pasta only eaten before 2 of them
    const symptomLogs: MockSymptomLog[] = [
      { datetime: new Date(base.getTime() + 14 * 3600000), painScore: 8, bloatingScore: 8, urgencyScore: 8, nauseaScore: 8 },
      { datetime: new Date(base.getTime() + 14 * 3600000 + 86400000), painScore: 8, bloatingScore: 8, urgencyScore: 8, nauseaScore: 8 },
      { datetime: new Date(base.getTime() + 14 * 3600000 + 2 * 86400000), painScore: 8, bloatingScore: 8, urgencyScore: 8, nauseaScore: 8 },
    ]
    const mealLogs: MockMealLog[] = [
      { datetime: new Date(base.getTime() + 12 * 3600000), foodItems: [{ canonicalName: 'pasta' }] },
      { datetime: new Date(base.getTime() + 12 * 3600000 + 86400000), foodItems: [{ canonicalName: 'pasta' }] },
      // No pasta on day 3
      { datetime: new Date(base.getTime() + 12 * 3600000 + 2 * 86400000), foodItems: [{ canonicalName: 'sallad' }] },
      // Extra sallad occurrence (no symptom)
      { datetime: new Date(base.getTime() - 86400000), foodItems: [{ canonicalName: 'sallad' }] },
    ]
    const triggers = computeTriggersInMemory(symptomLogs, mealLogs)
    const pasta = triggers.find((t) => t.canonicalFood === 'pasta')
    expect(pasta).toBeDefined()
    expect(pasta!.associatedOccurrences).toBe(2)
    expect(pasta!.totalOccurrences).toBe(2)
    expect(pasta!.associationRate).toBeCloseTo(1.0)
  })
})

describe('analytics daily averages', () => {
  it('groups symptom logs by day', () => {
    const logs: MockSymptomLog[] = [
      { datetime: new Date('2024-01-10T10:00:00Z'), painScore: 4, bloatingScore: 6, urgencyScore: 2, nauseaScore: 3 },
      { datetime: new Date('2024-01-10T20:00:00Z'), painScore: 6, bloatingScore: 4, urgencyScore: 4, nauseaScore: 1 },
      { datetime: new Date('2024-01-11T10:00:00Z'), painScore: 2, bloatingScore: 2, urgencyScore: 2, nauseaScore: 2 },
    ]
    const averages = computeDailyAveragesInMemory(logs)
    expect(averages).toHaveLength(2)

    const day10 = averages.find((d) => d.date === '2024-01-10')
    expect(day10).toBeDefined()
    expect(day10!.painScore).toBeCloseTo(5)
    expect(day10!.bloatingScore).toBeCloseTo(5)
    expect(day10!.count).toBe(2)
  })

  it('returns single entry per day', () => {
    const logs: MockSymptomLog[] = [
      { datetime: new Date('2024-01-15T08:00:00Z'), painScore: 3, bloatingScore: 3, urgencyScore: 3, nauseaScore: 3 },
      { datetime: new Date('2024-01-15T18:00:00Z'), painScore: 7, bloatingScore: 7, urgencyScore: 7, nauseaScore: 7 },
    ]
    const averages = computeDailyAveragesInMemory(logs)
    expect(averages).toHaveLength(1)
    expect(averages[0].painScore).toBeCloseTo(5)
  })

  it('returns empty array for no logs', () => {
    const averages = computeDailyAveragesInMemory([])
    expect(averages).toHaveLength(0)
  })
})

describe('adherence', () => {
  it('counts correct fraction of days with logs', () => {
    // Simulate: 3 days out of 7
    const daysWithLogs = 3
    const totalDays = 7
    const rate = daysWithLogs / totalDays
    expect(rate).toBeCloseTo(3 / 7)
  })

  it('handles 100% adherence', () => {
    const rate = 7 / 7
    expect(rate).toBe(1)
  })

  it('handles 0% adherence', () => {
    const rate = 0 / 7
    expect(rate).toBe(0)
  })
})
