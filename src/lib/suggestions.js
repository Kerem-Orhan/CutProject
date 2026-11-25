// "What can I eat?" — the suggestion engine.
//
// Pure functions only: give it your saved items, what you've eaten and your
// goals, and it returns what fits. No React, no storage, no dates, so it is
// easy to unit test (see suggestions.test.js).
//
// An "item" is anything loggable with per-serving nutrition:
//   { key, kind: 'food' | 'meal', id, name, calories, protein, carbs?, fat? }
// (nutrition.buildLoggables() turns foods + meals into this shape.)

const EPS = 1e-9
const MAX_COMBO_CANDIDATES = 40 // C(40,3) ≈ 9.9k combos: instant on any phone

/** Protein grams per 100 kcal. Zero-calorie items with protein rank first. */
export function proteinDensity(item) {
  if (item.calories <= 0) return item.protein > 0 ? Infinity : 0
  return (item.protein / item.calories) * 100
}

const byDensity = (a, b) =>
  proteinDensity(b) - proteinDensity(a) || b.protein - a.protein || a.name.localeCompare(b.name)

/**
 * @param {object}   args
 * @param {object[]} args.items     loggable items (per serving)
 * @param {object}   args.consumed  { calories, protein } eaten so far today
 * @param {object}   args.goals     { calorieGoal, proteinGoal, goalType: 'under' | 'atLeast' }
 * @param {number}  [args.maxCombos=3]
 * @returns {{
 *   mode: 'under' | 'atLeast',
 *   status: 'empty' | 'ok' | 'over' | 'met',
 *   remaining: { calories: number, protein: number },
 *   proteinShort: boolean,
 *   singles: object[],
 *   combos: { key: string, items: object[], calories: number, protein: number, carbs: number, fat: number }[],
 * }}
 */
export function getSuggestions({ items, consumed, goals, maxCombos = 3 }) {
  const mode = goals.goalType === 'atLeast' ? 'atLeast' : 'under'
  const remaining = {
    calories: (goals.calorieGoal || 0) - (consumed.calories || 0),
    protein: (goals.proteinGoal || 0) - (consumed.protein || 0),
  }
  const proteinShort = remaining.protein > EPS
  const base = { mode, remaining, proteinShort, singles: [], combos: [] }

  if (!items.length) return { ...base, status: 'empty' }

  return mode === 'under'
    ? suggestUnder(items, remaining, proteinShort, maxCombos, base)
    : suggestAtLeast(items, remaining, proteinShort, maxCombos, base)
}

// ---------------------------------------------------------------- cutting --

function suggestUnder(items, remaining, proteinShort, maxCombos, base) {
  // Over the limit: say so calmly and show nothing (handled by the UI).
  if (remaining.calories < -EPS) return { ...base, status: 'over' }

  const fits = items.filter((it) => it.calories <= remaining.calories + EPS)

  const singles = proteinShort
    ? [...fits].sort(byDensity)
    : // Protein done: show the biggest things that still fit first.
      [...fits].sort((a, b) => b.calories - a.calories || a.name.localeCompare(b.name))

  const candidates = singles
    .filter((it) => it.calories > 0 || it.protein > 0)
    .slice(0, MAX_COMBO_CANDIDATES)

  const combos = bestCombos(candidates, maxCombos, {
    accept: (t) => t.calories <= remaining.calories + EPS,
    // Lower is better, compared element by element.
    score: proteinShort
      ? (t) => [shortfall(t.protein, remaining.protein), t.calories]
      : (t) => [remaining.calories - t.calories, -t.protein],
  })

  return { ...base, status: 'ok', singles, combos }
}

// ---------------------------------------------------------------- bulking --

function suggestAtLeast(items, remaining, proteinShort, maxCombos, base) {
  const gap = remaining.calories

  // Calorie target reached. If protein is still short, point at the most
  // protein-dense options; otherwise there is nothing left to do.
  if (gap <= EPS) {
    const singles = proteinShort
      ? items.filter((it) => it.protein > 0).sort(byDensity)
      : []
    return { ...base, status: 'met', singles }
  }

  const closeness = (it) => Math.abs(gap - it.calories) / gap
  const proteinGapScore = (p) => (proteinShort ? shortfall(p, remaining.protein) / remaining.protein : 0)

  const singles = items
    .filter((it) => it.calories > 0)
    .sort(
      (a, b) =>
        closeness(a) + proteinGapScore(a.protein) - (closeness(b) + proteinGapScore(b.protein)) ||
        b.protein - a.protein ||
        a.name.localeCompare(b.name),
    )

  const candidates = singles.slice(0, MAX_COMBO_CANDIDATES)

  const combos = bestCombos(candidates, maxCombos, {
    accept: () => true,
    // Closing the calorie gap matters most; protein shortfall is weighed
    // in on the same 0–1 scale so a combo that also hits protein wins ties.
    score: (t) => [closeness(t) + proteinGapScore(t.protein), -t.protein],
  })

  return { ...base, status: 'ok', singles, combos }
}

// ---------------------------------------------------------------- helpers --

function shortfall(have, need) {
  return Math.max(0, need - have)
}

function totals(list) {
  let calories = 0, protein = 0, carbs = 0, fat = 0
  for (const it of list) {
    calories += it.calories || 0
    protein += it.protein || 0
    carbs += it.carbs || 0
    fat += it.fat || 0
  }
  return { calories, protein, carbs, fat }
}

function compareScores(a, b) {
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    if (Math.abs(d) > EPS) return d
  }
  return 0
}

/**
 * Brute-force every combination of 2 and 3 distinct items and keep the best
 * `limit` by score. Lists are small (a personal food list), so this is fine
 * and much easier to reason about than a knapsack DP.
 */
export function bestCombos(candidates, limit, { accept, score }) {
  if (limit <= 0 || candidates.length < 2) return []
  const results = []
  const n = candidates.length

  const consider = (combo) => {
    const t = totals(combo)
    if (!accept(t)) return
    const s = score(t)
    // Skip padded combos: if dropping any one item scores just as well
    // (e.g. "chicken + black coffee" when chicken alone hits the goal),
    // that item isn't pulling its weight.
    for (let skip = 0; skip < combo.length; skip++) {
      const without = totals(combo.filter((_, i) => i !== skip))
      if (accept(without) && compareScores(score(without), s) <= 0) return
    }
    results.push({ combo, t, s })
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      consider([candidates[i], candidates[j]])
      for (let k = j + 1; k < n; k++) consider([candidates[i], candidates[j], candidates[k]])
    }
  }

  results.sort(
    (a, b) =>
      compareScores(a.s, b.s) ||
      a.combo.length - b.combo.length || // prefer simpler combos on ties
      comboKey(a.combo).localeCompare(comboKey(b.combo)),
  )

  return results.slice(0, limit).map(({ combo, t }) => ({
    key: comboKey(combo),
    items: combo,
    ...t,
  }))
}

function comboKey(combo) {
  return combo.map((c) => c.key).sort().join('+')
}
