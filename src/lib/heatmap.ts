import { DayRecord } from '../types'

export interface HeatmapCell {
  date: string
  beforeStart: boolean
  completionPct: number
  hoursLogged: number
}

/**
 * Lays days out into GitHub-style columns (weeks) of 7 rows (Sun..Sat).
 * Days before the roadmap's start date are marked `beforeStart` so they
 * render as invisible placeholders rather than empty (missed) boxes.
 */
export function buildHeatmapWeeks(records: DayRecord[], roadmapStartDate: string): HeatmapCell[][] {
  const recordsByDate = new Map(records.map((r) => [r.date, r]))

  const start = new Date(roadmapStartDate)
  const today = new Date()

  // Back up to the Sunday on/before the start date, so the first column is a full week.
  const gridStart = new Date(start)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())

  const weeks: HeatmapCell[][] = []
  let week: HeatmapCell[] = []
  const cursor = new Date(gridStart)

  while (cursor <= today) {
    const isoDate = cursor.toISOString().slice(0, 10)
    const beforeStart = cursor < start
    const record = recordsByDate.get(isoDate)

    week.push({
      date: isoDate,
      beforeStart,
      completionPct: beforeStart ? 0 : (record?.completionPct ?? 0),
      hoursLogged: beforeStart ? 0 : (record?.hoursLogged ?? 0)
    })

    if (cursor.getDay() === 6) {
      weeks.push(week)
      week = []
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  if (week.length > 0) weeks.push(week)

  return weeks
}
