import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { badRequest, requireSession } from '@/lib/api-helpers'
import { prisma } from '@/lib/db'

export async function GET() {
  const { error } = await requireSession('ADMIN')
  if (error) return error

  const [patients, clinicians] = await Promise.all([
    prisma.patientProfile.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { displayName: 'asc' },
    }),
    prisma.clinicianProfile.findMany({
      include: {
        user: { select: { email: true, createdAt: true } },
        assignments: { select: { patientId: true } },
      },
      orderBy: { displayName: 'asc' },
    }),
  ])

  return NextResponse.json({
    patients: patients.map((p) => ({ id: p.id, displayName: p.displayName, email: p.user.email })),
    clinicians: clinicians.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      email: c.user.email,
      patientIds: c.assignments.map((a) => a.patientId),
      createdAt: c.user.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const { error } = await requireSession('ADMIN')
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return badRequest('Invalid request body')

  const { email, displayName, patientIds, temporaryPassword } = body as {
    email?: unknown
    displayName?: unknown
    patientIds?: unknown
    temporaryPassword?: unknown
  }

  if (typeof email !== 'string' || !email.includes('@')) return badRequest('Valid email is required')
  if (typeof displayName !== 'string' || !displayName.trim()) return badRequest('displayName is required')
  if (patientIds !== undefined && !Array.isArray(patientIds)) return badRequest('patientIds must be an array of patient IDs')
  if (temporaryPassword !== undefined && (typeof temporaryPassword !== 'string' || temporaryPassword.length < 8)) {
    return badRequest('temporaryPassword must be at least 8 characters')
  }

  const normalizedEmail = email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const password = typeof temporaryPassword === 'string' ? temporaryPassword : 'password'
  const passwordHash = await bcrypt.hash(password, 10)

  const patientIdList = Array.isArray(patientIds) ? patientIds.filter((v): v is string => typeof v === 'string') : []
  if (patientIdList.length > 0) {
    const validPatients = await prisma.patientProfile.findMany({
      where: { id: { in: patientIdList } },
      select: { id: true },
    })
    if (validPatients.length !== patientIdList.length) {
      return badRequest('One or more patient IDs are invalid')
    }
  }

  const clinician = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: 'CLINICIAN',
      clinicianProfile: {
        create: {
          displayName: displayName.trim(),
        },
      },
    },
    include: { clinicianProfile: true },
  })

  if (patientIdList.length > 0) {
    await prisma.clinicianPatientAssignment.createMany({
      data: patientIdList.map((patientId) => ({
        clinicianId: clinician.clinicianProfile!.id,
        patientId,
      })),
    })
  }

  const assignments = await prisma.clinicianPatientAssignment.findMany({
    where: { clinicianId: clinician.clinicianProfile!.id },
    select: { patientId: true },
  })

  return NextResponse.json(
    {
      clinician: {
        id: clinician.clinicianProfile!.id,
        email: clinician.email,
        displayName: clinician.clinicianProfile!.displayName,
        patientIds: assignments.map((a) => a.patientId),
      },
      temporaryPassword: password,
    },
    { status: 201 }
  )
}
