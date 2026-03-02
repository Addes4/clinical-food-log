import { prisma } from '@/lib/db'

export async function computeAdherence(
  patientId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ totalDays: number; daysWithLogs: number; rate: number }> {
  const end = endDate ?? new Date()
  const start = startDate ?? new Date(end.getTime() - 21 * 24 * 60 * 60 * 1000)

  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))

  const [meals, symptoms, contexts] = await Promise.all([
    prisma.mealLog.findMany({
      where: { patientId, datetime: { gte: start, lte: end } },
      select: { datetime: true },
    }),
    prisma.symptomLog.findMany({
      where: { patientId, datetime: { gte: start, lte: end } },
      select: { datetime: true },
    }),
    prisma.contextLog.findMany({
      where: { patientId, datetime: { gte: start, lte: end } },
      select: { datetime: true },
    }),
  ])

  const daysSet = new Set<string>()

  for (const log of [...meals, ...symptoms, ...contexts]) {
    daysSet.add(log.datetime.toISOString().slice(0, 10))
  }

  const daysWithLogs = daysSet.size
  const rate = totalDays > 0 ? daysWithLogs / totalDays : 0

  return { totalDays, daysWithLogs, rate }
}
