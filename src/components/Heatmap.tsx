import { useState } from 'react'
import { HeatmapCell } from '../lib/heatmap'

const ROW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatLabel(cell: HeatmapCell) {
  const [y, m, d] = cell.date.split('-')
  return `Total progress from ${m}/${d}/${y} is ${cell.hoursLogged} hours`
}

export default function Heatmap({ weeks }: { weeks: HeatmapCell[][] }) {
  const [activeCell, setActiveCell] = useState<HeatmapCell | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto pb-2">
        <div className="flex flex-col gap-1 pr-2">
          {ROW_LABELS.map((label) => (
            <span key={label} className="h-3.5 text-[10px] leading-3.5 text-mute">
              {label[0]}
            </span>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => {
              if (cell.beforeStart) {
                return <div key={cell.date} className="h-3.5 w-3.5" />
              }
              return (
                <button
                  key={cell.date}
                  onMouseEnter={() => setActiveCell(cell)}
                  onFocus={() => setActiveCell(cell)}
                  onClick={() => setActiveCell(cell)}
                  className="relative h-3.5 w-3.5 overflow-hidden rounded-[3px] border border-ink-border"
                  aria-label={formatLabel(cell)}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-flow"
                    style={{ height: `${cell.completionPct}%` }}
                  />
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <p className="h-4 text-xs text-mute">{activeCell ? formatLabel(activeCell) : 'Hover a day to see its total.'}</p>
    </div>
  )
}
