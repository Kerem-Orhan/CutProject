import { useEffect, useMemo, useState } from 'react'
import { Sheet, Button, ConfirmButton, Field, TextInput, IconMinus, IconPlus, IconX } from './ui.jsx'
import { useStore } from '../state/store.jsx'
import { fmt, formatServings, indexById, mealNutrition } from '../lib/nutrition.js'
import { DEFAULT_TAGS } from './FoodForm.jsx'

const MEAL_EMOJI = ['🍳', '🥪', '🍱', '🍲', '🌯', '🥣', '🍽️', '🥡']

/** Build a meal from saved foods. Totals are always live from the foods. */
export function MealForm({ open, meal, onClose }) {
  const { state, actions } = useStore()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [tag, setTag] = useState('')
  const [items, setItems] = useState([])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setName(meal?.name ?? '')
    setEmoji(meal?.emoji ?? '')
    setTag(meal?.tag ?? '')
    setItems(meal?.items ?? [])
    setErrors({})
  }, [open, meal])

  const foodsById = useMemo(() => indexById(state.foods), [state.foods])
  const totals = mealNutrition({ items }, foodsById)
  const inMeal = new Set(items.map((i) => i.foodId))

  const addFood = (foodId) => setItems((list) => [...list, { foodId, servings: 1 }])
  const bump = (foodId, delta) =>
    setItems((list) =>
      list.map((it) => (it.foodId === foodId ? { ...it, servings: Math.max(0.5, Math.round((it.servings + delta) * 2) / 2) } : it)),
    )
  const removeItem = (foodId) => setItems((list) => list.filter((it) => it.foodId !== foodId))

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!items.length) errs.items = 'Add at least one food'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    const data = { name: name.trim(), emoji: emoji.trim(), tag, items }
    if (meal) actions.updateMeal({ ...meal, ...data })
    else actions.addMeal(data)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={meal ? 'Edit meal' : 'New meal'}
      footer={
        <div className="space-y-3">
          <div className="tabular flex justify-between text-sm">
            <span className="text-muted">Meal total</span>
            <span>
              <b className="text-cal">{fmt(totals.calories)} kcal</b> · <b className="text-pro">{fmt(totals.protein)} g protein</b>
            </span>
          </div>
          <div className="flex gap-2">
            {meal && (
              <ConfirmButton
                className="flex-1"
                onConfirm={() => {
                  actions.deleteMeal(meal.id)
                  onClose()
                }}
              >
                Delete
              </ConfirmButton>
            )}
            <Button className="flex-[2]" type="submit" form="meal-form">
              {meal ? 'Save meal' : 'Create meal'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="meal-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-[4.5rem_1fr] gap-3">
          <Field label="Icon">
            <TextInput value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🍱" maxLength={4} className="text-center text-xl" aria-label="Emoji" />
          </Field>
          <Field label="Name" error={errors.name}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Usual breakfast" error={errors.name} autoFocus={!meal} />
          </Field>
        </div>
        <div className="flex gap-1">
          {MEAL_EMOJI.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setEmoji((cur) => (cur === em ? '' : em))}
              className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${emoji === em ? 'bg-ink/10 ring-2 ring-ink' : 'bg-sunken'}`}
              aria-label={`Use ${em}`}
            >
              {em}
            </button>
          ))}
        </div>
        <Field label="Category (optional)">
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag((cur) => (cur === t ? '' : t))}
                className={`h-9 rounded-full px-4 text-sm font-semibold capitalize ${tag === t ? 'bg-ink text-surface' : 'bg-sunken text-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">In this meal</h3>
          {items.length === 0 ? (
            <p className={`rounded-2xl bg-sunken px-4 py-4 text-sm ${errors.items ? 'font-medium text-ink' : 'text-muted'}`}>
              {errors.items ? `⚠︎ ${errors.items}` : 'Pick foods below to add them.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => {
                const f = foodsById.get(it.foodId)
                if (!f) return null
                return (
                  <li key={it.foodId} className="flex items-center gap-2 rounded-2xl bg-sunken py-1.5 pr-1.5 pl-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {f.emoji} {f.name}
                      </span>
                      <span className="tabular block text-xs text-muted">
                        {fmt(f.calories * it.servings)} kcal · {fmt(f.protein * it.servings)} g P
                      </span>
                    </span>
                    <button type="button" onClick={() => bump(it.foodId, -0.5)} className="grid h-9 w-9 place-items-center rounded-xl bg-surface" aria-label={`Less ${f.name}`}>
                      <IconMinus size={16} />
                    </button>
                    <span className="tabular w-8 text-center font-semibold">{formatServings(it.servings)}</span>
                    <button type="button" onClick={() => bump(it.foodId, 0.5)} className="grid h-9 w-9 place-items-center rounded-xl bg-surface" aria-label={`More ${f.name}`}>
                      <IconPlus size={16} />
                    </button>
                    <button type="button" onClick={() => removeItem(it.foodId)} className="grid h-9 w-9 place-items-center rounded-xl text-faint" aria-label={`Remove ${f.name}`}>
                      <IconX size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Add foods</h3>
          {state.foods.length === 0 ? (
            <p className="text-sm text-muted">Save some foods first, then bundle them into meals.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state.foods
                .filter((f) => !inMeal.has(f.id))
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => addFood(f.id)}
                    className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-medium active:bg-sunken"
                  >
                    <IconPlus size={14} /> {f.emoji} {f.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      </form>
    </Sheet>
  )
}
