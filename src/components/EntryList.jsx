import { useState } from 'react'
import { entryNutrition, fmt, formatServings } from '../lib/nutrition.js'
import { formatTime } from '../lib/dates.js'
import { IconX } from './ui.jsx'
import { ServingSheet } from './ServingSheet.jsx'

/** Logged entries for one day. Editable when onRemove / onServings are given. */
export function EntryList({ entries, onRemove, onServings, showMacros }) {
  const [editing, setEditing] = useState(null)
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {sorted.map((e) => {
          const n = entryNutrition(e)
          const s = e.snapshot
          const editable = !!onServings
          return (
            <li key={e.id} className="flex items-center gap-1">
              <button
                className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left active:bg-sunken disabled:active:bg-transparent"
                onClick={() => editable && setEditing(e)}
                disabled={!editable}
                aria-label={editable ? `Change servings of ${s.name}` : undefined}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sunken text-lg" aria-hidden>
                  {s.emoji || (e.kind === 'quick' ? '⚡' : e.kind === 'meal' ? '🍱' : '•')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {e.servings !== 1 && <span className="tabular text-muted">{formatServings(e.servings)}× </span>}
                    {s.name}
                  </span>
                  <span className="block truncate text-xs text-faint">
                    {formatTime(e.timestamp)}
                    {s.parts?.length ? ` · ${s.parts.join(', ')}` : s.serving ? ` · ${s.serving}` : ''}
                  </span>
                </span>
                <span className="tabular shrink-0 text-right text-sm">
                  <span className="block font-semibold">{fmt(n.calories)}</span>
                  <span className="block text-xs text-pro">
                    {fmt(n.protein)}g P
                    {showMacros && (n.carbs > 0 || n.fat > 0) ? (
                      <span className="text-faint"> · {fmt(n.carbs)}C {fmt(n.fat)}F</span>
                    ) : null}
                  </span>
                </span>
              </button>
              {onRemove && (
                <button
                  onClick={() => onRemove(e)}
                  className="mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-faint active:bg-sunken"
                  aria-label={`Remove ${s.name}`}
                >
                  <IconX size={18} />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {onServings && (
        <ServingSheet
          item={editing && { ...editing.snapshot }}
          open={!!editing}
          initial={editing?.servings ?? 1}
          confirmLabel="Update"
          onClose={() => setEditing(null)}
          onConfirm={(servings) => {
            onServings(editing, servings)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
