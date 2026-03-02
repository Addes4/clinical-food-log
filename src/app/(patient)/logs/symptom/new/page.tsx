import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SymptomLogForm } from '@/components/forms/SymptomLogForm'

export default function NewSymptomPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <h1 className="text-lg font-semibold text-gray-900">Log Symptoms</h1>
        <p className="text-sm text-gray-500">Record how you are feeling right now</p>
      </CardHeader>
      <CardContent>
        <SymptomLogForm />
      </CardContent>
    </Card>
  )
}
