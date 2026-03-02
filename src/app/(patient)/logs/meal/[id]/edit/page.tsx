import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MealLogForm } from '@/components/forms/MealLogForm'

export default async function EditMealPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const patientId = session!.user.profileId

  const meal = await prisma.mealLog.findFirst({
    where: { id: params.id, patientId },
    include: { foodItems: true },
  })

  if (!meal) notFound()

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <h1 className="text-lg font-semibold text-gray-900">Edit Meal</h1>
      </CardHeader>
      <CardContent>
        <MealLogForm
          initialData={{
            id: meal.id,
            datetime: meal.datetime.toISOString(),
            mealType: meal.mealType,
            title: meal.title,
            notes: meal.notes,
            foodItems: meal.foodItems,
          }}
        />
      </CardContent>
    </Card>
  )
}
