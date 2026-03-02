import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SymptomLogForm } from '@/components/forms/SymptomLogForm'

export default async function EditSymptomPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const patientId = session!.user.profileId

  const log = await prisma.symptomLog.findFirst({
    where: { id: params.id, patientId },
  })

  if (!log) notFound()

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <h1 className="text-lg font-semibold text-gray-900">Edit Symptoms</h1>
      </CardHeader>
      <CardContent>
        <SymptomLogForm
          initialData={{
            id: log.id,
            datetime: log.datetime.toISOString(),
            painScore: log.painScore,
            bloatingScore: log.bloatingScore,
            urgencyScore: log.urgencyScore,
            nauseaScore: log.nauseaScore,
            bowelMovement: log.bowelMovement,
            bristolScale: log.bristolScale,
            notes: log.notes,
          }}
        />
      </CardContent>
    </Card>
  )
}
