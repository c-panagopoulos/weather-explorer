// Small in-memory cache with a time-to-live (TTL) and in-flight de-duplication.
// Open-Meteo's free tier is rate limited, so every request goes through here:
// the same data is never fetched twice while it is still fresh, and two
// components asking for the same thing at the same time share one request.

const store = new Map()
const inflight = new Map()

export function getCached(key) {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expires) {
    store.delete(key)
    return undefined
  }
  return entry.value
}

export function setCached(key, value, ttlMs) {
  store.set(key, { value, expires: Date.now() + ttlMs })
}

export function cachedFetch(key, ttlMs, loader) {
  const hit = getCached(key)
  if (hit !== undefined) return Promise.resolve(hit)
  if (inflight.has(key)) return inflight.get(key)

  const promise = loader()
    .then((value) => {
      setCached(key, value, ttlMs)
      return value
    })
    .finally(() => inflight.delete(key))

  inflight.set(key, promise)
  return promise
}

// Only used by tests.
export function clearCache() {
  store.clear()
  inflight.clear()
}
