'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface Goal {
  id: string
  metric: 'ADHERENCE_RATE' | 'WATER_DAILY_ML'
  targetValue: number
  periodDays: number
  active: boolean
}

interface GoalProgress {
  id: string
  metric: string
  targetValue: number
  currentValue: number
  progressRate: number
  periodDays: number
  label: string
}

const metricLabel: Record<string, string> = {
  ADHERENCE_RATE: 'Adherence rate',
  WATER_DAILY_ML: 'Daily hydration',
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [progress, setProgress] = useState<GoalProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [adherenceTarget, setAdherenceTarget] = useState('0.8')
  const [waterTarget, setWaterTarget] = useState('1800')

  async function load() {
    setLoading(true)
    const [goalsRes, progressRes] = await Promise.all([
      fetch('/api/goals'),
      fetch('/api/goals/progress'),
    ])

    if (!goalsRes.ok || !progressRes.ok) {
      setError('Could not load goals')
      setLoading(false)
      return
    }

    const [goalData, progressData] = await Promise.all([goalsRes.json(), progressRes.json()])
    setGoals(goalData)
    setProgress(progressData)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function saveGoal(metric: Goal['metric'], targetValue: number, periodDays: number) {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric,
        targetValue,
        periodDays,
        active: true,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not save goal')
      return
    }
    await load()
  }

  async function toggleGoal(goal: Goal) {
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !goal.active }),
    })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Goals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track adherence and hydration targets.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Set Targets</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-gray-200 p-3">
              <Label htmlFor="adherenceTarget">Adherence target (0-1)</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="adherenceTarget"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={adherenceTarget}
                  onChange={(e) => setAdherenceTarget(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() => saveGoal('ADHERENCE_RATE', Number.parseFloat(adherenceTarget), 21)}
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-3">
              <Label htmlFor="waterTarget">Hydration target (ml/day)</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="waterTarget"
                  type="number"
                  min={500}
                  max={6000}
                  value={waterTarget}
                  onChange={(e) => setWaterTarget(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() => saveGoal('WATER_DAILY_ML', Number.parseInt(waterTarget, 10), 7)}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Current Progress</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : progress.length === 0 ? (
            <p className="text-sm text-gray-500">No active goals configured.</p>
          ) : (
            <div className="space-y-3">
              {progress.map((p) => (
                <div key={p.id} className="rounded-md border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{metricLabel[p.metric] ?? p.label}</p>
                    <Badge variant={p.progressRate >= 1 ? 'success' : p.progressRate >= 0.75 ? 'warning' : 'default'}>
                      {Math.round(p.progressRate * 100)}%
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Current {p.metric === 'ADHERENCE_RATE' ? p.currentValue.toFixed(2) : `${Math.round(p.currentValue)} ml`}
                    {' '} / Target {p.metric === 'ADHERENCE_RATE' ? p.targetValue.toFixed(2) : `${Math.round(p.targetValue)} ml`}
                    {' '} ({p.periodDays} days)
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-brand-600"
                      style={{ width: `${Math.min(100, Math.round(p.progressRate * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Goal Configuration</h2>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="text-sm text-gray-500">No goals configured.</p>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2">
                  <div className="text-sm text-gray-700">
                    {metricLabel[goal.metric]} • target {goal.targetValue} • {goal.periodDays} days
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => toggleGoal(goal)}>
                    {goal.active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
