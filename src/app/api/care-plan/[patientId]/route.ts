import { NextRequest, NextResponse } from 'next/server'
import { badRequest, requireSessionIn } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

async function assertClinicianAccess(clinicianId: string, patientId: string): Promise<boolean> {
  const assignment = await prisma.clinicianPatientAssignment.findFirst({
    where: { clinicianId, patientId },
    select: { id: true },
  })
  return !!assignment
}

export async function GET(req: NextRequest, { params }: { params: { patientId: string } }) {
  const { error, session } = await requireSessionIn(['PATIENT', 'CLINICIAN', 'ADMIN'])
  if (error) return error

  const patientId = params.patientId
  if (session!.user.role === 'PATIENT' && patientId !== session!.user.profileId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (session!.user.role === 'CLINICIAN') {
    const allowed = await assertClinicianAccess(session!.user.profileId, patientId)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const plan = await prisma.carePlan.findFirst({
    where: { patientId },
    include: {
      clinician: { select: { id: true, displayName: true } },
      patient: { select: { id: true, displayName: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(plan)
}

export async function PUT(req: NextRequest, { params }: { params: { patientId: string } }) {
  const { error, session } = await requireSessionIn(['PATIENT', 'CLINICIAN'])
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const { title, goals, notes } = body as {
    title?: unknown
    goals?: unknown
    notes?: unknown
  }
  if (typeof title !== 'string' || !title.trim()) return badRequest('title is required')
  if (typeof goals !== 'string' || !goals.trim()) return badRequest('goals is required')
  if (notes !== undefined && notes !== null && typeof notes !== 'string') return badRequest('notes must be a string')

  const patientId = params.patientId
  let clinicianId: string

  if (session!.user.role === 'CLINICIAN') {
    const allowed = await assertClinicianAccess(session!.user.profileId, patientId)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    clinicianId = session!.user.profileId
  } else {
    if (session!.user.profileId !== patientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const assignment = await prisma.clinicianPatientAssignment.findFirst({
      where: { patientId },
      orderBy: { assignedAt: 'asc' },
      select: { clinicianId: true },
    })
    if (!assignment) return NextResponse.json({ error: 'No clinician assignment found' }, { status: 404 })
    clinicianId = assignment.clinicianId
  }

  const plan = await prisma.carePlan.upsert({
    where: {
      patientId_clinicianId: {
        patientId,
        clinicianId,
      },
    },
    create: {
      patientId,
      clinicianId,
      title: title.trim(),
      goals: goals.trim(),
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      lastUpdatedByRole: session!.user.role,
    },
    update: {
      title: title.trim(),
      goals: goals.trim(),
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      lastUpdatedByRole: session!.user.role,
    },
    include: {
      clinician: { select: { id: true, displayName: true } },
      patient: { select: { id: true, displayName: true } },
    },
  })

  return NextResponse.json(plan)
}
