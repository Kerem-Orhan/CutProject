// Local persistence. Everything lives under one localStorage key as JSON.
// Small, synchronous and works offline; a personal food list and a few
// years of daily logs are well under the ~5 MB localStorage limit.

export const STORAGE_KEY = 'staples:v1'
export const SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS = Object.freeze({
  calorieGoal: 2200,
  proteinGoal: 150,
  goalType: 'under', // 'under' (cutting) | 'atLeast' (bulking)
  trackCarbs: true,
  trackFat: true,
})

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    foods: [],
    meals: [],
    days: {},
    settings: { ...DEFAULT_SETTINGS },
  }
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x)
const nonNeg = (x, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : fallback)
const optNum = (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null)
const str = (x, fallback = '') => (typeof x === 'string' ? x : fallback)

function normalizeFood(f) {
  if (!isObj(f) || !str(f.name).trim()) return null
  return {
    id: str(f.id) || uid(),
    name: str(f.name).trim(),
    serving: str(f.serving),
    calories: nonNeg(f.calories),
    protein: nonNeg(f.protein),
    carbs: optNum(f.carbs),
    fat: optNum(f.fat),
    tag: str(f.tag),
    emoji: str(f.emoji),
    createdAt: nonNeg(f.createdAt, Date.now()),
  }
}

function normalizeMeal(m) {
  if (!isObj(m) || !str(m.name).trim()) return null
  return {
    id: str(m.id) || uid(),
    name: str(m.name).trim(),
    emoji: str(m.emoji),
    tag: str(m.tag),
    items: (Array.isArray(m.items) ? m.items : [])
      .filter((it) => isObj(it) && str(it.foodId))
      .map((it) => ({ foodId: it.foodId, servings: nonNeg(it.servings, 1) || 1 })),
    createdAt: nonNeg(m.createdAt, Date.now()),
  }
}

function normalizeEntry(e) {
  if (!isObj(e) || !isObj(e.snapshot)) return null
  const s = e.snapshot
  return {
    id: str(e.id) || uid(),
    kind: ['food', 'meal', 'quick'].includes(e.kind) ? e.kind : 'quick',
    refId: str(e.refId) || null,
    servings: nonNeg(e.servings, 1),
    timestamp: nonNeg(e.timestamp, Date.now()),
    snapshot: {
      name: str(s.name, 'Item'),
      emoji: str(s.emoji),
      serving: str(s.serving),
      calories: nonNeg(s.calories),
      protein: nonNeg(s.protein),
      carbs: nonNeg(s.carbs),
      fat: nonNeg(s.fat),
      ...(Array.isArray(s.parts) ? { parts: s.parts.filter((p) => typeof p === 'string') } : {}),
    },
  }
}

/**
 * Coerce anything that looks like saved data into a valid AppState.
 * Bad records are dropped rather than crashing the app.
 */
export function normalizeState(raw) {
  if (!isObj(raw)) throw new Error('Not a valid backup file')
  const base = defaultState()
  const days = {}
  if (isObj(raw.days)) {
    for (const [date, day] of Object.entries(raw.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isObj(day)) continue
      const entries = (Array.isArray(day.entries) ? day.entries : []).map(normalizeEntry).filter(Boolean)
      days[date] = { date, entries }
    }
  }
  const s = isObj(raw.settings) ? raw.settings : {}
  return {
    version: SCHEMA_VERSION,
    foods: (Array.isArray(raw.foods) ? raw.foods : []).map(normalizeFood).filter(Boolean),
    meals: (Array.isArray(raw.meals) ? raw.meals : []).map(normalizeMeal).filter(Boolean),
    days,
    settings: {
      calorieGoal: nonNeg(s.calorieGoal, base.settings.calorieGoal),
      proteinGoal: nonNeg(s.proteinGoal, base.settings.proteinGoal),
      goalType: s.goalType === 'atLeast' ? 'atLeast' : 'under',
      trackCarbs: typeof s.trackCarbs === 'boolean' ? s.trackCarbs : base.settings.trackCarbs,
      trackFat: typeof s.trackFat === 'boolean' ? s.trackFat : base.settings.trackFat,
    },
  }
}

export function loadState() {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return defaultState()
    return normalizeState(JSON.parse(text))
  } catch (err) {
    console.warn('[staples] could not load saved data, starting fresh', err)
    return defaultState()
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (err) {
    console.warn('[staples] could not save', err)
    return false
  }
}

export function exportJSON(state) {
  return JSON.stringify({ app: 'staples', exportedAt: new Date().toISOString(), ...state }, null, 2)
}

export function parseImport(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON")
  }
  if (!isObj(raw) || (!Array.isArray(raw.foods) && !isObj(raw.days))) {
    throw new Error("That doesn't look like a Staples backup")
  }
  return normalizeState(raw)
}

/** A few common foods so a new user can try the app in seconds. */
export function sampleFoods() {
  const now = Date.now()
  return [
    { name: 'Eggs', serving: '2 large', calories: 140, protein: 12, carbs: 1, fat: 10, tag: 'breakfast', emoji: '🥚' },
    { name: 'Greek yogurt', serving: '170 g cup', calories: 100, protein: 17, carbs: 6, fat: 0, tag: 'snack', emoji: '🥛' },
    { name: 'Chicken breast', serving: '100 g cooked', calories: 165, protein: 31, carbs: 0, fat: 4, tag: 'dinner', emoji: '🍗' },
    { name: 'Whole wheat toast', serving: '1 slice', calories: 80, protein: 4, carbs: 14, fat: 1, tag: 'breakfast', emoji: '🍞' },
    { name: 'Banana', serving: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0, tag: 'snack', emoji: '🍌' },
    { name: 'Protein shake', serving: '1 scoop + water', calories: 120, protein: 25, carbs: 3, fat: 1, tag: 'snack', emoji: '🥤' },
    { name: 'White rice', serving: '1 cup cooked', calories: 205, protein: 4, carbs: 45, fat: 0, tag: 'dinner', emoji: '🍚' },
  ].map((f, i) => normalizeFood({ ...f, id: uid(), createdAt: now + i }))
}
