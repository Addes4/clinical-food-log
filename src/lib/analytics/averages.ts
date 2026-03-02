import { prisma } from '@/lib/db'
import { SymptomAverages, MealTypeSymptomAverage } from '@/types'

export async function computeDailyAverages(patientId: string): Promise<SymptomAverages[]> {
  const symptomLogs = await prisma.symptomLog.findMany({
    where: { patientId },
    orderBy: { datetime: 'asc' },
  })

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

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => ({
      date,
      painScore: avg(scores.painScore),
      bloatingScore: avg(scores.bloatingScore),
      urgencyScore: avg(scores.urgencyScore),
      nauseaScore: avg(scores.nauseaScore),
      count: scores.painScore.length,
    }))
}

export async function computeMealTypeAverages(patientId: string): Promise<MealTypeSymptomAverage[]> {
  const symptomLogs = await prisma.symptomLog.findMany({
    where: { patientId },
    orderBy: { datetime: 'asc' },
  })

  const mealLogs = await prisma.mealLog.findMany({
    where: { patientId },
    orderBy: { datetime: 'asc' },
  })

  const WINDOW_MS = 4 * 60 * 60 * 1000 // 4 hours

  const byMealType: Record<string, {
    painScore: number[]
    bloatingScore: number[]
    urgencyScore: number[]
    nauseaScore: number[]
  }> = {}

  for (const symptom of symptomLogs) {
    // Find meals eaten in the 4 hours before this symptom log
    const windowStart = new Date(symptom.datetime.getTime() - WINDOW_MS)

    for (const meal of mealLogs) {
      if (meal.datetime >= windowStart && meal.datetime <= symptom.datetime) {
        const mt = meal.mealType
        if (!byMealType[mt]) {
          byMealType[mt] = { painScore: [], bloatingScore: [], urgencyScore: [], nauseaScore: [] }
        }
        byMealType[mt].painScore.push(symptom.painScore)
        byMealType[mt].bloatingScore.push(symptom.bloatingScore)
        byMealType[mt].urgencyScore.push(symptom.urgencyScore)
        byMealType[mt].nauseaScore.push(symptom.nauseaScore)
      }
    }
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

  return Object.entries(byMealType).map(([mealType, scores]) => ({
    mealType,
    painScore: avg(scores.painScore),
    bloatingScore: avg(scores.bloatingScore),
    urgencyScore: avg(scores.urgencyScore),
    nauseaScore: avg(scores.nauseaScore),
    count: scores.painScore.length,
  }))
}
