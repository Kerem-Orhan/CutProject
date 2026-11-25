import { useMemo } from 'react'
import { useToday } from '../state/selectors.js'
import { useLogger } from '../state/logger.jsx'
import { getSuggestions, proteinDensity } from '../lib/suggestions.js'
import { fmt } from '../lib/nutrition.js'
import { Button, EmptyState, IconPlus } from './ui.jsx'

/** "What can I eat?" — everything that fits, plus the best combos. */
export function SuggestScreen({ goTo }) {
  const { items, consumed, settings } = useToday()
  const logger = useLogger()

  const s = useMemo(
    () => getSuggestions({ items, consumed, goals: settings }),
    [items, consumed, settings],
  )

  const cutting = s.mode === 'under'
  const calLeft = s.remaining.calories
  const proLeft = s.remaining.protein

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">What can I eat?</h1>
        <p className="mt-1 text-sm text-muted">
          {cutting ? 'Saved foods that fit what’s left today.' : 'Saved foods that close the gap to your target.'}
        </p>
      </header>

      <section className="tabular grid grid-cols-2 gap-2.5" aria-label="Remaining today">
        <Stat
          label={cutting ? (calLeft < 0 ? 'Over by' : 'Calories left') : calLeft > 0 ? 'Calories to go' : 'Past target by'}
          value={`${fmt(Math.abs(calLeft))}`}
          unit="kcal"
          tone={cutting && calLeft < 0 ? 'calm' : 'cal'}
        />
        <Stat
          label={proLeft > 0 ? 'Protein to go' : 'Protein goal'}
          value={proLeft > 0 ? fmt(proLeft) : 'Done'}
          unit={proLeft > 0 ? 'g' : '✓'}
          tone="pro"
        />
      </section>

      {s.status === 'empty' && (
        <EmptyState icon="💡" title="Nothing to suggest yet" body="Suggestions come from your saved foods and meals. Add a few and this screen fills in.">
          <Button onClick={() => goTo('foods', { add: 'food' })}>
            <IconPlus size={18} /> Add a food
          </Button>
        </EmptyState>
      )}

      {s.status === 'over' && (
        <div className="rounded-[var(--radius-card)] bg-calm-soft px-5 py-6 text-center">
          <div className="text-3xl" aria-hidden>🌙</div>
          <h2 className="mt-2 font-semibold">Today’s calories are covered</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
            You’re {fmt(-calLeft)} kcal past your goal, so there’s nothing to suggest. Suggestions start fresh tomorrow.
          </p>
        </div>
      )}

      {s.status === 'met' && (
        <div className="rounded-[var(--radius-card)] bg-cal-soft px-5 py-6 text-center">
          <div className="text-3xl" aria-hidden>✅</div>
          <h2 className="mt-2 font-semibold">Calorie target reached</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
            {s.proteinShort ? `Still ${fmt(proLeft)} g short on protein — these are your most protein-dense options.` : 'Protein too. Nice work today.'}
          </p>
        </div>
      )}

      {s.combos.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Best combos</h2>
          <p className="mb-3 text-sm text-muted">
            {cutting
              ? s.proteinShort
                ? 'Fit your calories and get you closest to your protein goal.'
                : 'Protein’s covered — these use your remaining calories best.'
              : 'Get you closest to your calorie target' + (s.proteinShort ? ' while topping up protein.' : '.')}
          </p>
          <ul className="space-y-2.5">
            {s.combos.map((c, i) => (
              <li key={c.key} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
                <div className="flex items-start gap-3">
                  <span className="tabular grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sunken text-xs font-bold text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {c.items.map((it) => `${it.emoji ? it.emoji + ' ' : ''}${it.name}`).join('  +  ')}
                    </div>
                    <div className="tabular mt-1 text-sm">
                      <span className="font-semibold text-cal">{fmt(c.calories)} kcal</span>
                      <span className="text-faint"> · </span>
                      <span className="font-semibold text-pro">{fmt(c.protein)} g protein</span>
                    </div>
                    <div className="tabular mt-0.5 text-xs text-muted">{afterText(s, c)}</div>
                  </div>
                </div>
                <Button className="mt-3 h-11 w-full text-sm" onClick={() => logger.logMany(c.items)}>
                  Log all {c.items.length}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.singles.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">{s.status === 'met' ? 'Protein-dense options' : cutting ? 'Everything that fits' : 'Single items'}</h2>
          <p className="mb-3 text-sm text-muted">{singlesCaption(s)}</p>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            {s.singles.map((it) => (
              <li key={it.key} className="flex items-center gap-3 py-2.5 pr-2 pl-4">
                <span className="text-xl" aria-hidden>{it.emoji || (it.kind === 'meal' ? '🍱' : '🍽️')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{it.name}</span>
                  <span className="tabular block text-xs text-muted">
                    <span className="text-cal">{fmt(it.calories)} kcal</span> · <span className="text-pro">{fmt(it.protein)} g P</span>
                    {s.proteinShort && Number.isFinite(proteinDensity(it)) && it.calories > 0 && (
                      <span className="text-faint"> · {proteinDensity(it).toFixed(1)} g/100 kcal</span>
                    )}
                  </span>
                </span>
                <Button variant="soft" className="h-10 shrink-0 px-4 text-sm" onClick={() => logger.log(it)} aria-label={`Log ${it.name}`}>
                  Log it
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.status === 'ok' && cutting && s.singles.length === 0 && (
        <p className="rounded-[var(--radius-card)] bg-sunken px-4 py-6 text-center text-sm text-muted">
          None of your saved foods fit in {fmt(calLeft)} kcal. A quick add from the Today tab works for small things.
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, unit, tone }) {
  const colors = {
    cal: 'bg-cal-soft text-cal',
    pro: 'bg-pro-soft text-pro',
    calm: 'bg-calm-soft text-calm',
  }
  return (
    <div className={`rounded-[var(--radius-card)] px-4 py-3 ${colors[tone]}`}>
      <div className="text-xs font-semibold opacity-80">{label}</div>
      <div className="text-2xl font-bold">
        {value} <span className="text-sm font-semibold">{unit}</span>
      </div>
    </div>
  )
}

function afterText(s, c) {
  const calAfter = s.remaining.calories - c.calories
  const proAfter = s.remaining.protein - c.protein
  const cal =
    s.mode === 'under'
      ? `${fmt(calAfter)} kcal left after`
      : calAfter > 0
        ? `${fmt(calAfter)} kcal still to go`
        : calAfter === 0
          ? 'hits your calorie target'
          : `${fmt(-calAfter)} kcal past target`
  const pro = proAfter > 0 ? `${fmt(proAfter)} g protein to go` : 'protein goal hit'
  return `${cal} · ${pro}`
}

function singlesCaption(s) {
  if (s.status === 'met') return 'Most protein per calorie first.'
  if (s.mode === 'under') return s.proteinShort ? 'Best protein value first (protein per calorie).' : 'Largest first.'
  return 'Closest to your remaining calories first.'
}
