import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLogForm } from '@/components/forms/ContextLogForm'

export default function NewContextPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <h1 className="text-lg font-semibold text-gray-900">Log Daily Context</h1>
        <p className="text-sm text-gray-500">Record stress, sleep, exercise, and other factors</p>
      </CardHeader>
      <CardContent>
        <ContextLogForm />
      </CardContent>
    </Card>
  )
}
