import { cachedFetch } from './cache.js'

const DAY = 24 * 60 * 60 * 1000

/**
 * A representative photo of a city from Wikipedia (usually a landmark or
 * skyline). Returns null when nothing suitable exists, so the UI can fall
 * back to a weather-coloured gradient.
 */
export function fetchCityPhoto({ name, admin1, country }) {
  const key = `photo:${name}|${admin1}|${country}`
  return cachedFetch(key, DAY, async () => {
    // Plain city names can be ambiguous ("Springfield"), so try more
    // specific titles when Wikipedia answers with a disambiguation page.
    const candidates = [name, admin1 && `${name}, ${admin1}`, country && `${name}, ${country}`].filter(Boolean)
    for (const title of candidates) {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
        )
        if (!res.ok) continue
        const page = await res.json()
        if (page.type === 'disambiguation' || !page.thumbnail?.source) continue
        return {
          // Ask Wikimedia for a ~960px version instead of the small thumbnail.
          src: page.thumbnail.source.replace(/\/\d+px-/, '/960px-'),
          title: page.title,
          description: page.description ?? '',
          pageUrl: page.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        }
      } catch {
        // Network problem: try the next candidate, then give up quietly.
      }
    }
    return null
  })
}

/**
 * City name for the user's own position. Open-Meteo has no reverse
 * geocoding, so this uses BigDataCloud's free client-side endpoint, which
 * is meant exactly for browser geolocation results. Failure is fine: the
 * app then just says "Your location".
 */
export async function reverseGeocodeOwnPosition(lat, lon) {
  try {
    const params = new URLSearchParams({ latitude: lat, longitude: lon, localityLanguage: 'en' })
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`)
    if (!res.ok) return null
    const d = await res.json()
    // Strip administrative prefixes such as "Dimos Acharnes" -> "Acharnes".
    const name = (d.city || d.locality || '').replace(/^(Dimos|Municipality of|City of)\s+/i, '')
    if (!name) return null
    return { name, admin1: d.principalSubdivision ?? '', country: d.countryName ?? '' }
  } catch {
    return null
  }
}
