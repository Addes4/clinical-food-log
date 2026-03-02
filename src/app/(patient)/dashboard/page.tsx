import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TimelineEntry } from '@/components/TimelineEntry'
import { computeGoalProgress } from '@/lib/analytics/goals'
import { computeSmartNudges } from '@/lib/analytics/nudges'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const patientId = session!.user.profileId

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [recentMeals, recentSymptoms, recentContexts, profile, waterToday, stoolLogs, goalProgress, nudges, missedDoses] = await Promise.all([
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
    prisma.waterLog.findMany({
      where: { patientId, datetime: { gte: todayStart } },
      orderBy: { datetime: 'desc' },
    }),
    prisma.symptomLog.findMany({
      where: { patientId, bristolScale: { not: null } },
      select: { id: true, datetime: true, bristolScale: true },
      orderBy: { datetime: 'desc' },
      take: 14,
    }),
    computeGoalProgress(patientId),
    computeSmartNudges(patientId),
    prisma.medicationLog.count({
      where: {
        patientId,
        status: 'MISSED',
        datetime: { gte: weekStart },
      },
    }),
  ])

  type AnyEntry =
    | { type: 'meal'; datetime: Date; data: typeof recentMeals[0] }
    | { type: 'symptom'; datetime: Date; data: typeof recentSymptoms[0] }
    | { type: 'context'; datetime: Date; data: typeof recentContexts[0] }

  const allEntries: AnyEntry[] = [
    ...recentMeals.map((m) => ({ type: 'meal' as const, datetime: m.datetime, data: m })),
    ...recentSymptoms.map((s) => ({ type: 'symptom' as const, datetime: s.datetime, data: s })),
    ...recentContexts.map((c) => ({ type: 'context' as const, datetime: c.datetime, data: c })),
  ]
    .sort((a, b) => b.datetime.getTime() - a.datetime.getTime())
    .slice(0, 6)

  const latestSymptom = recentSymptoms[0]
  const avgSymptom = latestSymptom
    ? (latestSymptom.painScore + latestSymptom.bloatingScore + latestSymptom.urgencyScore + latestSymptom.nauseaScore) / 4
    : null

  const waterTodayTotal = waterToday.reduce((sum, log) => sum + log.amountMl, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Good day, {profile?.displayName ?? 'Patient'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track meals, symptoms, hydration, medication, and goals.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Quick Add</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/logs/meal/new">
              <Button variant="primary">Log Meal</Button>
            </Link>
            <Link href="/logs/symptom/new">
              <Button variant="secondary">Log Symptoms</Button>
            </Link>
            <Link href="/logs/context/new">
              <Button variant="secondary">Log Context</Button>
            </Link>
            <Link href="/hydration">
              <Button variant="secondary">Add Water</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {nudges.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Smart Nudges</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nudges.map((nudge) => (
                <div key={nudge.id} className="rounded-md border border-gray-100 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{nudge.title}</p>
                    <Badge variant={nudge.severity === 'danger' ? 'danger' : nudge.severity === 'warning' ? 'warning' : 'info'}>
                      {nudge.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{nudge.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-gray-900">{waterTodayTotal} ml</div>
            <div className="text-xs text-gray-500">Hydration today</div>
            <div className="mt-2">
              <Badge variant={waterTodayTotal >= 1800 ? 'success' : waterTodayTotal >= 1200 ? 'warning' : 'default'}>
                Target 1800ml
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-gray-900">{missedDoses}</div>
            <div className="text-xs text-gray-500">Missed doses (7d)</div>
            <div className="mt-2">
              <Badge variant={missedDoses >= 3 ? 'danger' : missedDoses >= 1 ? 'warning' : 'success'}>
                {missedDoses >= 3 ? 'Needs attention' : missedDoses >= 1 ? 'Monitor' : 'On track'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-gray-900">{goalProgress.length}</div>
            <div className="text-xs text-gray-500">Active goals</div>
            <div className="mt-2">
              <Link href="/goals" className="text-xs text-brand-600 hover:underline">
                View goals
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {goalProgress.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Goal Progress</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goalProgress.map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{goal.label}</span>
                    <span className="text-gray-500">{Math.round(goal.progressRate * 100)}%</span>
                  </div>
                  <div className="h-2 mt-1 bg-gray-100 rounded-full">
                    <div
                      className="h-2 rounded-full bg-brand-600"
                      style={{ width: `${Math.min(100, Math.round(goal.progressRate * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stoolLogs.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Stool Pattern Trend (Bristol)</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {stoolLogs
                .slice()
                .reverse()
                .map((log) => (
                  <div key={log.id} className="text-center">
                    <div className="text-[10px] text-gray-400 mb-1">
                      {new Date(log.datetime).toLocaleDateString('sv-SE', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="h-20 rounded bg-gray-100 flex items-end justify-center">
                      <div
                        className="w-6 rounded-t bg-blue-500"
                        style={{ height: `${((log.bristolScale ?? 1) / 7) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-700 mt-1">{log.bristolScale}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

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
