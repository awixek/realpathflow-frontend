import { apiFetch } from './api'
import { DayRecord } from '../types'

interface RawDailyRecord {
  record_date: string
  planned_seconds: number
  actual_seconds: number
}

export async function fetchDailyRecords(startDate: string, endDate: string): Promise<DayRecord[]> {
  const params = new URLSearchParams({ start: startDate, end: endDate })
  const res = await apiFetch(`/api/v1/history/days?${params}`)
  if (!res.ok) throw new Error(`Failed to load history (${res.status})`)
  const rows: RawDailyRecord[] = await res.json()

  return rows.map((row) => ({
    date: row.record_date,
    hoursLogged: Math.round((row.actual_seconds / 3600) * 10) / 10,
    completionPct: row.planned_seconds > 0 ? Math.min(100, Math.round((row.actual_seconds / row.planned_seconds) * 100)) : 0
  }))
}
