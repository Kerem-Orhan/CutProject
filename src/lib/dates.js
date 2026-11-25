// Dates are stored as local-calendar keys ("2026-11-24"), never as UTC,
// so a "day" always means the user's own midnight-to-midnight.

const pad = (n) => String(n).padStart(2, '0')

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key, delta) {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + delta)
  return dateKey(d)
}

/** Milliseconds until the next local midnight. */
export function msUntilMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return next.getTime() - now.getTime()
}

export function formatDayLabel(key, todayKey = dateKey()) {
  if (key === todayKey) return 'Today'
  if (key === addDays(todayKey, -1)) return 'Yesterday'
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
