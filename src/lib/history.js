import { sumEntries } from './nutrition.js'
import { addDays } from './dates.js'

/**
 * Average calories and protein over the 7 days before `todayKey`.
 * Today is excluded (it isn't finished) and days with nothing logged are
 * skipped, so a forgotten day doesn't drag the average down.
 */
export function sevenDayAverage(days, todayKey) {
  const totals = []
  for (let i = 1; i <= 7; i++) {
    const entries = days[addDays(todayKey, -i)]?.entries ?? []
    if (entries.length) totals.push(sumEntries(entries))
  }
  if (!totals.length) return null
  const avg = (k) => totals.reduce((s, t) => s + t[k], 0) / totals.length
  return { days: totals.length, calories: avg('calories'), protein: avg('protein') }
}
