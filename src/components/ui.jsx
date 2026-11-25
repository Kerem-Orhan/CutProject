// Small shared UI primitives: Sheet, Field, NumberField, Button, Segmented,
// ConfirmButton, EmptyState and icons.
import { useEffect, useRef, useState } from 'react'

// ------------------------------------------------------------------ Sheet

export function Sheet({ open, onClose, title, children, footer }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="animate-fade absolute inset-0 bg-black/35" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-surface shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-sunken" aria-label="Close">
            <IconX />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="pb-safe border-t border-line px-5 pt-3">{footer}</div>}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Buttons

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-ink text-surface active:opacity-80',
    soft: 'bg-sunken text-ink active:bg-line',
    ghost: 'text-muted active:bg-sunken',
    danger: 'bg-sunken text-ink active:bg-line', // deliberately not red
  }
  return (
    <button
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

/** Two-tap confirm, so we never need blocking browser dialogs. */
export function ConfirmButton({ children, confirmLabel = 'Tap again to confirm', onConfirm, className = '', ...props }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <Button
      variant={armed ? 'primary' : 'danger'}
      className={className}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
      {...props}
    >
      {armed ? confirmLabel : children}
    </Button>
  )
}

export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`flex rounded-2xl bg-sunken p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 flex-1 rounded-xl text-sm font-semibold transition ${
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-line transition peer-checked:bg-cal" />
        <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

// ------------------------------------------------------------------ Fields

export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm font-medium text-ink">⚠︎ {error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-faint">{hint}</span>
      ) : null}
    </label>
  )
}

const inputCls = (error) =>
  `h-12 w-full rounded-2xl border bg-bg px-4 outline-none transition focus:border-ink ${
    error ? 'border-ink' : 'border-line'
  }`

export function TextInput({ error, className = '', ...props }) {
  return <input className={`${inputCls(error)} ${className}`} {...props} />
}

export function NumberInput({ error, suffix, className = '', ...props }) {
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        autoComplete="off"
        className={`${inputCls(error)} tabular pr-12 ${className}`}
        aria-invalid={!!error}
        {...props}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-faint">{suffix}</span>}
    </div>
  )
}

// ------------------------------------------------------------------ Empty state

export function EmptyState({ icon = '🍽️', title, body, children }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-6 py-10 text-center">
      <div className="mb-3 text-4xl" aria-hidden>{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {children && <div className="mt-5 flex flex-col items-center gap-2">{children}</div>}
    </div>
  )
}

// ------------------------------------------------------------------ Icons

const Svg = ({ children, size = 22, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    {children}
  </svg>
)
export const IconX = (p) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>
export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconMinus = (p) => <Svg {...p}><path d="M5 12h14" /></Svg>
export const IconToday = (p) => <Svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></Svg>
export const IconSpark = (p) => <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></Svg>
export const IconList = (p) => <Svg {...p}><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></Svg>
export const IconChart = (p) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>
export const IconGear = (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>
export const IconBolt = (p) => <Svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Svg>
export const IconChevron = (p) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
export const IconTrash = (p) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Svg>
