// Pure nutrition math. Nothing here touches React or storage.

export const MACROS = ['calories', 'protein', 'carbs', 'fat']

export const ZERO = Object.freeze({ calories: 0, protein: 0, carbs: 0, fat: 0 })

/** Treat null / undefined / NaN as 0 so optional macros sum cleanly. */
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function round1(n) {
  return Math.round(n * 10) / 10
}

export function add(a, b) {
  return {
    calories: num(a.calories) + num(b.calories),
    protein: num(a.protein) + num(b.protein),
    carbs: num(a.carbs) + num(b.carbs),
    fat: num(a.fat) + num(b.fat),
  }
}

export function scale(n, factor) {
  return {
    calories: num(n.calories) * factor,
    protein: num(n.protein) * factor,
    carbs: num(n.carbs) * factor,
    fat: num(n.fat) * factor,
  }
}

/** Per-serving nutrition of a single food. */
export function foodNutrition(food) {
  return {
    calories: num(food.calories),
    protein: num(food.protein),
    carbs: num(food.carbs),
    fat: num(food.fat),
  }
}

/**
 * Totals for one meal, always computed from the *current* foods so that
 * editing a food updates every meal that uses it. Items whose food has been
 * deleted are skipped and counted in `missing`.
 */
export function mealNutrition(meal, foodsById) {
  let total = { ...ZERO }
  let missing = 0
  for (const item of meal.items ?? []) {
    const food = foodsById.get(item.foodId)
    if (!food) {
      missing++
      continue
    }
    total = add(total, scale(foodNutrition(food), num(item.servings)))
  }
  return { ...total, missing }
}

export function indexById(list) {
  return new Map(list.map((x) => [x.id, x]))
}

/** Nutrition actually logged by one entry (snapshot × servings). */
export function entryNutrition(entry) {
  return scale(entry.snapshot ?? ZERO, num(entry.servings))
}

export function sumEntries(entries = []) {
  return entries.reduce((acc, e) => add(acc, entryNutrition(e)), { ...ZERO })
}

/**
 * Turns foods and meals into one flat list of loggable "items" with
 * per-serving nutrition — the shape the suggestion engine works on.
 */
export function buildLoggables(foods, meals) {
  const foodsById = indexById(foods)
  const items = foods.map((f) => ({
    key: `food:${f.id}`,
    kind: 'food',
    id: f.id,
    name: f.name,
    emoji: f.emoji || '',
    tag: f.tag || '',
    serving: f.serving || '',
    ...foodNutrition(f),
  }))
  for (const m of meals) {
    const n = mealNutrition(m, foodsById)
    if ((m.items ?? []).length - n.missing === 0) continue // empty meal: nothing to log
    items.push({
      key: `meal:${m.id}`,
      kind: 'meal',
      id: m.id,
      name: m.name,
      emoji: m.emoji || '',
      tag: m.tag || '',
      serving: describeMeal(m, foodsById),
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
    })
  }
  return items
}

export function describeMeal(meal, foodsById) {
  return (meal.items ?? [])
    .map((it) => {
      const f = foodsById.get(it.foodId)
      if (!f) return null
      return it.servings === 1 ? f.name : `${formatServings(it.servings)}× ${f.name}`
    })
    .filter(Boolean)
    .join(' + ')
}

export function formatServings(s) {
  if (s === 0.5) return '½'
  if (s === 0.25) return '¼'
  if (s === 0.75) return '¾'
  if (Number.isInteger(s)) return String(s)
  const whole = Math.floor(s)
  const frac = s - whole
  if (Math.abs(frac - 0.5) < 1e-9) return `${whole}½`
  return String(round1(s))
}

export function fmt(n) {
  return Math.round(num(n)).toLocaleString()
}
