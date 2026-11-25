import { describe, it, expect } from 'vitest'
import { mealNutrition, indexById, sumEntries, buildLoggables, formatServings } from './nutrition.js'

const foods = [
  { id: 'egg', name: 'Egg', serving: '1 large', calories: 70, protein: 6, carbs: 0.5, fat: 5 },
  { id: 'toast', name: 'Toast', serving: '1 slice', calories: 80, protein: 3, carbs: 15, fat: 1 },
  { id: 'coffee', name: 'Coffee', serving: '1 cup', calories: 5, protein: 0 }, // no carbs/fat
]
const breakfast = { id: 'b', name: 'Usual breakfast', items: [{ foodId: 'egg', servings: 2 }, { foodId: 'toast', servings: 1 }, { foodId: 'coffee', servings: 1 }] }

describe('mealNutrition', () => {
  it('sums foods × servings, treating missing macros as 0', () => {
    const n = mealNutrition(breakfast, indexById(foods))
    expect(n).toEqual({ calories: 225, protein: 15, carbs: 16, fat: 11, missing: 0 })
  })

  it('reflects edits to a food immediately', () => {
    const edited = foods.map((f) => (f.id === 'egg' ? { ...f, calories: 80 } : f))
    expect(mealNutrition(breakfast, indexById(edited)).calories).toBe(245)
  })

  it('skips deleted foods and counts them', () => {
    const n = mealNutrition(breakfast, indexById(foods.filter((f) => f.id !== 'toast')))
    expect(n.calories).toBe(145)
    expect(n.missing).toBe(1)
  })
})

describe('sumEntries', () => {
  it('multiplies each snapshot by its servings', () => {
    const entries = [
      { servings: 1.5, snapshot: { calories: 100, protein: 10, carbs: 0, fat: 0 } },
      { servings: 0.5, snapshot: { calories: 200, protein: 20 } },
    ]
    expect(sumEntries(entries)).toEqual({ calories: 250, protein: 25, carbs: 0, fat: 0 })
  })
})

describe('buildLoggables', () => {
  it('includes foods and non-empty meals', () => {
    const items = buildLoggables(foods, [breakfast, { id: 'e', name: 'Empty', items: [] }])
    expect(items.map((i) => i.key)).toEqual(['food:egg', 'food:toast', 'food:coffee', 'meal:b'])
    expect(items[3].calories).toBe(225)
  })
})

describe('formatServings', () => {
  it('uses friendly fractions', () => {
    expect(formatServings(0.5)).toBe('½')
    expect(formatServings(1.5)).toBe('1½')
    expect(formatServings(2)).toBe('2')
  })
})
