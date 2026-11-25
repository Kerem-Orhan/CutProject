import { useEffect, useState } from 'react'
import { Sheet, Button, IconMinus, IconPlus } from './ui.jsx'
import { fmt, formatServings } from '../lib/nutrition.js'

const PRESETS = [0.5, 1, 1.5, 2, 3]
const STEP = 0.5
const MIN = 0.25
const MAX = 20

/** Pick servings (½, 1½, 2…) before logging; also used to edit an entry. */
export function ServingSheet({ item, open, onClose, onConfirm, initial = 1, confirmLabel = 'Log it' }) {
  const [servings, setServings] = useState(initial)
  useEffect(() => {
    if (open) setServings(initial)
  }, [open, initial])

  if (!item) return null
  const dec = () => setServings((s) => Math.max(MIN, s <= STEP ? MIN : Math.round((s - STEP) * 4) / 4))
  const inc = () => setServings((s) => Math.min(MAX, s < STEP ? STEP : Math.round((s + STEP) * 4) / 4))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${item.emoji ? item.emoji + ' ' : ''}${item.name}`}
      footer={
        <Button className="w-full" onClick={() => onConfirm(servings)}>
          {confirmLabel} · {fmt(item.calories * servings)} kcal
        </Button>
      }
    >
      {item.serving && <p className="-mt-1 mb-4 text-sm text-muted">1 serving = {item.serving}</p>}

      <div className="flex items-center justify-between rounded-3xl bg-sunken p-2">
        <button onClick={dec} className="grid h-14 w-14 place-items-center rounded-2xl bg-surface active:scale-95" aria-label="Fewer servings">
          <IconMinus />
        </button>
        <div className="text-center">
          <div className="tabular text-4xl font-bold" aria-live="polite">{formatServings(servings)}</div>
          <div className="text-xs text-muted">serving{servings === 1 ? '' : 's'}</div>
        </div>
        <button onClick={inc} className="grid h-14 w-14 place-items-center rounded-2xl bg-surface active:scale-95" aria-label="More servings">
          <IconPlus />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setServings(p)}
            className={`tabular h-11 flex-1 rounded-xl text-sm font-semibold transition ${
              servings === p ? 'bg-ink text-surface' : 'bg-sunken text-ink'
            }`}
          >
            {formatServings(p)}
          </button>
        ))}
      </div>

      <div className="tabular mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-cal-soft py-3">
          <div className="text-xl font-bold text-cal">{fmt(item.calories * servings)}</div>
          <div className="text-xs text-muted">kcal</div>
        </div>
        <div className="rounded-2xl bg-pro-soft py-3">
          <div className="text-xl font-bold text-pro">{fmt(item.protein * servings)} g</div>
          <div className="text-xs text-muted">protein</div>
        </div>
      </div>
    </Sheet>
  )
}
