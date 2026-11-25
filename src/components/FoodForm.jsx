import { useEffect, useState } from 'react'
import { Sheet, Button, ConfirmButton, Field, TextInput, NumberInput } from './ui.jsx'
import { validateFields } from '../lib/validate.js'
import { useStore } from '../state/store.jsx'
import { useToast } from './Toast.jsx'

export const DEFAULT_TAGS = ['breakfast', 'lunch', 'dinner', 'snack', 'drink']
export const EMOJI_PICKS = ['🥚', '🍗', '🥩', '🐟', '🥛', '🧀', '🍞', '🍚', '🍝', '🥗', '🍌', '🍎', '🥜', '🥤', '☕', '🍫']

const toText = (n) => (n === null || n === undefined ? '' : String(n))

/** Add or edit a saved food. `food` = null → new. */
export function FoodForm({ open, food, onClose }) {
  const { state, actions } = useStore()
  const toast = useToast()
  const { trackCarbs, trackFat } = state.settings
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm({
      name: food?.name ?? '',
      serving: food?.serving ?? '',
      calories: toText(food?.calories),
      protein: toText(food?.protein),
      carbs: toText(food?.carbs),
      fat: toText(food?.fat),
      tag: food?.tag ?? '',
      emoji: food?.emoji ?? '',
    })
  }, [open, food])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const usedIn = food ? state.meals.filter((m) => m.items.some((it) => it.foodId === food.id)) : []
  const tagOptions = [...new Set([...DEFAULT_TAGS, ...state.foods.map((f) => f.tag).filter(Boolean)])]

  const submit = (e) => {
    e.preventDefault()
    const { values, errors: errs } = validateFields({
      calories: [form.calories, { required: true, label: 'Calories' }],
      protein: [form.protein, { label: 'Protein', max: 1000 }],
      carbs: [form.carbs, { label: 'Carbs', max: 1000 }],
      fat: [form.fat, { label: 'Fat', max: 1000 }],
    })
    if (!form.name.trim()) errs.name = 'Name is required'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    const data = {
      name: form.name.trim(),
      serving: form.serving.trim(),
      calories: values.calories,
      protein: values.protein ?? 0,
      carbs: values.carbs,
      fat: values.fat,
      tag: form.tag,
      emoji: form.emoji.trim(),
    }
    if (food) actions.updateFood({ ...food, ...data })
    else actions.addFood(data)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={food ? 'Edit food' : 'New food'}
      footer={
        <div className="flex gap-2">
          {food && (
            <ConfirmButton
              className="flex-1"
              confirmLabel={usedIn.length ? `Delete (and remove from ${usedIn.length} meal${usedIn.length > 1 ? 's' : ''})` : 'Tap again to delete'}
              onConfirm={() => {
                toast(`Deleted ${food.name}`, { label: 'Undo', onClick: actions.deleteFood(food.id) })
                onClose()
              }}
            >
              Delete
            </ConfirmButton>
          )}
          <Button className="flex-[2]" type="submit" form="food-form">
            {food ? 'Save changes' : 'Add food'}
          </Button>
        </div>
      }
    >
      <form id="food-form" onSubmit={submit} noValidate className="space-y-3">
        <div className="grid grid-cols-[4.5rem_1fr] gap-3">
          <Field label="Icon">
            <TextInput value={form.emoji ?? ''} onChange={set('emoji')} placeholder="🍽️" maxLength={4} className="text-center text-xl" aria-label="Emoji" />
          </Field>
          <Field label="Name" error={errors.name}>
            <TextInput value={form.name ?? ''} onChange={set('name')} placeholder="e.g. Greek yogurt" error={errors.name} autoFocus={!food} />
          </Field>
        </div>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {EMOJI_PICKS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setForm((f) => ({ ...f, emoji: f.emoji === em ? '' : em }))}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ${form.emoji === em ? 'bg-ink/10 ring-2 ring-ink' : 'bg-sunken'}`}
              aria-label={`Use ${em}`}
            >
              {em}
            </button>
          ))}
        </div>
        <Field label="Serving" hint='What "1" means, e.g. "1 cup", "2 eggs", "170 g"'>
          <TextInput value={form.serving ?? ''} onChange={set('serving')} placeholder="1 serving" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories" error={errors.calories}>
            <NumberInput value={form.calories ?? ''} onChange={set('calories')} suffix="kcal" error={errors.calories} />
          </Field>
          <Field label="Protein" error={errors.protein}>
            <NumberInput value={form.protein ?? ''} onChange={set('protein')} suffix="g" error={errors.protein} />
          </Field>
          {trackCarbs && (
            <Field label="Carbs (optional)" error={errors.carbs}>
              <NumberInput value={form.carbs ?? ''} onChange={set('carbs')} suffix="g" error={errors.carbs} />
            </Field>
          )}
          {trackFat && (
            <Field label="Fat (optional)" error={errors.fat}>
              <NumberInput value={form.fat ?? ''} onChange={set('fat')} suffix="g" error={errors.fat} />
            </Field>
          )}
        </div>
        <Field label="Category (optional)">
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, tag: f.tag === t ? '' : t }))}
                className={`h-9 rounded-full px-4 text-sm font-semibold capitalize ${form.tag === t ? 'bg-ink text-surface' : 'bg-sunken text-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        {usedIn.length > 0 && (
          <p className="rounded-2xl bg-sunken px-4 py-3 text-sm text-muted">
            Used in {usedIn.map((m) => m.name).join(', ')}. Changes here update those meals too.
          </p>
        )}
      </form>
    </Sheet>
  )
}
