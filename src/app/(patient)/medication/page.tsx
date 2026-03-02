'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface MedicationSchedule {
  id: string
  medicationName: string
  dosage?: string | null
  instructions?: string | null
  timeOfDay: string
  active: boolean
}

interface MedicationLog {
  id: string
  datetime: string
  status: 'TAKEN' | 'MISSED'
  notes?: string | null
  schedule?: MedicationSchedule | null
}

export default function MedicationPage() {
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([])
  const [logs, setLogs] = useState<MedicationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [timeOfDay, setTimeOfDay] = useState('08:00')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [schedulesRes, logsRes] = await Promise.all([
      fetch('/api/medication/schedules?includeInactive=1'),
      fetch('/api/medication/logs?limit=80'),
    ])

    if (!schedulesRes.ok || !logsRes.ok) {
      setError('Could not load medication data')
      setLoading(false)
      return
    }

    const [scheduleData, logData] = await Promise.all([schedulesRes.json(), logsRes.json()])
    setSchedules(scheduleData)
    setLogs(logData)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const missedLast7Days = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return logs.filter((l) => l.status === 'MISSED' && new Date(l.datetime).getTime() >= sevenDaysAgo).length
  }, [logs])

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/medication/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicationName: name,
        dosage: dosage || null,
        timeOfDay,
        instructions: instructions || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not create schedule')
      setSaving(false)
      return
    }

    setName('')
    setDosage('')
    setInstructions('')
    setSaving(false)
    await load()
  }

  async function logDose(scheduleId: string, status: 'TAKEN' | 'MISSED') {
    const res = await fetch('/api/medication/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId,
        datetime: new Date().toISOString(),
        status,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not log dose')
      return
    }

    await load()
  }

  async function toggleSchedule(schedule: MedicationSchedule) {
    const res = await fetch(`/api/medication/schedules/${schedule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !schedule.active }),
    })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Medication</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage schedule and track taken/missed doses.</p>
        </div>
        <Badge variant={missedLast7Days >= 3 ? 'danger' : missedLast7Days >= 1 ? 'warning' : 'success'}>
          Missed last 7 days: {missedLast7Days}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Add Medication Schedule</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={createSchedule} className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="med-name">Medication name</Label>
              <Input id="med-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="med-time">Time</Label>
              <Input id="med-time" type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="med-dose">Dosage</Label>
              <Input id="med-dose" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 135mg" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="med-instructions">Instructions</Label>
              <Textarea
                id="med-instructions"
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Optional instructions..."
              />
            </div>
            <div className="col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Add schedule'}
              </Button>
            </div>
          </form>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Schedules</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : schedules.length === 0 ? (
              <p className="text-sm text-gray-500">No schedules configured.</p>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{schedule.medicationName}</p>
                        <p className="text-xs text-gray-500">
                          {schedule.dosage ?? 'No dosage'} • {schedule.timeOfDay}
                        </p>
                        {schedule.instructions && (
                          <p className="text-xs text-gray-500 mt-1">{schedule.instructions}</p>
                        )}
                      </div>
                      <Badge variant={schedule.active ? 'success' : 'default'}>
                        {schedule.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => logDose(schedule.id, 'TAKEN')}>
                        Mark taken
                      </Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => logDose(schedule.id, 'MISSED')}>
                        Mark missed
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => toggleSchedule(schedule)}>
                        {schedule.active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Recent Dose Logs</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500">No dose logs yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 25).map((log) => (
                  <div key={log.id} className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2">
                    <div>
                      <p className="text-sm text-gray-900">{log.schedule?.medicationName ?? 'Manual medication log'}</p>
                      <p className="text-xs text-gray-500">{new Date(log.datetime).toLocaleString('sv-SE')}</p>
                    </div>
                    <Badge variant={log.status === 'TAKEN' ? 'success' : 'danger'}>{log.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
