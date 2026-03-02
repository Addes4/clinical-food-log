import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { buildResearchExport } from '@/lib/research-export'

export async function GET(req: NextRequest) {
  const { error } = await requireSession('ADMIN')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const deidentify = searchParams.get('deidentify') === '1'
  const patientId = searchParams.get('patientId')

  const patients = await prisma.patientProfile.findMany({
    where: patientId ? { id: patientId } : undefined,
    include: {
      user: { select: { id: true, email: true } },
      mealLogs: {
        include: { foodItems: { include: { canonicalFood: true } } },
        orderBy: { datetime: 'asc' },
      },
      symptomLogs: { orderBy: { datetime: 'asc' } },
      contextLogs: { orderBy: { datetime: 'asc' } },
      waterLogs: { orderBy: { datetime: 'asc' } },
      medicationLogs: {
        include: { schedule: true },
        orderBy: { datetime: 'asc' },
      },
    },
    orderBy: { displayName: 'asc' },
  })

  return NextResponse.json(buildResearchExport(patients, { deidentify }))
}
