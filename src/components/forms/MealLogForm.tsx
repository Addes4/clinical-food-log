'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FoodItemInput, FoodItem } from '@/components/FoodItemInput'
import { MealType } from '@/types'

interface MealLogFormProps {
  initialData?: {
    id: string
    datetime: string
    mealType: string
    title: string
    notes?: string | null
    foodItems: Array<{ rawInput: string; quantity?: number | null; unit?: string | null }>
  }
}

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER']

function toLocalDatetimeString(date: Date): string {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export function MealLogForm({ initialData }: MealLogFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  const [datetime, setDatetime] = useState(
    initialData?.datetime
      ? toLocalDatetimeString(new Date(initialData.datetime))
      : toLocalDatetimeString(new Date())
  )
  const [mealType, setMealType] = useState<string>(initialData?.mealType ?? 'BREAKFAST')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [foodItems, setFoodItems] = useState<FoodItem[]>(
    initialData?.foodItems?.map((fi) => ({
      rawInput: fi.rawInput,
      quantity: fi.quantity?.toString() ?? '',
      unit: fi.unit ?? '',
    })) ?? [{ rawInput: '', quantity: '', unit: '' }]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      datetime: new Date(datetime).toISOString(),
      mealType,
      title: title.trim(),
      notes: notes.trim() || null,
      foodItems: foodItems
        .filter((fi) => fi.rawInput.trim())
        .map((fi) => ({
          rawInput: fi.rawInput.trim(),
          quantity: fi.quantity ? parseFloat(fi.quantity) : undefined,
          unit: fi.unit || undefined,
        })),
    }

    const url = isEdit ? `/api/logs/meal/${initialData!.id}` : '/api/logs/meal'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="datetime">Date & Time</Label>
          <Input
            id="datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="mealType">Meal Type</Label>
          <Select
            id="mealType"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            {MEAL_TYPES.map((mt) => (
              <option key={mt} value={mt}>
                {mt.charAt(0) + mt.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Meal Title</Label>
        <Input
          id="title"
          placeholder="e.g. Lunch at home"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Food Items</Label>
        <FoodItemInput items={foodItems} onChange={setFoodItems} />
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Any additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update meal' : 'Log meal'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
