import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TimelineEntry } from '@/components/TimelineEntry'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const patientId = session!.user.profileId

  const [recentMeals, recentSymptoms, recentContexts, profile] = await Promise.all([
    prisma.mealLog.findMany({
      where: { patientId },
      include: { foodItems: { include: { canonicalFood: true } } },
      orderBy: { datetime: 'desc' },
      take: 3,
    }),
    prisma.symptomLog.findMany({
      where: { patientId },
      orderBy: { datetime: 'desc' },
      take: 3,
    }),
    prisma.contextLog.findMany({
      where: { patientId },
      orderBy: { datetime: 'desc' },
      take: 1,
    }),
    prisma.patientProfile.findUnique({ where: { id: patientId } }),
  ])

  // Merge and sort by datetime desc
  type AnyEntry =
    | { type: 'meal'; datetime: Date; data: typeof recentMeals[0] }
    | { type: 'symptom'; datetime: Date; data: typeof recentSymptoms[0] }
    | { type: 'context'; datetime: Date; data: typeof recentContexts[0] }

  const allEntries: AnyEntry[] = [
    ...recentMeals.map((m) => ({ type: 'meal' as const, datetime: m.datetime, data: m })),
    ...recentSymptoms.map((s) => ({ type: 'symptom' as const, datetime: s.datetime, data: s })),
    ...recentContexts.map((c) => ({ type: 'context' as const, datetime: c.datetime, data: c })),
  ].sort((a, b) => b.datetime.getTime() - a.datetime.getTime()).slice(0, 6)

  const latestSymptom = recentSymptoms[0]
  const avgSymptom = latestSymptom
    ? (latestSymptom.painScore + latestSymptom.bloatingScore + latestSymptom.urgencyScore + latestSymptom.nauseaScore) / 4
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Good day, {profile?.displayName ?? 'Patient'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your meals, symptoms, and daily context</p>
        </div>
      </div>

      {/* Quick add */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Quick Add</h2>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Link href="/logs/meal/new">
              <Button variant="primary">Log Meal</Button>
            </Link>
            <Link href="/logs/symptom/new">
              <Button variant="secondary">Log Symptoms</Button>
            </Link>
            <Link href="/logs/context/new">
              <Button variant="secondary">Log Context</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Latest symptom summary */}
      {latestSymptom && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Latest Symptom Log</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{latestSymptom.painScore}</div>
                  <div className="text-xs text-gray-500">Pain</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{latestSymptom.bloatingScore}</div>
                  <div className="text-xs text-gray-500">Bloating</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{latestSymptom.urgencyScore}</div>
                  <div className="text-xs text-gray-500">Urgency</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{latestSymptom.nauseaScore}</div>
                  <div className="text-xs text-gray-500">Nausea</div>
                </div>
              </div>
              {avgSymptom !== null && (
                <Badge variant={avgSymptom >= 5 ? 'danger' : avgSymptom >= 3 ? 'warning' : 'success'}>
                  Avg {avgSymptom.toFixed(1)}/10
                </Badge>
              )}
              <div className="ml-auto text-xs text-gray-400">
                {new Date(latestSymptom.datetime).toLocaleDateString('sv-SE')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
          <Link href="/timeline" className="text-xs text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {allEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-400">
              No logs yet. Use Quick Add to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allEntries.map((entry) => {
              if (entry.type === 'meal') {
                return (
                  <TimelineEntry
                    key={`meal-${entry.data.id}`}
                    entry={{ type: 'meal', ...entry.data, datetime: entry.data.datetime.toISOString() }}
                    editHref={`/logs/meal/${entry.data.id}/edit`}
                  />
                )
              }
              if (entry.type === 'symptom') {
                return (
                  <TimelineEntry
                    key={`symptom-${entry.data.id}`}
                    entry={{ type: 'symptom', ...entry.data, datetime: entry.data.datetime.toISOString() }}
                    editHref={`/logs/symptom/${entry.data.id}/edit`}
                  />
                )
              }
              return (
                <TimelineEntry
                  key={`context-${entry.data.id}`}
                  entry={{ type: 'context', ...entry.data, datetime: entry.data.datetime.toISOString() }}
                  editHref={`/logs/context/${entry.data.id}/edit`}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
