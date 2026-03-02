import { prisma } from '@/lib/db'

function getTimeWindow(center: Date, minutes: number): { gte: Date; lte: Date } {
  const delta = minutes * 60 * 1000
  return {
    gte: new Date(center.getTime() - delta),
    lte: new Date(center.getTime() + delta),
  }
}

function foodSignature(rawInputs: string[]): string {
  return rawInputs
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join('|')
}

export async function findDuplicateMealLog(params: {
  patientId: string
  datetime: Date
  mealType: string
  title: string
  foodInputs: string[]
}): Promise<string | null> {
  const { patientId, datetime, mealType, title, foodInputs } = params

  const candidates = await prisma.mealLog.findMany({
    where: {
      patientId,
      mealType,
      title,
      datetime: getTimeWindow(datetime, 20),
    },
    include: { foodItems: { select: { rawInput: true } } },
    take: 10,
    orderBy: { datetime: 'desc' },
  })

  const inputSig = foodSignature(foodInputs)
  const match = candidates.find((c) => foodSignature(c.foodItems.map((fi) => fi.rawInput)) === inputSig)
  return match?.id ?? null
}

export async function findDuplicateSymptomLog(params: {
  patientId: string
  datetime: Date
  painScore: number
  bloatingScore: number
  urgencyScore: number
  nauseaScore: number
  bowelMovement: string
  bristolScale: number | null
}): Promise<string | null> {
  const found = await prisma.symptomLog.findFirst({
    where: {
      patientId: params.patientId,
      datetime: getTimeWindow(params.datetime, 30),
      painScore: params.painScore,
      bloatingScore: params.bloatingScore,
      urgencyScore: params.urgencyScore,
      nauseaScore: params.nauseaScore,
      bowelMovement: params.bowelMovement,
      bristolScale: params.bristolScale,
    },
    select: { id: true },
    orderBy: { datetime: 'desc' },
  })

  return found?.id ?? null
}

export async function findDuplicateContextLog(params: {
  patientId: string
  datetime: Date
  stressScore: number
  sleepHours: number
  alcohol: boolean
  exercise: string
}): Promise<string | null> {
  const found = await prisma.contextLog.findFirst({
    where: {
      patientId: params.patientId,
      datetime: getTimeWindow(params.datetime, 30),
      stressScore: params.stressScore,
      sleepHours: params.sleepHours,
      alcohol: params.alcohol,
      exercise: params.exercise,
    },
    select: { id: true },
    orderBy: { datetime: 'desc' },
  })

  return found?.id ?? null
}

export async function findDuplicateWaterLog(params: {
  patientId: string
  datetime: Date
  amountMl: number
}): Promise<string | null> {
  const found = await prisma.waterLog.findFirst({
    where: {
      patientId: params.patientId,
      datetime: getTimeWindow(params.datetime, 20),
      amountMl: params.amountMl,
    },
    select: { id: true },
    orderBy: { datetime: 'desc' },
  })

  return found?.id ?? null
}

export async function findDuplicateMedicationLog(params: {
  patientId: string
  scheduleId: string | null
  datetime: Date
  status: string
}): Promise<string | null> {
  const found = await prisma.medicationLog.findFirst({
    where: {
      patientId: params.patientId,
      scheduleId: params.scheduleId ?? undefined,
      datetime: getTimeWindow(params.datetime, 90),
      status: params.status,
    },
    select: { id: true },
    orderBy: { datetime: 'desc' },
  })

  return found?.id ?? null
}
