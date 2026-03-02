import { prisma } from '@/lib/db'

export interface SmartNudge {
  id: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'danger'
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function computeSmartNudges(patientId: string): Promise<SmartNudge[]> {
  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - 2 * DAY_MS)
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS)

  const [latestSymptom, stressLogs, medMisses, waterLogs] = await Promise.all([
    prisma.symptomLog.findFirst({
      where: { patientId },
      orderBy: { datetime: 'desc' },
      select: { datetime: true },
    }),
    prisma.contextLog.findMany({
      where: { patientId, datetime: { gte: sevenDaysAgo, lte: now } },
      select: { stressScore: true },
    }),
    prisma.medicationLog.count({
      where: { patientId, status: 'MISSED', datetime: { gte: sevenDaysAgo, lte: now } },
    }),
    prisma.waterLog.findMany({
      where: { patientId, datetime: { gte: twoDaysAgo, lte: now } },
      select: { amountMl: true },
    }),
  ])

  const nudges: SmartNudge[] = []

  if (!latestSymptom || latestSymptom.datetime < twoDaysAgo) {
    nudges.push({
      id: 'no-symptom-2d',
      title: 'No symptom log in 2 days',
      description: 'Log a quick symptom check-in today so trends stay reliable.',
      severity: 'warning',
    })
  }

  if (stressLogs.length > 0) {
    const avgStress = stressLogs.reduce((sum, l) => sum + l.stressScore, 0) / stressLogs.length
    if (avgStress >= 7) {
      nudges.push({
        id: 'stress-week-high',
        title: 'High-stress week detected',
        description: `Your 7-day average stress is ${avgStress.toFixed(1)}/10. Consider adding stress notes with symptom logs.`,
        severity: 'danger',
      })
    } else if (avgStress >= 6) {
      nudges.push({
        id: 'stress-week-rising',
        title: 'Stress trend is elevated',
        description: `Your 7-day average stress is ${avgStress.toFixed(1)}/10. Keep tracking to see symptom impact.`,
        severity: 'warning',
      })
    }
  }

  if (medMisses >= 2) {
    nudges.push({
      id: 'medication-missed',
      title: 'Multiple missed doses this week',
      description: `${medMisses} missed medication logs in 7 days. Review schedule and reminders.`,
      severity: medMisses >= 4 ? 'danger' : 'warning',
    })
  }

  if (waterLogs.length > 0) {
    const total = waterLogs.reduce((sum, l) => sum + l.amountMl, 0)
    const dailyAvg = total / 2
    if (dailyAvg < 1400) {
      nudges.push({
        id: 'hydration-low',
        title: 'Hydration is trending low',
        description: `Average intake is ${Math.round(dailyAvg)} ml/day over the last 2 days.`,
        severity: 'info',
      })
    }
  }

  return nudges
}
