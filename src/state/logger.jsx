import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useStore } from './store.jsx'
import { useToast } from '../components/Toast.jsx'
import { ServingSheet } from '../components/ServingSheet.jsx'
import { fmt, formatServings } from '../lib/nutrition.js'

const LoggerContext = createContext(null)

/**
 * One place that knows how to log things: tap-to-log, the servings stepper
 * and the "Undo" toast. Screens just call log(item) / chooseServings(item).
 */
export function LoggerProvider({ children }) {
  const { actions } = useStore()
  const toast = useToast()
  const [picking, setPicking] = useState(null)

  const undoable = useCallback(
    (result, message) => {
      toast(message, { label: 'Undo', onClick: () => actions.removeEntries(result.date, result.ids) })
    },
    [actions, toast],
  )

  const log = useCallback(
    (item, servings = 1) => {
      const result = actions.log([{ kind: item.kind, id: item.id, servings }])
      const qty = servings === 1 ? '' : `${formatServings(servings)}× `
      undoable(result, `Logged ${qty}${item.name} · ${fmt(item.calories * servings)} kcal`)
    },
    [actions, undoable],
  )

  const logMany = useCallback(
    (items) => {
      const result = actions.log(items.map((it) => ({ kind: it.kind, id: it.id, servings: 1 })))
      const kcal = items.reduce((s, it) => s + it.calories, 0)
      undoable(result, `Logged ${items.length} items · ${fmt(kcal)} kcal`)
    },
    [actions, undoable],
  )

  const value = useMemo(() => ({ log, logMany, chooseServings: setPicking, undoable }), [log, logMany, undoable])

  return (
    <LoggerContext.Provider value={value}>
      {children}
      <ServingSheet
        item={picking}
        open={!!picking}
        onClose={() => setPicking(null)}
        onConfirm={(servings) => {
          log(picking, servings)
          setPicking(null)
        }}
      />
    </LoggerContext.Provider>
  )
}

export const useLogger = () => useContext(LoggerContext)
