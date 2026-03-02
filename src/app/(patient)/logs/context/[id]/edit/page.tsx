import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLogForm } from '@/components/forms/ContextLogForm'

export default async function EditContextPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const patientId = session!.user.profileId

  const log = await prisma.contextLog.findFirst({
    where: { id: params.id, patientId },
  })

  if (!log) notFound()

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <h1 className="text-lg font-semibold text-gray-900">Edit Context</h1>
      </CardHeader>
      <CardContent>
        <ContextLogForm
          initialData={{
            id: log.id,
            datetime: log.datetime.toISOString(),
            stressScore: log.stressScore,
            sleepHours: log.sleepHours,
            medicationTaken: log.medicationTaken,
            alcohol: log.alcohol,
            exercise: log.exercise,
            notes: log.notes,
          }}
        />
      </CardContent>
    </Card>
  )
}
