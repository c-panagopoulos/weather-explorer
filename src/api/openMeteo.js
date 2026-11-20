import { cachedFetch, getCached, setCached } from './cache.js'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

// Open-Meteo refreshes current conditions every 15 minutes, so caching
// for that long never shows stale data but saves a lot of requests.
const WEATHER_TTL = 15 * 60 * 1000
const SEARCH_TTL = 24 * 60 * 60 * 1000
// How many locations we send in one multi-location request.
const BATCH_SIZE = 100

async function getJson(url) {
  let res
  try {
    res = await fetch(url)
  } catch {
    throw new Error('Could not reach the weather service. Check your connection.')
  }
  if (res.status === 429) {
    throw new Error('The weather service is busy (rate limit reached). Please try again in a minute.')
  }
  if (!res.ok) throw new Error(`The weather service returned an error (${res.status}).`)
  return res.json()
}

// Two decimals is about 1 km: close enough for weather, and it lets
// nearby clicks reuse the same cache entry.
const round2 = (n) => Math.round(n * 100) / 100

export const pointKey = ({ lat, lon }) => `${round2(lat).toFixed(2)},${round2(lon).toFixed(2)}`

/** Full forecast for one place: current conditions, next 24 hours and 7 days. */
export function fetchForecast(lat, lon) {
  const key = `forecast:${pointKey({ lat, lon })}`
  return cachedFetch(key, WEATHER_TTL, async () => {
    const params = new URLSearchParams({
      latitude: round2(lat),
      longitude: round2(lon),
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'is_day',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'precipitation',
      ].join(','),
      hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
      timezone: 'auto',
      forecast_days: '7',
    })
    return normalizeForecast(await getJson(`${FORECAST_URL}?${params}`))
  })
}

export function normalizeForecast(data) {
  const c = data.current
  // Hourly data starts at midnight; keep the 24 hours starting from now.
  const currentHour = `${c.time.slice(0, 13)}:00`
  const start = Math.max(0, data.hourly.time.indexOf(currentHour))
  const hourly = data.hourly.time.slice(start, start + 24).map((time, i) => ({
    time,
    temperature: data.hourly.temperature_2m[start + i],
    precipitationProbability: data.hourly.precipitation_probability[start + i],
    code: data.hourly.weather_code[start + i],
    isDay: data.hourly.is_day[start + i] === 1,
  }))
  const daily = data.daily.time.map((date, i) => ({
    date,
    code: data.daily.weather_code[i],
    max: data.daily.temperature_2m_max[i],
    min: data.daily.temperature_2m_min[i],
    precipitationProbability: data.daily.precipitation_probability_max[i],
    sunrise: data.daily.sunrise[i],
    sunset: data.daily.sunset[i],
  }))
  return {
    timezone: data.timezone,
    current: {
      time: c.time,
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      isDay: c.is_day === 1,
      code: c.weather_code,
      windSpeed: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
      precipitation: c.precipitation,
    },
    hourly,
    daily,
  }
}

/**
 * Current conditions for many points at once (map overview + saved places).
 * Cached points are skipped; the rest go out in as few multi-location
 * requests as possible (Open-Meteo accepts comma-separated coordinates).
 * Returns a Map of pointKey -> { temperature, code, isDay, wind, rain, hours: [24 × same] }.
 */
export async function fetchCurrentBatch(points) {
  const results = new Map()
  const missing = []
  for (const p of points) {
    const key = pointKey(p)
    const hit = getCached(`current:${key}`)
    if (hit) results.set(key, hit)
    else if (!missing.some((m) => pointKey(m) === key)) missing.push(p)
  }

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const chunk = missing.slice(i, i + BATCH_SIZE)
    const params = new URLSearchParams({
      latitude: chunk.map((p) => round2(p.lat)).join(','),
      longitude: chunk.map((p) => round2(p.lon)).join(','),
      current: 'temperature_2m,weather_code,is_day,wind_speed_10m',
      // The next 24 hours in the same request, so the time slider and the
      // rain / wind layers work without any extra requests.
      hourly: 'temperature_2m,weather_code,is_day,precipitation_probability,wind_speed_10m',
      forecast_hours: '24',
    })
    const data = await getJson(`${FORECAST_URL}?${params}`)
    // A single location comes back as an object, several as an array.
    const list = Array.isArray(data) ? data : [data]
    list.forEach((d, idx) => {
      const key = pointKey(chunk[idx])
      const value = {
        temperature: d.current.temperature_2m,
        code: d.current.weather_code,
        isDay: d.current.is_day === 1,
        wind: d.current.wind_speed_10m,
        // Chance of rain for the current hour (there is no "current" value for it).
        rain: d.hourly?.precipitation_probability?.[0] ?? 0,
        hours: (d.hourly?.time ?? []).map((_, h) => ({
          temperature: d.hourly.temperature_2m[h],
          code: d.hourly.weather_code[h],
          isDay: d.hourly.is_day[h] === 1,
          rain: d.hourly.precipitation_probability?.[h] ?? 0,
          wind: d.hourly.wind_speed_10m?.[h] ?? 0,
        })),
      }
      setCached(`current:${key}`, value, WEATHER_TTL)
      results.set(key, value)
    })
  }
  return results
}

/** Place search for the search box (Open-Meteo Geocoding API). */
export function searchPlaces(query) {
  const q = query.trim().toLowerCase()
  return cachedFetch(`search:${q}`, SEARCH_TTL, async () => {
    const params = new URLSearchParams({ name: q, count: '8', language: 'en', format: 'json' })
    const data = await getJson(`${GEOCODING_URL}?${params}`)
    return (data.results ?? []).map((r) => ({
      id: String(r.id),
      name: r.name,
      admin1: r.admin1 ?? '',
      country: r.country ?? '',
      countryCode: r.country_code ?? '',
      lat: r.latitude,
      lon: r.longitude,
      population: r.population ?? 0,
    }))
  })
}
