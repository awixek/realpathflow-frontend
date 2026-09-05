import { useEffect, useState } from 'react'
import Heatmap from '../components/Heatmap'
import NavBar from '../components/NavBar'
import { fetchDashboard } from '../lib/dashboardApi'
import { buildHeatmapWeeks, HeatmapCell } from '../lib/heatmap'
import { fetchDailyRecords } from '../lib/historyApi'
import { useAuth } from '../lib/useAuth'

export default function ProfilePage() {
  const { session } = useAuth()
  const [weeks, setWeeks] = useState<HeatmapCell[][] | null>(null)
  const [totalHours, setTotalHours] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const dashboard = await fetchDashboard()
        if (!dashboard.roadmapCreatedAt) {
          setWeeks([])
          return
        }
        const startDate = dashboard.roadmapCreatedAt.slice(0, 10)
        const today = new Date().toISOString().slice(0, 10)
        const history = await fetchDailyRecords(startDate, today)

        setTotalHours(history.reduce((sum, day) => sum + day.hoursLogged, 0))
        setWeeks(buildHeatmapWeeks(history, startDate))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load your history.')
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-2xl text-paper">{session?.user.email}</h1>

        {weeks === null && !error && <p className="mt-4 text-sm text-mute">Loading your history…</p>}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {weeks && weeks.length === 0 && (
          <p className="mt-4 text-sm text-mute">No roadmap history yet — start a task to begin your streak.</p>
        )}

        {weeks && weeks.length > 0 && (
          <>
            <p className="mt-1 text-sm text-mute">{Math.round(totalHours)} hours logged so far</p>
            <div className="mt-8 rounded-lg border border-ink-border p-5">
              <Heatmap weeks={weeks} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
