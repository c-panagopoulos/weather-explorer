import { cachedFetch } from './cache.js'

const DAY = 24 * 60 * 60 * 1000

// Lead images that make poor backgrounds: maps, flags, emblems, collages.
const NOT_A_VIEW = /map|flag|coat_of_arms|coat of arms|seal|logo|locator|diagram|emblem/i
const COLLAGE = /montage|collage|mosaic|composite/i
const NIGHT = /night|nocturn|by_night|illuminated/i

/** The Wikipedia article's lead image (often a landmark or skyline). */
async function wikipediaLead({ name, admin1, country }) {
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
      const file = decodeURIComponent((page.originalimage?.source ?? page.thumbnail.source).split('/').pop())
      return {
        // Ask Wikimedia for a ~960px version instead of the small thumbnail.
        src: page.thumbnail.source.replace(/\/\d+px-/, '/960px-'),
        title: page.title,
        description: page.description ?? '',
        pageUrl: page.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        file,
        width: page.originalimage?.width ?? 0,
        height: page.originalimage?.height ?? 0,
      }
    } catch {
      // Network problem: try the next candidate, then give up quietly.
    }
  }
  return null
}

/** First landscape JPEG on Wikimedia Commons for a search query (one request). */
async function commonsPhoto(query, label) {
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrnamespace: '6',
      gsrlimit: '15',
      gsrsearch: query,
      prop: 'imageinfo',
      iiprop: 'url|size|mime',
      iiurlwidth: '960',
    })
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index)
    for (const p of pages) {
      const info = p.imageinfo?.[0]
      if (!info?.thumburl || info.mime !== 'image/jpeg') continue
      if (info.width < 1000 || info.width / info.height < 1.2) continue
      if (NOT_A_VIEW.test(p.title) || COLLAGE.test(p.title)) continue
      return {
        src: info.thumburl,
        title: label,
        description: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replaceAll('_', ' '),
        pageUrl: info.descriptionurl,
        file: p.title,
        source: 'Wikimedia Commons',
      }
    }
  } catch {
    // Commons unavailable or rate-limited: fall back quietly.
  }
  return null
}

/**
 * A photo of the place for the details scene.
 * - Day: the Wikipedia lead image; if that is a collage, a portrait image or
 *   a map, one landscape photo from Wikimedia Commons instead.
 * - Night: a night photo when one exists (the lead image itself, or one
 *   Commons search); otherwise the day photo, which the UI darkens.
 * Each result is cached for a day, so a place costs at most two requests.
 * Returns null when nothing suitable exists (the UI shows a gradient).
 */
export function fetchCityPhoto({ name, admin1, country }, { night = false } = {}) {
  const key = `photo:${name}|${admin1}|${country}|${night ? 'night' : 'day'}`
  return cachedFetch(key, DAY, async () => {
    const lead = await wikipediaLead({ name, admin1, country })
    const leadIsNight = lead && NIGHT.test(lead.file)
    if (night) {
      if (leadIsNight) return { ...lead, source: 'Wikipedia', isNight: true }
      const nightPhoto = await commonsPhoto(`intitle:"${name}" intitle:night filetype:bitmap`, name)
      if (nightPhoto) return { ...nightPhoto, isNight: true }
    }
    const goodLead =
      lead && !COLLAGE.test(lead.file) && !NOT_A_VIEW.test(lead.file) && (!lead.height || lead.width >= lead.height)
    if (goodLead) return { ...lead, source: 'Wikipedia', isNight: leadIsNight }
    const view = await commonsPhoto(`intitle:"${name}" filetype:bitmap`, name)
    if (view) return { ...view, isNight: NIGHT.test(view.file) }
    return lead ? { ...lead, source: 'Wikipedia', isNight: false } : null
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
