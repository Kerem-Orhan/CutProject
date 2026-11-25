import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { useToast } from './Toast.jsx'
import { Button, ConfirmButton, Field, NumberInput, Segmented, Toggle } from './ui.jsx'
import { validateFields } from '../lib/validate.js'
import { exportJSON, parseImport } from '../lib/storage.js'
import { dateKey } from '../lib/dates.js'

export function SettingsScreen() {
  const { state, actions } = useStore()
  const toast = useToast()
  const s = state.settings
  const [goals, setGoals] = useState({ calorieGoal: String(s.calorieGoal), proteinGoal: String(s.proteinGoal) })
  const [errors, setErrors] = useState({})
  const [pendingImport, setPendingImport] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    setGoals({ calorieGoal: String(s.calorieGoal), proteinGoal: String(s.proteinGoal) })
  }, [s.calorieGoal, s.proteinGoal])

  const dirty = goals.calorieGoal !== String(s.calorieGoal) || goals.proteinGoal !== String(s.proteinGoal)

  const saveGoals = (e) => {
    e.preventDefault()
    const { values, errors: errs, ok } = validateFields({
      calorieGoal: [goals.calorieGoal, { required: true, label: 'Calorie goal', max: 20000 }],
      proteinGoal: [goals.proteinGoal, { required: true, label: 'Protein goal', max: 1000 }],
    })
    if (ok && values.calorieGoal === 0) errs.calorieGoal = 'Calorie goal must be more than 0'
    setErrors(errs)
    if (Object.keys(errs).length) return
    actions.updateSettings({ calorieGoal: values.calorieGoal, proteinGoal: values.proteinGoal })
    toast('Goals saved')
  }

  const doExport = () => {
    const blob = new Blob([exportJSON(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `staples-backup-${dateKey()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const next = parseImport(await file.text())
      setPendingImport({ name: file.name, state: next })
    } catch (err) {
      toast(err.message || 'Could not read that file')
    }
  }

  const foodCount = state.foods.length
  const dayCount = Object.values(state.days).filter((d) => d.entries.length).length

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card title="Goal type">
        <Segmented
          value={s.goalType}
          onChange={(v) => actions.updateSettings({ goalType: v })}
          options={[
            { value: 'under', label: 'Stay under' },
            { value: 'atLeast', label: 'Reach at least' },
          ]}
        />
        <p className="mt-2 text-sm text-muted">
          {s.goalType === 'under'
            ? 'Cutting: calories are a ceiling. Suggestions only show what fits.'
            : 'Bulking: calories are a target to reach. Suggestions help close the gap.'}{' '}
          Protein is always a “reach at least” goal.
        </p>
      </Card>

      <Card title="Daily goals">
        <form onSubmit={saveGoals} noValidate className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calories" error={errors.calorieGoal}>
              <NumberInput value={goals.calorieGoal} onChange={(e) => setGoals((g) => ({ ...g, calorieGoal: e.target.value }))} suffix="kcal" error={errors.calorieGoal} />
            </Field>
            <Field label="Protein" error={errors.proteinGoal}>
              <NumberInput value={goals.proteinGoal} onChange={(e) => setGoals((g) => ({ ...g, proteinGoal: e.target.value }))} suffix="g" error={errors.proteinGoal} />
            </Field>
          </div>
          <Button className="w-full" type="submit" disabled={!dirty}>
            Save goals
          </Button>
        </form>
      </Card>

      <Card title="Macros to track">
        <p className="mb-1 text-sm text-muted">Calories and protein are always on.</p>
        <Toggle checked={s.trackCarbs} onChange={(v) => actions.updateSettings({ trackCarbs: v })} label="Carbs" />
        <Toggle checked={s.trackFat} onChange={(v) => actions.updateSettings({ trackFat: v })} label="Fat" />
      </Card>

      <Card title="Backup">
        <p className="mb-3 text-sm text-muted">
          Everything is stored only on this device ({foodCount} food{foodCount === 1 ? '' : 's'}, {dayCount} logged day{dayCount === 1 ? '' : 's'}). Export a backup now and then, or to move to another phone.
        </p>
        <div className="flex gap-2">
          <Button variant="soft" className="flex-1" onClick={doExport}>
            Export JSON
          </Button>
          <Button variant="soft" className="flex-1" onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>
        {pendingImport && (
          <div className="mt-3 rounded-2xl bg-sunken p-4">
            <p className="text-sm">
              <b>{pendingImport.name}</b> has {pendingImport.state.foods.length} foods, {pendingImport.state.meals.length} meals and{' '}
              {Object.keys(pendingImport.state.days).length} days. Importing replaces everything currently on this device.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setPendingImport(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  actions.replaceAll(pendingImport.state)
                  setPendingImport(null)
                  toast('Backup imported')
                }}
              >
                Replace my data
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Start over">
        <p className="mb-3 text-sm text-muted">Deletes all foods, meals, history and settings on this device.</p>
        <ConfirmButton className="w-full" confirmLabel="Tap again to erase everything" onConfirm={() => (actions.resetAll(), toast('All data cleared'))}>
          Erase all data
        </ConfirmButton>
      </Card>

      <p className="pb-2 text-center text-xs text-faint">Staples · works offline · no account, no tracking</p>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}
