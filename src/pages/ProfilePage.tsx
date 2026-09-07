import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Heatmap from '../components/Heatmap'
import LoadingState from '../components/LoadingState'
import NavBar from '../components/NavBar'
import { fetchDashboard } from '../lib/dashboardApi'
import { buildHeatmapWeeks, HeatmapCell } from '../lib/heatmap'
import { fetchDailyRecords, fetchHistorySummary } from '../lib/historyApi'
import { useAuth } from '../lib/useAuth'
import { fetchPreferences, updatePreferences } from '../lib/preferencesApi'

export default function ProfilePage() {
  const { session } = useAuth()
  const [weeks, setWeeks] = useState<HeatmapCell[][] | null>(null)
  const [totalHours, setTotalHours] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [timezone, setTimezone] = useState('UTC')
  const [capacity, setCapacity] = useState(120)
  const [saved, setSaved] = useState(false)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [qualifiedDays, setQualifiedDays] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const prefs = await fetchPreferences()
        setTimezone(prefs.timezone); setCapacity(prefs.daily_capacity_minutes)
        const dashboard = await fetchDashboard()
        if (!dashboard.roadmapCreatedAt) {
          setWeeks([])
          return
        }
        const startDate = dashboard.roadmapCreatedAt.slice(0, 10)
        const today = new Date().toISOString().slice(0, 10)
        const history = await fetchDailyRecords(startDate, today)
        const summary = await fetchHistorySummary(365)
        setStreak(summary.current_streak ?? 0)
        setBestStreak(summary.best_streak ?? 0)
        setQualifiedDays(summary.qualified_days ?? 0)

        setTotalHours(history.reduce((sum, day) => sum + day.hoursLogged, 0))
        setWeeks(buildHeatmapWeeks(history, startDate))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load your history.')
      }
    }
    load()
  }, [])

  async function savePlannerSettings() {
    setError(null); setSaved(false)
    try { await updatePreferences({ timezone, daily_capacity_minutes: capacity }); setSaved(true) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save planner settings.') }
  }

  return (
    <div className="min-h-screen">
      <NavBar />

      {weeks === null && !error && <LoadingState label="Loading your history…" />}

      {(weeks !== null || error) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-4xl px-6 py-10"
        >
          <h1 className="font-display text-2xl text-paper">{session?.user.email}</h1>
          <div className="mt-6 rounded-lg border border-ink-border p-5">
            <h2 className="text-sm font-medium text-paper">Daily planner settings</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-mute">Timezone<input value={timezone} onChange={e=>setTimezone(e.target.value)} className="rounded-md border border-ink-border bg-ink-panel px-3 py-2 text-sm text-paper" placeholder="Asia/Kolkata" /></label>
              <label className="flex flex-col gap-1 text-xs text-mute">Available minutes/day<input type="number" min={15} max={1440} value={capacity} onChange={e=>setCapacity(Number(e.target.value))} className="rounded-md border border-ink-border bg-ink-panel px-3 py-2 text-sm text-paper" /></label>
            </div>
            <button onClick={savePlannerSettings} className="mt-4 rounded-md bg-flow px-4 py-2 text-sm font-medium text-ink">Save planner settings</button>
            {saved && <span className="ml-3 text-xs text-flow">Saved</span>}
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          {weeks && weeks.length === 0 && (
            <p className="mt-4 text-sm text-mute">No roadmap history yet — start a task to begin your streak.</p>
          )}

          {weeks && weeks.length > 0 && (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-ink-border p-4"><p className="text-xs text-mute">Current streak</p><p className="mt-1 font-display text-xl text-paper">{streak} day{streak === 1 ? '' : 's'}</p></div>
                <div className="rounded-lg border border-ink-border p-4"><p className="text-xs text-mute">Best streak</p><p className="mt-1 font-display text-xl text-paper">{bestStreak} days</p></div>
                <div className="rounded-lg border border-ink-border p-4"><p className="text-xs text-mute">Qualified days</p><p className="mt-1 font-display text-xl text-paper">{qualifiedDays}</p></div>
              </div>
              <p className="mt-4 text-sm text-mute">{Math.round(totalHours)} hours logged so far</p>
              <div className="mt-8 rounded-lg border border-ink-border p-5">
                <Heatmap weeks={weeks} />
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}
