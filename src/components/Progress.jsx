import { fmt } from '../lib/nutrition.js'

/**
 * Progress ring for calories or protein.
 * `limit` = this is a ceiling (calories while cutting); going past it turns
 * the ring a calm neutral grey — no red, no warnings.
 */
export function ProgressRing({ label, value, goal, unit, color, soft, limit = false, size = 148 }) {
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = goal > 0 ? value / goal : 0
  const over = limit && value > goal
  const remaining = goal - value
  const ringColor = over ? 'var(--color-calm)' : color
  const trackColor = over ? 'var(--color-calm-soft)' : soft
  const shown = Math.min(pct, 1)

  let caption
  if (goal <= 0) caption = 'No goal set'
  else if (over) caption = `${fmt(-remaining)} ${unit} over`
  else if (remaining > 0) caption = `${fmt(remaining)} ${unit} left`
  else caption = limit ? 'Right on target' : 'Goal reached'

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - shown)}
            style={{ transition: 'stroke-dashoffset 400ms ease, stroke 300ms' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-3xl leading-none font-bold">{fmt(value)}</span>
          <span className="tabular mt-1 text-xs text-muted">
            / {fmt(goal)} {unit}
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="text-sm font-semibold">{label}</div>
        <div className="tabular text-sm text-muted" aria-live="polite">{caption}</div>
      </div>
    </div>
  )
}

/** Compact gram readout for carbs / fat (no goals for these). */
export function MacroChip({ label, grams, color }) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-2xl bg-sunken px-3 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-sm text-muted">{label}</span>
      <span className="tabular ml-auto font-semibold">{fmt(grams)} g</span>
    </div>
  )
}
