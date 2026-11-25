import { describe, it, expect } from 'vitest'
import { getSuggestions, proteinDensity, bestCombos } from './suggestions.js'

const item = (name, calories, protein) => ({ key: `food:${name}`, kind: 'food', id: name, name, calories, protein })

const FOODS = [
  item('Eggs', 140, 12),          // 8.6 g / 100 kcal
  item('Greek yogurt', 100, 17),  // 17
  item('Chicken breast', 165, 31),// 18.8
  item('Toast', 80, 3),           // 3.75
  item('Banana', 105, 1),         // ~1
  item('Protein shake', 120, 25), // 20.8
  item('Pizza slice', 285, 12),   // 4.2
  item('Black coffee', 2, 0),
]

const cut = (calorieGoal, proteinGoal) => ({ calorieGoal, proteinGoal, goalType: 'under' })
const bulk = (calorieGoal, proteinGoal) => ({ calorieGoal, proteinGoal, goalType: 'atLeast' })

describe('proteinDensity', () => {
  it('is protein per 100 kcal', () => {
    expect(proteinDensity(item('x', 200, 20))).toBe(10)
  })
  it('ranks zero-calorie protein first and zero/zero last', () => {
    expect(proteinDensity(item('x', 0, 5))).toBe(Infinity)
    expect(proteinDensity(item('x', 0, 0))).toBe(0)
  })
})

describe('getSuggestions — stay under (cutting)', () => {
  it('computes remaining as goal − consumed', () => {
    const r = getSuggestions({ items: FOODS, consumed: { calories: 1500, protein: 90 }, goals: cut(2000, 150) })
    expect(r.remaining).toEqual({ calories: 500, protein: 60 })
    expect(r.status).toBe('ok')
  })

  it('only lists items that fit, best protein value first', () => {
    const r = getSuggestions({ items: FOODS, consumed: { calories: 1850, protein: 100 }, goals: cut(2000, 150) })
    // 150 kcal left: pizza (285) and chicken (165) don't fit.
    const names = r.singles.map((s) => s.name)
    expect(names).not.toContain('Pizza slice')
    expect(names).not.toContain('Chicken breast')
    expect(names.slice(0, 3)).toEqual(['Protein shake', 'Greek yogurt', 'Eggs'])
    expect(r.singles.every((s) => s.calories <= 150)).toBe(true)
  })

  it('suggests up to 3 combos that fit and get closest to the protein goal', () => {
    const r = getSuggestions({ items: FOODS, consumed: { calories: 1600, protein: 90 }, goals: cut(2000, 150) })
    expect(r.combos.length).toBeLessThanOrEqual(3)
    expect(r.combos.length).toBeGreaterThan(0)
    for (const c of r.combos) {
      expect(c.items.length).toBeGreaterThanOrEqual(2)
      expect(c.items.length).toBeLessThanOrEqual(3)
      expect(c.calories).toBeLessThanOrEqual(400)
    }
    // Best possible under 400 kcal: shake + chicken + yogurt = 385 kcal, 73 g.
    expect(r.combos[0].items.map((i) => i.name).sort()).toEqual(['Chicken breast', 'Greek yogurt', 'Protein shake'])
    expect(r.combos[0].protein).toBe(73)
  })

  it('prefers the cheaper combo when several reach the protein goal', () => {
    const r = getSuggestions({ items: FOODS, consumed: { calories: 1000, protein: 120 }, goals: cut(2000, 150) })
    // Need 30 g. Shake + yogurt = 220 kcal / 42 g beats e.g. chicken + shake (285 kcal).
    expect(r.combos[0].protein).toBeGreaterThanOrEqual(30)
    expect(r.combos[0].calories).toBe(220)
  })

  it('does not pad combos with items that add nothing', () => {
    const r = getSuggestions({ items: FOODS, consumed: { calories: 1000, protein: 120 }, goals: cut(2000, 150) })
    // Chicken alone covers the 30 g gap, so "chicken + coffee" is not a combo.
    for (const c of r.combos) expect(c.items.map((i) => i.name)).not.toContain('Black coffee')
  })

  it('hides suggestions calmly when over the limit', () => {
    const r = getSuggestions({ items: FOODS, consumed: { calories: 2100, protein: 80 }, goals: cut(2000, 150) })
    expect(r.status).toBe('over')
    expect(r.singles).toEqual([])
    expect(r.combos).toEqual([])
    expect(r.remaining.calories).toBe(-100)
  })

  it('once protein is met, sorts by what uses the budget best', () => {
    const r = getSuggestions({ items: FOODS, consumed: { calories: 1700, protein: 160 }, goals: cut(2000, 150) })
    expect(r.proteinShort).toBe(false)
    expect(r.singles[0].name).toBe('Pizza slice') // 285 kcal, largest that fits in 300
    expect(r.combos[0].calories).toBeLessThanOrEqual(300)
  })

  it('reports an empty list when there are no saved items', () => {
    const r = getSuggestions({ items: [], consumed: { calories: 0, protein: 0 }, goals: cut(2000, 150) })
    expect(r.status).toBe('empty')
  })
})

describe('getSuggestions — reach at least (bulking)', () => {
  it('suggests combos that close the calorie gap', () => {
    const r = getSuggestions({ items: FOODS, consumed: { calories: 2500, protein: 140 }, goals: bulk(3000, 150) })
    expect(r.mode).toBe('atLeast')
    expect(r.status).toBe('ok')
    expect(r.remaining.calories).toBe(500)
    // Every top combo should land near 500 kcal, not far under it.
    for (const c of r.combos) expect(Math.abs(500 - c.calories)).toBeLessThan(100)
    expect(r.combos[0].protein).toBeGreaterThanOrEqual(10)
  })

  it('ranks singles by how well they close the gap', () => {
    const r = getSuggestions({ items: FOODS, consumed: { calories: 2700, protein: 200 }, goals: bulk(3000, 150) })
    expect(r.singles[0].name).toBe('Pizza slice') // 285 kcal vs 300 gap
  })

  it('marks the goal met, and points at protein if still short', () => {
    const met = getSuggestions({ items: FOODS, consumed: { calories: 3100, protein: 200 }, goals: bulk(3000, 150) })
    expect(met.status).toBe('met')
    expect(met.singles).toEqual([])

    const short = getSuggestions({ items: FOODS, consumed: { calories: 3100, protein: 100 }, goals: bulk(3000, 150) })
    expect(short.status).toBe('met')
    expect(short.singles[0].name).toBe('Protein shake')
  })
})

describe('bestCombos', () => {
  it('needs at least two candidates', () => {
    expect(bestCombos([item('a', 1, 1)], 3, { accept: () => true, score: () => [0] })).toEqual([])
  })
  it('never repeats the same item within a combo', () => {
    const combos = bestCombos(FOODS.slice(0, 4), 50, { accept: () => true, score: (t) => [-t.protein] })
    for (const c of combos) expect(new Set(c.items.map((i) => i.key)).size).toBe(c.items.length)
  })
})
