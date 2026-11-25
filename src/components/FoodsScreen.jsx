import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { Segmented, Button, EmptyState, TextInput, IconPlus, IconTrash } from './ui.jsx'
import { useToast } from './Toast.jsx'
import { FoodForm } from './FoodForm.jsx'
import { MealForm } from './MealForm.jsx'
import { fmt, indexById, mealNutrition, describeMeal } from '../lib/nutrition.js'
import { sampleFoods } from '../lib/storage.js'

/** "My Foods": manage saved foods and meals. */
export function FoodsScreen({ intent, clearIntent }) {
  const { state, actions } = useStore()
  const [tab, setTab] = useState('foods')
  const [query, setQuery] = useState('')
  const [editingFood, setEditingFood] = useState(undefined) // undefined = closed, null = new
  const [editingMeal, setEditingMeal] = useState(undefined)
  const toast = useToast()

  // One tap deletes; the toast's Undo brings it back (including meal contents).
  const removeFood = (f) => {
    const inMeals = state.meals.filter((m) => m.items.some((it) => it.foodId === f.id)).length
    const undo = actions.deleteFood(f.id)
    toast(`Deleted ${f.name}${inMeals ? ` · removed from ${inMeals} meal${inMeals > 1 ? 's' : ''}` : ''}`, { label: 'Undo', onClick: undo })
  }
  const removeMeal = (m) => {
    const undo = actions.deleteMeal(m.id)
    toast(`Deleted ${m.name}`, { label: 'Undo', onClick: undo })
  }

  // Deep link from other screens ("Add your first food").
  useEffect(() => {
    if (intent?.add === 'food') {
      setTab('foods')
      setEditingFood(null)
      clearIntent()
    }
  }, [intent, clearIntent])

  const foodsById = useMemo(() => indexById(state.foods), [state.foods])
  const q = query.trim().toLowerCase()
  const foods = [...state.foods]
    .filter((f) => !q || f.name.toLowerCase().includes(q) || (f.tag || '').includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
  const meals = [...state.meals]
    .filter((m) => !q || m.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
  const { trackCarbs, trackFat } = state.settings

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Foods</h1>
        <Button className="h-10 px-4 text-sm" onClick={() => (tab === 'foods' ? setEditingFood(null) : setEditingMeal(null))}>
          <IconPlus size={16} /> {tab === 'foods' ? 'Food' : 'Meal'}
        </Button>
      </header>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'foods', label: `Foods · ${state.foods.length}` },
          { value: 'meals', label: `Meals · ${state.meals.length}` },
        ]}
      />

      {(state.foods.length > 6 || state.meals.length > 6) && (
        <TextInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter your list…" aria-label="Filter" />
      )}

      {tab === 'foods' ? (
        state.foods.length === 0 ? (
          <EmptyState icon="🥚" title="No foods yet" body="Add something you eat often — eggs, yogurt, your usual coffee. You only enter the numbers once.">
            <Button onClick={() => setEditingFood(null)}>
              <IconPlus size={18} /> Add your first food
            </Button>
            <Button variant="ghost" className="text-sm" onClick={() => actions.addFoods(sampleFoods())}>
              or load a few examples
            </Button>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {foods.map((f) => (
              <li key={f.id}>
                <Row
                  emoji={f.emoji}
                  title={f.name}
                  subtitle={[f.serving, f.tag].filter(Boolean).join(' · ')}
                  calories={f.calories}
                  protein={f.protein}
                  extra={[trackCarbs && f.carbs != null ? `${fmt(f.carbs)}g carbs` : null, trackFat && f.fat != null ? `${fmt(f.fat)}g fat` : null]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setEditingFood(f)}
                  onDelete={() => removeFood(f)}
                />
              </li>
            ))}
            {foods.length === 0 && <p className="py-6 text-center text-sm text-muted">No foods match “{query}”.</p>}
          </ul>
        )
      ) : state.meals.length === 0 ? (
        <EmptyState
          icon="🍱"
          title="No meals yet"
          body={
            state.foods.length
              ? 'Bundle foods you eat together — like “Usual breakfast” — and log them all with one tap.'
              : 'First add a few foods, then bundle them into meals.'
          }
        >
          {state.foods.length > 0 ? (
            <Button onClick={() => setEditingMeal(null)}>
              <IconPlus size={18} /> Create a meal
            </Button>
          ) : (
            <Button onClick={() => (setTab('foods'), setEditingFood(null))}>
              <IconPlus size={18} /> Add a food
            </Button>
          )}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {meals.map((m) => {
            const n = mealNutrition(m, foodsById)
            return (
              <li key={m.id}>
                <Row
                  emoji={m.emoji || '🍱'}
                  title={m.name}
                  subtitle={describeMeal(m, foodsById) || 'Empty — tap to add foods'}
                  calories={n.calories}
                  protein={n.protein}
                  onClick={() => setEditingMeal(m)}
                  onDelete={() => removeMeal(m)}
                />
              </li>
            )
          })}
        </ul>
      )}

      <FoodForm open={editingFood !== undefined} food={editingFood ?? null} onClose={() => setEditingFood(undefined)} />
      <MealForm open={editingMeal !== undefined} meal={editingMeal ?? null} onClose={() => setEditingMeal(undefined)} />
    </div>
  )
}

function Row({ emoji, title, subtitle, calories, protein, extra, onClick, onDelete }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left active:bg-sunken" aria-label={`Edit ${title}`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sunken text-xl" aria-hidden>
          {emoji || '🍽️'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 leading-snug font-semibold">{title}</span>
          {(subtitle || extra) && (
            <span className="block truncate text-xs text-muted">
              {[subtitle, extra].filter(Boolean).join(' · ')}
            </span>
          )}
        </span>
        <span className="tabular shrink-0 text-right text-sm">
          <span className="block font-semibold text-cal">{fmt(calories)} kcal</span>
          <span className="block font-semibold text-pro">
            {fmt(protein)} g P
          </span>
        </span>
      </button>
      <button
        onClick={onDelete}
        className="grid w-12 shrink-0 place-items-center border-l border-line text-faint active:bg-sunken active:text-ink"
        aria-label={`Delete ${title}`}
      >
        <IconTrash size={18} />
      </button>
    </div>
  )
}
