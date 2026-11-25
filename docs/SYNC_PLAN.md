# Plan: sync code + Save button

**Goal:** use Staples on your phone and laptop with the same foods, meals and history.
You create a **sync code** once, enter it on your other devices, and press **Save** or **Load**
to move your data between them. There are no accounts, emails or passwords; the code is the key.

**Status:** planned, not started.

---

## 1. How it will feel

1. **Settings → Sync → "Turn on sync".** The app uploads your current data and shows a code like
   `K7QM-4XRP-2DWA`, with a **Copy** button.
2. On the other device: **Settings → Sync → "I have a code"**, type the code, then **Load**. That
   device now has the same data.
3. From then on, each device has two buttons:
   - **Save**: uploads this device's data.
   - **Load**: downloads the latest saved data onto this device.

   Under them is a line like *"Last saved from this device 9:14 PM · cloud copy is up to date."*
4. **Safety check:** if you press Save on your laptop after your phone saved something newer, the
   app stops and asks: *"Your other device saved at 8:02 PM. **Load** that first, or **overwrite**
   it?"* That way one device can't silently wipe out the other's food logs.
5. A small cloud icon in the Today header shows when this device has changes that haven't been
   saved yet. Tapping it saves.

The app still works fully offline. Sync only happens when you press a button.

---

## 2. Architecture

```
GitHub Pages (the app, unchanged hosting)
        │  fetch() over HTTPS
        ▼
Cloudflare Worker  ──►  Cloudflare D1 (SQLite) — one row per sync code
  /api/sync …
```

**Why a Cloudflare Worker with D1:**
- Free for this amount of use, there's no server to run, and it deploys with one command (`wrangler deploy`).
- D1 is a real SQL database with strongly consistent writes. That makes the Save safety check
  reliable: `UPDATE … WHERE version = ?` either succeeds or doesn't, with nothing in between.
  Workers KV was the other option, but it's eventually consistent, so two quick saves from two
  devices could both "win".
- Firebase would also work. It would add a Google SDK to the app bundle and need security rules
  written for "anyone with the code". The Worker keeps those rules in about 80 lines of code we control.

**Backend folder:** `sync-worker/` in this repo, as its own small project with its own `package.json`.

---

## 3. Sync code

- 12 characters from the Crockford base32 alphabet (no `I L O U`, so no 0/O or 1/l confusion),
  shown as `XXXX-XXXX-XXXX`. That's about 60 bits of randomness, which is far too many to guess.
- Generated **on the server** with `crypto.getRandomValues`.
- Typing is forgiving: lowercase, missing dashes, `O`→`0` and `I/L`→`1` are all normalised.
- **The code works like a password.** Anyone who has it can read and overwrite that data, so the
  Settings screen will say so. The data is food logs, but the code still shouldn't be posted anywhere.
- Rate-limit by IP (a few code creations per hour, and limited failed loads) so nobody can brute-force codes.

---

## 4. API

Base URL: `https://staples-sync.<your-subdomain>.workers.dev/api/sync`

| Method & path | Body | Returns | Notes |
| --- | --- | --- | --- |
| `POST /api/sync` | `{ data }` | `201 { code, version: 1, updatedAt }` | Creates a new code holding this data |
| `GET /api/sync/:code` | — | `200 { data, version, updatedAt, deviceName }` | `404` if the code doesn't exist |
| `PUT /api/sync/:code` | `{ data, baseVersion, deviceName }` | `200 { version, updatedAt }` | Saves only if `baseVersion` matches the server; otherwise `409 { version, updatedAt, deviceName }` |
| `PUT /api/sync/:code?force=1` | same | `200` | "Overwrite anyway" after a 409 |
| `DELETE /api/sync/:code` | — | `204` | "Turn off sync & delete cloud copy" |

- `data` is exactly what **Export JSON** produces today, so the existing `normalizeState()` in
  `src/lib/storage.js` validates it on load and there's no new format.
- Body size is capped at 1 MB, which is years of logs.
- CORS only allows `https://kerem-orhan.github.io` and `http://localhost:5173` / `4173`.

### Database (D1)

```sql
CREATE TABLE syncs (
  code        TEXT PRIMARY KEY,
  data        TEXT    NOT NULL,      -- JSON
  version     INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,      -- ms since epoch
  device_name TEXT,
  created_at  INTEGER NOT NULL
);
```

Save, with the safety check built into one statement:

```sql
UPDATE syncs SET data = ?, version = version + 1, updated_at = ?, device_name = ?
WHERE code = ? AND version = ?;      -- 0 rows changed → someone else saved first → 409
```

---

## 5. App changes

| File | Change |
| --- | --- |
| `src/lib/sync.js` **(new)** | `createSync`, `loadSync`, `saveSync`, `deleteSync` (fetch wrappers), `normalizeCode()`, `formatCode()`. Pure helpers are unit-tested. |
| `src/lib/sync.test.js` **(new)** | Tests for code normalising and formatting, and for how 404 / 409 / network errors map to messages. |
| `src/lib/storage.js` | Store sync info **outside** the synced data, under a separate key `staples:sync` = `{ code, version, lastSavedAt, lastLoadedAt, dirty, deviceName }`. Loading data onto a device must never overwrite its own sync settings. |
| `src/state/store.jsx` | Set `dirty = true` whenever the data changes after a save or load. |
| `src/components/SyncCard.jsx` **(new)** | The Settings card: Turn on / I have a code / Save / Load / Copy code / Turn off. Includes the "someone else saved first" choice (Load theirs · Overwrite · Cancel). |
| `src/components/SettingsScreen.jsx` | Add `<SyncCard />` above Backup. |
| `src/components/TodayScreen.jsx` | Small cloud icon in the header when `dirty`; tap to save. |
| `.env` / `vite.config.js` | `VITE_SYNC_URL`, so local dev can point at `wrangler dev`. |

**Load always asks first:** *"Replace this device's data with the cloud copy from your phone
(saved 8:02 PM)?"* It's the same confirmation pattern as Import JSON.

---

## 6. Build order (about one evening)

1. **Cloudflare setup (≈15 min):** make a free Cloudflare account, run `npm create cloudflare@latest sync-worker`,
   create the D1 database, add the table.
2. **Worker (≈1 h):** the 5 routes, code generation, version check, CORS and the size cap. Test with `wrangler dev` + curl.
3. **App (≈1.5 h):** `sync.js` + tests, then `SyncCard`, then the dirty flag and cloud icon.
4. **Try it for real (≈30 min):** open the app on phone and laptop, Save on one, Load on the other.
   Then Save on both without loading to make sure the "someone else saved first" prompt appears.
5. **Deploy:** `wrangler deploy` for the Worker. The app redeploys itself on push.
6. **Optional:** a GitHub Action that deploys the Worker on push (needs a Cloudflare API token as a repo secret).

---

## 7. Later (not in v1)

- **Auto-sync:** save a few seconds after each change, and load when the app opens. That needs
  real merging instead of "load or overwrite": entries and foods already have unique ids, so the
  main extra work is an `updatedAt` on every record and keeping deleted items as tombstones so a
  delete on one device sticks.
- **QR code** for the sync code, so the second phone can just scan it.
- **Encrypt the data** with a key derived from the sync code before upload, so the server only ever stores scrambled data.

## Open questions

- Is a device name in "saved from your phone" worth asking for, or should we just use "another device"?
- Should **Save** also happen automatically when the app is closed? It's easy to add, but it brings back some of the conflict cases.
