import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MealLogForm } from '@/components/forms/MealLogForm'

export default function NewMealPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <h1 className="text-lg font-semibold text-gray-900">Log a Meal</h1>
        <p className="text-sm text-gray-500">Record what you ate and when</p>
      </CardHeader>
      <CardContent>
        <MealLogForm />
      </CardContent>
    </Card>
  )
}
