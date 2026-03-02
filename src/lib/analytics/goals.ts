import { prisma } from '@/lib/db'
import { computeAdherence } from '@/lib/analytics/adherence'

const DAY_MS = 24 * 60 * 60 * 1000

export interface GoalProgress {
  id: string
  metric: string
  targetValue: number
  currentValue: number
  progressRate: number
  periodDays: number
  label: string
}

export async function computeGoalProgress(patientId: string): Promise<GoalProgress[]> {
  const goals = await prisma.patientGoal.findMany({
    where: { patientId, active: true },
    orderBy: { createdAt: 'asc' },
  })

  const now = new Date()
  const results: GoalProgress[] = []

  for (const goal of goals) {
    const start = new Date(now.getTime() - goal.periodDays * DAY_MS)
    let currentValue = 0
    let label = goal.metric

    if (goal.metric === 'ADHERENCE_RATE') {
      const adherence = await computeAdherence(patientId, start, now)
      currentValue = adherence.rate
      label = 'Adherence rate'
    } else if (goal.metric === 'WATER_DAILY_ML') {
      const waterLogs = await prisma.waterLog.findMany({
        where: { patientId, datetime: { gte: start, lte: now } },
        select: { amountMl: true },
      })
      const total = waterLogs.reduce((sum, w) => sum + w.amountMl, 0)
      currentValue = total / goal.periodDays
      label = 'Average daily hydration'
    } else {
      continue
    }

    const progressRate = goal.targetValue > 0 ? currentValue / goal.targetValue : 0
    results.push({
      id: goal.id,
      metric: goal.metric,
      targetValue: goal.targetValue,
      currentValue,
      progressRate,
      periodDays: goal.periodDays,
      label,
    })
  }

  return results
}
