import { useEffect, useState } from 'react'
import { Sheet, Button, Field, TextInput, NumberInput, Toggle } from './ui.jsx'
import { validateFields } from '../lib/validate.js'
import { useStore } from '../state/store.jsx'
import { useToast } from './Toast.jsx'
import { fmt } from '../lib/nutrition.js'

const EMPTY = { name: '', calories: '', protein: '', carbs: '', fat: '', serving: '', save: false }

/** Log a one-off item by typing numbers, optionally saving it to My Foods. */
export function QuickAdd({ open, onClose }) {
  const { state, actions } = useStore()
  const toast = useToast()
  const { trackCarbs, trackFat } = state.settings
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setErrors({})
    }
  }, [open])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const { values, errors: errs, ok } = validateFields({
      calories: [form.calories, { required: true, label: 'Calories' }],
      protein: [form.protein, { label: 'Protein', max: 1000 }],
      carbs: [form.carbs, { label: 'Carbs', max: 1000 }],
      fat: [form.fat, { label: 'Fat', max: 1000 }],
    })
    if (form.save && !form.name.trim()) {
      errs.name = 'Give it a name to save it'
    }
    if (!ok || errs.name) {
      setErrors(errs)
      return
    }
    const name = form.name.trim()
    const nutrition = { calories: values.calories, protein: values.protein ?? 0, carbs: values.carbs, fat: values.fat }

    if (form.save) {
      const food = actions.addFood({ name, serving: form.serving.trim(), ...nutrition, tag: '', emoji: '' })
      const result = actions.log([{ kind: 'food', id: food.id, servings: 1 }])
      toast(`Saved & logged ${name} · ${fmt(values.calories)} kcal`, {
        label: 'Undo',
        onClick: () => actions.removeEntries(result.date, result.ids),
      })
    } else {
      const result = actions.logQuick({ name: name || 'Quick add', ...nutrition })
      toast(`Logged ${name || 'quick add'} · ${fmt(values.calories)} kcal`, {
        label: 'Undo',
        onClick: () => actions.removeEntries(result.date, result.ids),
      })
    }
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Quick add"
      footer={
        <Button className="w-full" type="submit" form="quick-add">
          {form.save ? 'Save & log' : 'Log it'}
        </Button>
      }
    >
      <form id="quick-add" onSubmit={submit} noValidate className="space-y-3">
        <Field label="What was it? (optional)" error={errors.name}>
          <TextInput value={form.name} onChange={set('name')} placeholder="e.g. Office birthday cake" error={errors.name} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories" error={errors.calories}>
            <NumberInput value={form.calories} onChange={set('calories')} suffix="kcal" error={errors.calories} autoFocus />
          </Field>
          <Field label="Protein" error={errors.protein}>
            <NumberInput value={form.protein} onChange={set('protein')} suffix="g" error={errors.protein} />
          </Field>
          {trackCarbs && (
            <Field label="Carbs" error={errors.carbs}>
              <NumberInput value={form.carbs} onChange={set('carbs')} suffix="g" error={errors.carbs} />
            </Field>
          )}
          {trackFat && (
            <Field label="Fat" error={errors.fat}>
              <NumberInput value={form.fat} onChange={set('fat')} suffix="g" error={errors.fat} />
            </Field>
          )}
        </div>
        <div className="rounded-2xl bg-sunken px-4">
          <Toggle
            checked={form.save}
            onChange={(v) => setForm((f) => ({ ...f, save: v }))}
            label="Save to My Foods"
            hint="So next time it's one tap"
          />
          {form.save && (
            <div className="pb-4">
              <Field label="Serving (optional)">
                <TextInput value={form.serving} onChange={set('serving')} placeholder="e.g. 1 slice" />
              </Field>
            </div>
          )}
        </div>
      </form>
    </Sheet>
  )
}
