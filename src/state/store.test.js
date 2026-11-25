import { describe, it, expect } from 'vitest'
import { reducer } from './store.jsx'

const base = {
  foods: [{ id: 'egg', name: 'Egg' }, { id: 'toast', name: 'Toast' }],
  meals: [{ id: 'b', name: 'Breakfast', items: [{ foodId: 'egg', servings: 2 }, { foodId: 'toast', servings: 1 }] }],
  days: {},
  settings: {},
}

describe('delete + undo', () => {
  it('deleting a food removes it from meals, and restore puts both back', () => {
    const deleted = reducer(base, { type: 'food/delete', id: 'egg' })
    expect(deleted.foods.map((f) => f.id)).toEqual(['toast'])
    expect(deleted.meals[0].items).toEqual([{ foodId: 'toast', servings: 1 }])

    const restored = reducer(deleted, { type: 'food/restore', food: base.foods[0], meals: [{ id: 'b', items: base.meals[0].items }] })
    expect(restored.foods.map((f) => f.id).sort()).toEqual(['egg', 'toast'])
    expect(restored.meals[0].items).toEqual(base.meals[0].items)
  })

  it('restores a deleted meal', () => {
    const deleted = reducer(base, { type: 'meal/delete', id: 'b' })
    expect(deleted.meals).toEqual([])
    expect(reducer(deleted, { type: 'meal/restore', meal: base.meals[0] }).meals).toEqual(base.meals)
  })

  it('removes and restores a logged entry on any day', () => {
    const entry = { id: 'e1', timestamp: 1, servings: 1, snapshot: { name: 'Egg', calories: 70 } }
    const s = { ...base, days: { '2026-11-20': { date: '2026-11-20', entries: [entry] } } }
    const removed = reducer(s, { type: 'log/remove', date: '2026-11-20', ids: ['e1'] })
    expect(removed.days['2026-11-20'].entries).toEqual([])
    expect(reducer(removed, { type: 'log/restore', date: '2026-11-20', entries: [entry] }).days['2026-11-20'].entries).toEqual([entry])
  })
})
