import { useMemo, useState } from 'react'
import { useStore, useTodayKey } from '../state/store.jsx'
import { sumEntries, fmt } from '../lib/nutrition.js'
import { formatDayLabel } from '../lib/dates.js'
import { sevenDayAverage } from '../lib/history.js'
import { EntryList } from './EntryList.jsx'
import { EmptyState, IconChevron } from './ui.jsx'

export function HistoryScreen() {
  const { state } = useStore()
  const todayKey = useTodayKey()
  const [open, setOpen] = useState(null)
  const { calorieGoal, proteinGoal, goalType, trackCarbs, trackFat } = state.settings

  const days = useMemo(
    () =>
      Object.values(state.days)
        .filter((d) => d.entries.length > 0)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((d) => ({ ...d, totals: sumEntries(d.entries) })),
    [state.days],
  )
  const avg = useMemo(() => sevenDayAverage(state.days, todayKey), [state.days, todayKey])
  const max = Math.max(calorieGoal, ...days.slice(0, 14).map((d) => d.totals.calories), 1)

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">History</h1>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4" aria-label="7-day average">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">7-day average</h2>
          <span className="text-xs text-muted">{avg ? `${avg.days} logged day${avg.days > 1 ? 's' : ''}, not counting today` : 'Not counting today'}</span>
        </div>
        {avg ? (
          <div className="tabular mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-cal-soft px-4 py-3">
              <div className="text-2xl font-bold text-cal">{fmt(avg.calories)}</div>
              <div className="text-xs text-muted">kcal / day · goal {fmt(calorieGoal)}</div>
            </div>
            <div className="rounded-2xl bg-pro-soft px-4 py-3">
              <div className="text-2xl font-bold text-pro">{fmt(avg.protein)} g</div>
              <div className="text-xs text-muted">protein / day · goal {fmt(proteinGoal)}</div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Your average appears once you’ve logged a day before today.</p>
        )}
      </section>

      {days.length === 0 ? (
        <EmptyState icon="📅" title="No history yet" body="Each day you log is kept here. A new day starts automatically at midnight." />
      ) : (
        <ul className="space-y-2">
          {days.map((d) => {
            const isOpen = open === d.date
            const pct = Math.min(1, d.totals.calories / max)
            const over = goalType === 'under' && d.totals.calories > calorieGoal
            return (
              <li key={d.date} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
                <button className="w-full p-4 text-left active:bg-sunken" onClick={() => setOpen(isOpen ? null : d.date)} aria-expanded={isOpen}>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-semibold">{formatDayLabel(d.date, todayKey)}</span>
                    <span className="tabular text-sm">
                      <b className="text-cal">{fmt(d.totals.calories)}</b> <span className="text-faint">kcal</span> ·{' '}
                      <b className="text-pro">{fmt(d.totals.protein)}</b> <span className="text-faint">g P</span>
                    </span>
                    <IconChevron size={16} className={`text-faint transition ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                  <div className="relative mt-2.5 h-2 rounded-full bg-sunken" aria-hidden>
                    <div className="h-2 rounded-full" style={{ width: `${pct * 100}%`, background: over ? 'var(--color-calm)' : 'var(--color-cal)' }} />
                    <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink/40" style={{ left: `${(calorieGoal / max) * 100}%` }} title="Goal" />
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-line bg-bg p-3">
                    <EntryList entries={d.entries} showMacros={trackCarbs || trackFat} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
