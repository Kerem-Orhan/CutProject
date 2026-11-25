import { useMemo } from 'react'
import { useStore, useTodayKey } from './store.jsx'
import { buildLoggables, sumEntries } from '../lib/nutrition.js'
import { addDays } from '../lib/dates.js'

/**
 * How often each saved item was logged in the 30 days *before* today.
 * Today is excluded on purpose so tiles don't jump around while you tap.
 */
function usageCounts(days, todayKey) {
  const counts = new Map()
  const cutoff = addDays(todayKey, -30)
  for (const [date, day] of Object.entries(days)) {
    if (date < cutoff || date >= todayKey) continue
    for (const e of day.entries) {
      if (!e.refId) continue
      const k = `${e.kind}:${e.refId}`
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
  }
  return counts
}

/** Everything the screens need, derived once per state change. */
export function useToday() {
  const { state } = useStore()
  const todayKey = useTodayKey()

  return useMemo(() => {
    const items = buildLoggables(state.foods, state.meals)
    const counts = usageCounts(state.days, todayKey)
    // Most-used first so your usual foods are always under your thumb.
    const quickItems = [...items].sort(
      (a, b) => (counts.get(b.key) ?? 0) - (counts.get(a.key) ?? 0) || a.name.localeCompare(b.name),
    )
    const entries = state.days[todayKey]?.entries ?? []
    const consumed = sumEntries(entries)
    return { todayKey, items, quickItems, entries, consumed, settings: state.settings }
  }, [state, todayKey])
}
