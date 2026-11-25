// Staples service worker: makes the app work fully offline.
//
// - On install it caches the app shell: index.html plus every JS/CSS asset
//   index.html references (Vite gives them hashed names, so we read them
//   out of the HTML instead of hard-coding them).
// - Page loads are network-first, falling back to the cached shell offline,
//   so a new deploy is picked up as soon as you're online.
// - Other same-origin files are cache-first (hashed names never change).

const CACHE = 'staples-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png']

async function precache() {
  const cache = await caches.open(CACHE)
  await cache.addAll(SHELL)
  try {
    const html = await (await fetch('./index.html', { cache: 'no-store' })).text()
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1])
    await cache.addAll(assets)
  } catch {
    // Assets will be cached on first use instead.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(async () => (await caches.match('./index.html')) || (await caches.match('./'))),
    )
    return
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
