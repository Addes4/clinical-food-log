import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CarePlanEditor } from '@/components/CarePlanEditor'

export default async function PatientCarePlanPage() {
  const session = await getServerSession(authOptions)
  const patientId = session!.user.profileId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Shared Care Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Collaborate with your clinician on goals and observations.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Care Plan</h2>
        </CardHeader>
        <CardContent>
          <CarePlanEditor patientId={patientId} editable />
        </CardContent>
      </Card>
    </div>
  )
}
