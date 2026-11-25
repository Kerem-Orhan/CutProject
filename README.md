# Staples: calories & protein from the foods you already eat

A mobile-first calorie and macro tracker that **skips the giant food database**.
You save the foods you actually eat (with calories and macros you already
know), then log them with one tap. The **What fits** tab tells you which of your
saved foods and meals still fit in today's remaining calories and protein.

- React 19 + Vite 8 + Tailwind CSS 4
- Installable PWA, works fully offline
- All data stays on your device (localStorage). No account, no backend.

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173 (add --host to open it on your phone over Wi-Fi)
npm test           # unit tests (Vitest)
npm run build      # production build → dist/
npm run preview    # serve the production build (service worker active) at http://localhost:4173
```

### Install on your phone

The app must be served over **HTTPS** (or `localhost`) for install and offline mode to work.
The easiest way is to deploy `dist/` to any static host (GitHub Pages, Netlify, Vercel,
Cloudflare Pages). The build uses relative paths, so it works from a sub-folder
like `username.github.io/repo/`. Then:

- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** ⋮ menu → *Install app*

## How it works

| Tab | What it does |
| --- | --- |
| **Today** | Calorie and protein rings, carbs and fat totals, a grid of your foods and meals. **Tap = log 1 serving**; long-press (or the small **±**) to choose ½, 1½, 2…. Includes **Quick add** for one-off items, with an option to save them. Tap a logged entry to change its servings, or **×** to remove it (with Undo). |
| **What fits** | Remaining calories and protein, the **top 3 combos** of 2–3 items, and every single item that fits, each with a one-tap *Log it*. |
| **My Foods** | Add and edit foods and meals. Tap the trash icon to delete one (with Undo). Meals are bundles of foods with quantities, and their totals always come from the current foods. |
| **History** | Past days with totals, plus a 7-day average. Tap a day to see its entries, where you can fix servings or remove an entry. |
| **Settings** | Goals, goal type (*Stay under* for cutting, *Reach at least* for bulking), which macros to track, JSON export/import, and erase all data. |

A new day starts automatically at local midnight. Past days are kept.

## Project structure

```
src/
├── main.jsx                 entry + service-worker registration
├── App.jsx                  providers + tab shell
├── index.css                Tailwind + design tokens (light/dark)
├── lib/                     pure logic: no React, all unit-tested
│   ├── suggestions.js       ★ "What can I eat?" engine
│   ├── nutrition.js         totals for foods, meals, entries
│   ├── history.js           7-day average
│   ├── storage.js           localStorage, schema normalisation, import/export, sample foods
│   ├── validate.js          number-input validation
│   ├── dates.js             local-date keys, midnight helpers
│   └── *.test.js
├── state/
│   ├── store.jsx            reducer + context + persistence + midnight rollover hook
│   ├── logger.jsx           tap-to-log, servings sheet, Undo toast
│   └── selectors.js         derived "today" data
└── components/              screens + UI pieces
public/
├── manifest.webmanifest, icons
└── sw.js                    offline service worker
```

## Data model

```js
Food   { id, name, serving, calories, protein, carbs|null, fat|null, tag, emoji, createdAt }
Meal   { id, name, emoji, tag, items: [{ foodId, servings }], createdAt }   // totals computed live
Entry  { id, kind: 'food'|'meal'|'quick', refId, servings, timestamp,
         snapshot: { name, emoji, serving, calories, protein, carbs, fat, parts? } } // per serving, frozen at log time
DayLog { date: 'YYYY-MM-DD' (local), entries: Entry[] }
Settings { calorieGoal, proteinGoal, goalType: 'under'|'atLeast', trackCarbs, trackFat }

AppState { version: 1, foods, meals, days: { [date]: DayLog }, settings }  // localStorage key "staples:v1"
```

Each entry stores a **snapshot** of the food's numbers at the moment you logged it.
Editing a food later updates every meal that uses it, but it does not rewrite your past days.
Deleting a food also removes it from any meal that contains it.

## The suggestion logic (`src/lib/suggestions.js`)

`getSuggestions({ items, consumed, goals })` is a pure function. It returns
`{ mode, status, remaining, proteinShort, singles, combos }`.

**Stay under (cutting)**
- `remaining = goal − consumed`. If calories are over the goal, `status = 'over'` and no suggestions are shown. The UI says so in neutral grey, with no red and no warnings.
- **Singles:** every food and meal that fits the remaining calories. While protein is below goal they are sorted by **protein per calorie**. Once protein is met, the largest items that still fit come first.
- **Combos:** a brute-force search over every set of 2–3 distinct items (capped at 40 candidates, about 10k sets, which is instant). The best 3 that fit are kept, ranked by the smallest protein shortfall and then by the fewest calories. Padded combos are dropped: if removing one item scores just as well, the set is skipped. That means you won't see "chicken + black coffee".

**Reach at least (bulking)**
- Items and combos are ranked by how close they land to the remaining calorie gap, with any protein shortfall weighed in on the same scale.
- When the calorie target is reached, `status = 'met'`. If protein is still short, the most protein-dense items are listed.

## Planned: sync between devices

A sync code with Save/Load buttons is planned. See [docs/SYNC_PLAN.md](docs/SYNC_PLAN.md).

## Backups

Settings → **Export JSON** downloads everything. **Import JSON** shows what the file contains and asks
for confirmation before replacing your data. Imported data is validated, and bad records are dropped
instead of crashing the app.
