import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'
import { computeTriggers } from '@/lib/analytics/triggers'
import { computeDailyAverages, computeMealTypeAverages } from '@/lib/analytics/averages'
import { computeAdherence } from '@/lib/analytics/adherence'

export async function GET(req: NextRequest, { params }: { params: { patientId: string } }) {
  const { error, session } = await requireSession('CLINICIAN')
  if (error) return error

  const clinicianId = session!.user.profileId
  const { patientId } = params

  // Verify clinician is assigned to this patient
  const assignment = await prisma.clinicianPatientAssignment.findFirst({
    where: { clinicianId, patientId },
  })
  if (!assignment) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [triggers, dailyAverages, mealTypeAverages, adherence] = await Promise.all([
    computeTriggers({ patientId }),
    computeDailyAverages(patientId),
    computeMealTypeAverages(patientId),
    computeAdherence(patientId),
  ])

  return NextResponse.json({ triggers, dailyAverages, mealTypeAverages, adherence })
}
