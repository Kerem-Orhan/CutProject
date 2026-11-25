import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { defaultState, loadState, saveState, uid, STORAGE_KEY, normalizeState } from '../lib/storage.js'
import { dateKey, msUntilMidnight } from '../lib/dates.js'
import { foodNutrition, indexById, mealNutrition, describeMeal } from '../lib/nutrition.js'

// ------------------------------------------------------------------ reducer

function snapshotFor(state, kind, id) {
  if (kind === 'food') {
    const f = state.foods.find((x) => x.id === id)
    if (!f) return null
    return { name: f.name, emoji: f.emoji, serving: f.serving, ...foodNutrition(f) }
  }
  if (kind === 'meal') {
    const m = state.meals.find((x) => x.id === id)
    if (!m) return null
    const byId = indexById(state.foods)
    const { missing: _missing, ...n } = mealNutrition(m, byId)
    const parts = describeMeal(m, byId).split(' + ').filter(Boolean)
    return { name: m.name, emoji: m.emoji, serving: 'meal', ...n, parts }
  }
  return null
}

function withDay(state, date, update) {
  const day = state.days[date] ?? { date, entries: [] }
  return { ...state, days: { ...state.days, [date]: { ...day, entries: update(day.entries) } } }
}

function reducer(state, action) {
  switch (action.type) {
    case 'food/add':
      return { ...state, foods: [...state.foods, action.food] }
    case 'food/addMany':
      return { ...state, foods: [...state.foods, ...action.foods] }
    case 'food/update':
      return { ...state, foods: state.foods.map((f) => (f.id === action.food.id ? action.food : f)) }
    case 'food/delete':
      return {
        ...state,
        foods: state.foods.filter((f) => f.id !== action.id),
        // Keep meals consistent: drop the deleted food from any meal using it.
        meals: state.meals.map((m) =>
          m.items.some((it) => it.foodId === action.id)
            ? { ...m, items: m.items.filter((it) => it.foodId !== action.id) }
            : m,
        ),
      }

    case 'meal/add':
      return { ...state, meals: [...state.meals, action.meal] }
    case 'meal/update':
      return { ...state, meals: state.meals.map((m) => (m.id === action.meal.id ? action.meal : m)) }
    case 'meal/delete':
      return { ...state, meals: state.meals.filter((m) => m.id !== action.id) }

    case 'log/items': {
      // action.items: [{ entryId, kind, id, servings }]; snapshots taken now,
      // so history stays correct even if the food is edited later.
      const entries = action.items
        .map((it) => {
          const snapshot = snapshotFor(state, it.kind, it.id)
          if (!snapshot) return null
          return { id: it.entryId, kind: it.kind, refId: it.id, servings: it.servings, timestamp: action.timestamp, snapshot }
        })
        .filter(Boolean)
      if (!entries.length) return state
      return withDay(state, action.date, (list) => [...list, ...entries])
    }
    case 'log/quick':
      return withDay(state, action.date, (list) => [...list, action.entry])
    case 'log/remove':
      return withDay(state, action.date, (list) => list.filter((e) => !action.ids.includes(e.id)))
    case 'log/restore':
      return withDay(state, action.date, (list) =>
        [...list, ...action.entries].sort((a, b) => a.timestamp - b.timestamp),
      )
    case 'log/servings':
      return withDay(state, action.date, (list) =>
        list.map((e) => (e.id === action.id ? { ...e, servings: action.servings } : e)),
      )

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'replace':
      return action.state
    default:
      return state
  }
}

// ------------------------------------------------------------------ context

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const skipNextSave = useRef(false)

  // Persist on every change.
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    saveState(state)
  }, [state])

  // Keep two open tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        skipNextSave.current = true
        dispatch({ type: 'replace', state: normalizeState(JSON.parse(e.newValue)) })
      } catch {
        skipNextSave.current = false
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const actions = useMemo(
    () => ({
      addFood: (food) => {
        const f = { ...food, id: uid(), createdAt: Date.now() }
        dispatch({ type: 'food/add', food: f })
        return f
      },
      addFoods: (foods) => dispatch({ type: 'food/addMany', foods }),
      updateFood: (food) => dispatch({ type: 'food/update', food }),
      deleteFood: (id) => dispatch({ type: 'food/delete', id }),

      addMeal: (meal) => dispatch({ type: 'meal/add', meal: { ...meal, id: uid(), createdAt: Date.now() } }),
      updateMeal: (meal) => dispatch({ type: 'meal/update', meal }),
      deleteMeal: (id) => dispatch({ type: 'meal/delete', id }),

      /** Log one or more saved items. Returns the new entry ids (for undo). */
      log: (items) => {
        const withIds = items.map((it) => ({ servings: 1, ...it, entryId: uid() }))
        dispatch({ type: 'log/items', items: withIds, date: dateKey(), timestamp: Date.now() })
        return { date: dateKey(), ids: withIds.map((x) => x.entryId) }
      },
      logQuick: ({ name, calories, protein, carbs, fat }) => {
        const entry = {
          id: uid(),
          kind: 'quick',
          refId: null,
          servings: 1,
          timestamp: Date.now(),
          snapshot: { name: name || 'Quick add', emoji: '', serving: '', calories, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 },
        }
        dispatch({ type: 'log/quick', date: dateKey(), entry })
        return { date: dateKey(), ids: [entry.id] }
      },
      removeEntries: (date, ids) => dispatch({ type: 'log/remove', date, ids }),
      restoreEntries: (date, entries) => dispatch({ type: 'log/restore', date, entries }),
      setServings: (date, id, servings) => dispatch({ type: 'log/servings', date, id, servings }),

      updateSettings: (patch) => dispatch({ type: 'settings/update', patch }),
      replaceAll: (next) => dispatch({ type: 'replace', state: next }),
      resetAll: () => dispatch({ type: 'replace', state: defaultState() }),
    }),
    [],
  )

  const value = useMemo(() => ({ state, actions }), [state, actions])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

// Re-exported for tests / tools that want the raw reducer.
export { reducer }

/** Current local date key; flips automatically at midnight. */
export function useTodayKey() {
  const [, force] = useReducer((x) => x + 1, 0)
  const keyRef = useRef(dateKey())
  const check = useCallback(() => {
    const k = dateKey()
    if (k !== keyRef.current) {
      keyRef.current = k
      force()
    }
  }, [])

  useEffect(() => {
    let timer
    const schedule = () => {
      timer = setTimeout(() => {
        check()
        schedule()
      }, msUntilMidnight() + 1000)
    }
    schedule()
    // Phones suspend timers in the background; re-check when we come back.
    const onVis = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', check)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', check)
    }
  }, [check])

  return keyRef.current
}
