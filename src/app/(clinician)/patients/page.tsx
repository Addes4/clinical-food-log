import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function PatientsPage() {
  const session = await getServerSession(authOptions)
  const clinicianId = session!.user.profileId

  const assignments = await prisma.clinicianPatientAssignment.findMany({
    where: { clinicianId },
    include: {
      patient: {
        include: {
          user: { select: { email: true } },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Patients</h1>
        <p className="text-sm text-gray-500 mt-0.5">{assignments.length} patient{assignments.length !== 1 ? 's' : ''} assigned</p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-400">
            No patients assigned.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map(({ patient }) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <Card className="hover:border-brand-300 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{patient.displayName}</p>
                      <p className="text-sm text-gray-500">{patient.user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <Badge variant="info">{patient._count.mealLogs} meals</Badge>
                        <Badge variant="warning">{patient._count.symptomLogs} symptoms</Badge>
                        <Badge variant="default">{patient._count.contextLogs} contexts</Badge>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
