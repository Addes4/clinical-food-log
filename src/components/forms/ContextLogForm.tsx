'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScoreInput } from '@/components/ScoreInput'
import { Exercise } from '@/types'

interface ContextLogFormProps {
  initialData?: {
    id: string
    datetime: string
    stressScore: number
    sleepHours: number
    medicationTaken?: string | null
    alcohol: boolean
    exercise: string
    notes?: string | null
  }
}

const EXERCISE_OPTIONS: Exercise[] = ['NONE', 'LIGHT', 'MODERATE', 'INTENSE']

function toLocalDatetimeString(date: Date): string {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export function ContextLogForm({ initialData }: ContextLogFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  const [datetime, setDatetime] = useState(
    initialData?.datetime
      ? toLocalDatetimeString(new Date(initialData.datetime))
      : toLocalDatetimeString(new Date())
  )
  const [stressScore, setStressScore] = useState(initialData?.stressScore ?? 0)
  const [sleepHours, setSleepHours] = useState(initialData?.sleepHours?.toString() ?? '7')
  const [medicationTaken, setMedicationTaken] = useState(initialData?.medicationTaken ?? '')
  const [alcohol, setAlcohol] = useState(initialData?.alcohol ?? false)
  const [exercise, setExercise] = useState(initialData?.exercise ?? 'NONE')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      datetime: new Date(datetime).toISOString(),
      stressScore,
      sleepHours: parseFloat(sleepHours),
      medicationTaken: medicationTaken.trim() || null,
      alcohol,
      exercise,
      notes: notes.trim() || null,
    }

    const url = isEdit ? `/api/logs/context/${initialData!.id}` : '/api/logs/context'
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

      <div className="p-4 bg-gray-50 rounded-md">
        <ScoreInput
          label="Stress level"
          name="stressScore"
          value={stressScore}
          onChange={setStressScore}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sleepHours">Sleep (hours)</Label>
          <Input
            id="sleepHours"
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="exercise">Exercise</Label>
          <Select
            id="exercise"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
          >
            {EXERCISE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.charAt(0) + opt.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="medication">Medication taken (optional)</Label>
          <Input
            id="medication"
            value={medicationTaken}
            onChange={(e) => setMedicationTaken(e.target.value)}
            placeholder="e.g. Mebeverine 135mg"
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input
            id="alcohol"
            type="checkbox"
            checked={alcohol}
            onChange={(e) => setAlcohol(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600"
          />
          <label htmlFor="alcohol" className="text-sm text-gray-700">
            Alcohol consumed
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional context..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update context' : 'Log context'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
