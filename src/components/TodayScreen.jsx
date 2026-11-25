import { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { useToday } from '../state/selectors.js'
import { useLogger } from '../state/logger.jsx'
import { useToast } from './Toast.jsx'
import { ProgressRing, MacroChip } from './Progress.jsx'
import { FoodButton } from './FoodButton.jsx'
import { EntryList } from './EntryList.jsx'
import { QuickAdd } from './QuickAdd.jsx'
import { EmptyState, Button, IconBolt, IconPlus } from './ui.jsx'
import { parseDateKey } from '../lib/dates.js'
import { sampleFoods } from '../lib/storage.js'

export function TodayScreen({ goTo }) {
  const { actions } = useStore()
  const { todayKey, quickItems, entries, consumed, settings } = useToday()
  const logger = useLogger()
  const toast = useToast()
  const [quickOpen, setQuickOpen] = useState(false)
  const [filter, setFilter] = useState('all')

  const showMacros = settings.trackCarbs || settings.trackFat
  const cutting = settings.goalType === 'under'

  const tags = [...new Set(quickItems.map((i) => (i.kind === 'meal' ? 'meals' : tagOf(i))).filter(Boolean))]
  const visible =
    filter === 'all'
      ? quickItems
      : quickItems.filter((i) => (filter === 'meals' ? i.kind === 'meal' : i.kind === 'food' && tagOf(i) === filter))

  const remove = (entry) => {
    actions.removeEntries(todayKey, [entry.id])
    toast(`Removed ${entry.snapshot.name}`, { label: 'Undo', onClick: () => actions.restoreEntries(todayKey, [entry]) })
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">
          {parseDateKey(todayKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Today</h1>
      </header>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4" aria-label="Today's progress">
        <div className="flex justify-around">
          <ProgressRing
            label="Calories"
            value={consumed.calories}
            goal={settings.calorieGoal}
            unit="kcal"
            color="var(--color-cal)"
            soft="var(--color-cal-soft)"
            limit={cutting}
          />
          <ProgressRing
            label="Protein"
            value={consumed.protein}
            goal={settings.proteinGoal}
            unit="g"
            color="var(--color-pro)"
            soft="var(--color-pro-soft)"
          />
        </div>
        {showMacros && (
          <div className="mt-4 flex gap-2">
            {settings.trackCarbs && <MacroChip label="Carbs" grams={consumed.carbs} color="var(--color-carb)" />}
            {settings.trackFat && <MacroChip label="Fat" grams={consumed.fat} color="var(--color-fat)" />}
          </div>
        )}
      </section>

      <section aria-label="Log food">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tap to log</h2>
          <Button variant="soft" className="h-10 px-4 text-sm" onClick={() => setQuickOpen(true)}>
            <IconBolt size={16} /> Quick add
          </Button>
        </div>

        {quickItems.length === 0 ? (
          <EmptyState
            icon="🥚"
            title="Add the foods you eat a lot"
            body="Save each one once with its calories and protein. After that, logging is a single tap."
          >
            <Button onClick={() => goTo('foods', { add: 'food' })}>
              <IconPlus size={18} /> Add your first food
            </Button>
            <Button variant="ghost" className="text-sm" onClick={() => actions.addFoods(sampleFoods())}>
              or load a few examples
            </Button>
          </EmptyState>
        ) : (
          <>
            {tags.length > 1 && (
              <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Filter">
                {['all', ...tags].map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={filter === t}
                    onClick={() => setFilter(t)}
                    className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold capitalize transition ${
                      filter === t ? 'bg-ink text-surface' : 'bg-sunken text-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {visible.map((item) => (
                <FoodButton
                  key={item.key}
                  item={item}
                  showMacros={showMacros}
                  onTap={(it) => logger.log(it)}
                  onLongPress={(it) => logger.chooseServings(it)}
                />
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-faint">Tap = 1 serving · hold or ± for other amounts</p>
          </>
        )}
      </section>

      <section aria-label="Logged today">
        <h2 className="mb-3 text-lg font-semibold">
          Logged today {entries.length > 0 && <span className="text-muted">· {entries.length}</span>}
        </h2>
        {entries.length === 0 ? (
          <p className="rounded-[var(--radius-card)] bg-sunken px-4 py-6 text-center text-sm text-muted">
            Nothing yet. Your entries for today will show up here.
          </p>
        ) : (
          <EntryList
            entries={entries}
            showMacros={showMacros}
            onRemove={remove}
            onServings={(e, s) => actions.setServings(todayKey, e.id, s)}
          />
        )}
      </section>

      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  )
}

function tagOf(item) {
  return (item.tag || '').toLowerCase()
}
