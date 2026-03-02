import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TimelineEntry } from '@/components/TimelineEntry'
import { Card, CardContent } from '@/components/ui/card'

interface SearchParams {
  from?: string
  to?: string
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  const patientId = session!.user.profileId

  const from = searchParams.from ? new Date(searchParams.from) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const to = searchParams.to ? new Date(searchParams.to) : new Date()

  const [meals, symptoms, contexts] = await Promise.all([
    prisma.mealLog.findMany({
      where: { patientId, datetime: { gte: from, lte: to } },
      include: { foodItems: { include: { canonicalFood: true } } },
      orderBy: { datetime: 'desc' },
    }),
    prisma.symptomLog.findMany({
      where: { patientId, datetime: { gte: from, lte: to } },
      orderBy: { datetime: 'desc' },
    }),
    prisma.contextLog.findMany({
      where: { patientId, datetime: { gte: from, lte: to } },
      orderBy: { datetime: 'desc' },
    }),
  ])

  type TimelineItem = {
    key: string
    datetime: Date
    node: React.ReactNode
  }

  const items: TimelineItem[] = [
    ...meals.map((m) => ({
      key: `meal-${m.id}`,
      datetime: m.datetime,
      node: (
        <TimelineEntry
          entry={{ type: 'meal', ...m, datetime: m.datetime.toISOString() }}
          editHref={`/logs/meal/${m.id}/edit`}
        />
      ),
    })),
    ...symptoms.map((s) => ({
      key: `symptom-${s.id}`,
      datetime: s.datetime,
      node: (
        <TimelineEntry
          entry={{ type: 'symptom', ...s, datetime: s.datetime.toISOString() }}
          editHref={`/logs/symptom/${s.id}/edit`}
        />
      ),
    })),
    ...contexts.map((c) => ({
      key: `context-${c.id}`,
      datetime: c.datetime,
      node: (
        <TimelineEntry
          entry={{ type: 'context', ...c, datetime: c.datetime.toISOString() }}
          editHref={`/logs/context/${c.id}/edit`}
        />
      ),
    })),
  ].sort((a, b) => b.datetime.getTime() - a.datetime.getTime())

  // Group by date
  const byDate: Record<string, TimelineItem[]> = {}
  for (const item of items) {
    const date = item.datetime.toLocaleDateString('sv-SE')
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(item)
  }

  const fromStr = from.toISOString().slice(0, 10)
  const toStr = to.toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Timeline</h1>
        <form className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">From</label>
          <input
            type="date"
            name="from"
            defaultValue={fromStr}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <label className="text-gray-500">To</label>
          <input
            type="date"
            name="to"
            defaultValue={toStr}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-brand-600 text-white rounded text-sm hover:bg-brand-700"
          >
            Filter
          </button>
        </form>
      </div>

      {Object.keys(byDate).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-400">
            No logs in this date range.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDate).map(([date, entries]) => (
            <div key={date}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {new Date(date).toLocaleDateString('en-SE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <div className="space-y-2">
                {entries.map((item) => (
                  <div key={item.key}>{item.node}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
