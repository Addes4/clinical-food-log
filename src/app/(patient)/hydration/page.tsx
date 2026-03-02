'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface WaterLog {
  id: string
  datetime: string
  amountMl: number
}

function toLocalDatetimeString(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function HydrationPage() {
  const [logs, setLogs] = useState<WaterLog[]>([])
  const [datetime, setDatetime] = useState(toLocalDatetimeString(new Date()))
  const [amountMl, setAmountMl] = useState('250')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/logs/water?limit=100')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not load hydration logs')
      setLoading(false)
      return
    }
    setLogs(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return logs
      .filter((l) => new Date(l.datetime).toISOString().slice(0, 10) === today)
      .reduce((sum, l) => sum + l.amountMl, 0)
  }, [logs])

  async function createLog(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/logs/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datetime: new Date(datetime).toISOString(),
        amountMl: Number.parseInt(amountMl, 10),
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not save hydration log')
      setSaving(false)
      return
    }

    setSaving(false)
    await load()
  }

  async function deleteLog(id: string) {
    const res = await fetch(`/api/logs/water/${id}`, { method: 'DELETE' })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Hydration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track water intake and daily hydration trend.</p>
        </div>
        <Badge variant={todayTotal >= 1800 ? 'success' : todayTotal >= 1200 ? 'warning' : 'default'}>
          Today: {todayTotal} ml
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Log water intake</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={createLog} className="grid grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="water-datetime">Date & Time</Label>
              <Input
                id="water-datetime"
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="water-amount">Amount (ml)</Label>
              <Input
                id="water-amount"
                type="number"
                min={50}
                max={5000}
                value={amountMl}
                onChange={(e) => setAmountMl(e.target.value)}
                required
              />
            </div>
            <div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Add intake'}
              </Button>
            </div>
          </form>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Recent hydration logs</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500">No hydration logs yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2">
                  <div>
                    <p className="text-sm text-gray-900">{log.amountMl} ml</p>
                    <p className="text-xs text-gray-500">{new Date(log.datetime).toLocaleString('sv-SE')}</p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => deleteLog(log.id)}>
                    Delete
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
