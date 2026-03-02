import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

export async function GET() {
  const { error, session } = await requireSession('CLINICIAN')
  if (error) return error

  const clinicianId = session!.user.profileId

  const assignments = await prisma.clinicianPatientAssignment.findMany({
    where: { clinicianId },
    include: {
      patient: {
        include: {
          user: { select: { email: true, createdAt: true } },
          _count: {
            select: {
              mealLogs: true,
              symptomLogs: true,
              contextLogs: true,
            },
          },
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  })

  const patients = assignments.map((a) => ({
    id: a.patient.id,
    displayName: a.patient.displayName,
    email: a.patient.user.email,
    createdAt: a.patient.user.createdAt,
    logCounts: a.patient._count,
    assignedAt: a.assignedAt,
  }))

  return NextResponse.json(patients)
}
