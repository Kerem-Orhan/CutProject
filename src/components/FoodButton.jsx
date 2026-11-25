import { useRef, useState } from 'react'
import { fmt } from '../lib/nutrition.js'

const LONG_PRESS_MS = 450

/**
 * A saved food or meal as a big tappable tile.
 *   tap        → onTap (log 1 serving)
 *   long-press → onLongPress (open the servings stepper)
 * A small "±" corner button opens the stepper too, for anyone who doesn't
 * know about long-press (and for keyboard / screen-reader users).
 */
export function FoodButton({ item, onTap, onLongPress, showMacros }) {
  const timer = useRef(null)
  const longPressed = useRef(false)
  const start = useRef({ x: 0, y: 0 })
  const btn = useRef(null)
  const [pressed, setPressed] = useState(false)

  const clear = () => {
    clearTimeout(timer.current)
    timer.current = null
    setPressed(false)
  }

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    longPressed.current = false
    start.current = { x: e.clientX, y: e.clientY }
    setPressed(true)
    timer.current = setTimeout(() => {
      longPressed.current = true
      setPressed(false)
      navigator.vibrate?.(12)
      onLongPress(item)
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (e) => {
    // Cancel if the finger is scrolling rather than pressing.
    if (timer.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear()
  }

  const onClick = () => {
    if (longPressed.current) {
      longPressed.current = false
      return
    }
    // Quick "squish" so the tap feels registered.
    btn.current?.animate?.(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.94)' }, { transform: 'scale(1)' }],
      { duration: 240, easing: 'ease-out' },
    )
    onTap(item)
  }

  return (
    <div className="relative">
      <button
        ref={btn}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={clear}
        onPointerLeave={clear}
        onPointerCancel={clear}
        onContextMenu={(e) => e.preventDefault()}
        onClick={onClick}
        className={`flex h-full min-h-[5.5rem] w-full flex-col items-start rounded-[var(--radius-card)] border border-line bg-surface p-3 pr-9 text-left shadow-[0_1px_0_rgba(0,0,0,0.03)] transition ${pressed ? 'scale-[0.97] bg-sunken' : ''}`}
        aria-label={`Log ${item.name}, ${fmt(item.calories)} calories, ${fmt(item.protein)} grams protein`}
      >
        <span className="flex w-full items-center gap-1.5">
          {item.emoji && <span className="text-lg leading-none" aria-hidden>{item.emoji}</span>}
          <span className="line-clamp-2 leading-tight font-semibold">{item.name}</span>
        </span>
        {item.serving && <span className="mt-0.5 line-clamp-1 text-xs text-faint">{item.kind === 'meal' ? 'Meal' : item.serving}</span>}
        <span className="tabular mt-auto flex flex-wrap items-baseline gap-x-2 pt-2 text-sm">
          <span className="font-semibold text-cal">{fmt(item.calories)} kcal</span>
          <span className="font-semibold text-pro">{fmt(item.protein)}g P</span>
          {showMacros && item.carbs > 0 && <span className="text-xs text-muted">{fmt(item.carbs)}C</span>}
          {showMacros && item.fat > 0 && <span className="text-xs text-muted">{fmt(item.fat)}F</span>}
        </span>
      </button>
      <button
        onClick={() => onLongPress(item)}
        className="absolute top-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-faint active:bg-sunken"
        aria-label={`Choose servings of ${item.name}`}
      >
        ±
      </button>
    </div>
  )
}
