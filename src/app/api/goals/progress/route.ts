import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-helpers'
import { computeGoalProgress } from '@/lib/analytics/goals'

export async function GET() {
  const { error, session } = await requireSession('PATIENT')
  if (error) return error

  const progress = await computeGoalProgress(session!.user.profileId)
  return NextResponse.json(progress)
}
