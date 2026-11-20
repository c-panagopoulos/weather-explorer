import { afterEach, describe, expect, it, vi } from 'vitest'
import { gridPoints } from './grid.js'
import { compassDirection, formatTemp, formatWind, tempColor } from './format.js'
import { describeWeather } from './weatherCodes.js'
import { cachedFetch, clearCache } from '../api/cache.js'
import { normalizeForecast } from '../api/openMeteo.js'

describe('gridPoints', () => {
  it('covers the visible area without exceeding the point budget', () => {
    const { points } = gridPoints({ south: -60, west: -180, north: 80, east: 180 }, { maxPoints: 48 })
    expect(points.length).toBeGreaterThan(0)
    expect(points.length).toBeLessThanOrEqual(48)
    for (const p of points) {
      expect(p.lat).toBeGreaterThan(-60)
      expect(p.lat).toBeLessThan(80)
    }
  })

  it('snaps points to the grid so small pans reuse the same points (and cache)', () => {
    const a = gridPoints({ south: 30, west: 0, north: 50, east: 30 })
    const b = gridPoints({ south: 30.4, west: 0.4, north: 50.4, east: 30.4 })
    const keys = (r) => new Set(r.points.map((p) => `${p.lat},${p.lon}`))
    const shared = [...keys(a)].filter((k) => keys(b).has(k))
    expect(shared.length).toBeGreaterThan(a.points.length / 2)
  })

  it('wraps longitudes past the antimeridian for the API but keeps display position', () => {
    const { points } = gridPoints({ south: 0, west: 170, north: 10, east: 200 })
    const wrapped = points.find((p) => p.displayLon > 180)
    expect(wrapped).toBeDefined()
    expect(wrapped.lon).toBeLessThan(0)
  })
})

describe('format helpers', () => {
  it('converts temperatures on the client', () => {
    expect(formatTemp(0, 'C')).toBe('0°')
    expect(formatTemp(0, 'F', { withUnit: true })).toBe('32°F')
    expect(formatTemp(null, 'C')).toBe('–')
  })

  it('converts wind speed and direction', () => {
    expect(formatWind(100, 'C')).toBe('100 km/h')
    expect(formatWind(100, 'F')).toBe('62 mph')
    expect(compassDirection(0)).toBe('N')
    expect(compassDirection(225)).toBe('SW')
    expect(compassDirection(359)).toBe('N')
  })

  it('maps temperatures to a colour scale', () => {
    expect(tempColor(-30).bg).not.toBe(tempColor(40).bg)
  })
})

describe('describeWeather', () => {
  it('maps WMO codes to labels, day/night icons and scene effects', () => {
    expect(describeWeather(0, true)).toMatchObject({ label: 'Clear sky', effect: 'clear' })
    expect(describeWeather(0, false).icon).toBe('🌙')
    expect(describeWeather(63).effect).toBe('rain')
    expect(describeWeather(75).effect).toBe('snow')
    expect(describeWeather(95).effect).toBe('thunder')
    expect(describeWeather(1234).label).toBe('Unknown')
  })
})

describe('cachedFetch', () => {
  afterEach(() => {
    clearCache()
    vi.useRealTimers()
  })

  it('shares one request between simultaneous callers and caches the result', async () => {
    const loader = vi.fn().mockResolvedValue(42)
    const [a, b] = await Promise.all([cachedFetch('k', 1000, loader), cachedFetch('k', 1000, loader)])
    await cachedFetch('k', 1000, loader)
    expect(a).toBe(42)
    expect(b).toBe(42)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('fetches again after the TTL expires', async () => {
    vi.useFakeTimers()
    const loader = vi.fn().mockResolvedValue('x')
    await cachedFetch('t', 1000, loader)
    vi.advanceTimersByTime(1001)
    await cachedFetch('t', 1000, loader)
    expect(loader).toHaveBeenCalledTimes(2)
  })
})

describe('normalizeForecast', () => {
  it('keeps the 24 hours starting from the current hour', () => {
    const times = Array.from({ length: 48 }, (_, i) => `2026-11-20T${String(i % 24).padStart(2, '0')}:00`)
    const raw = {
      timezone: 'Europe/Athens',
      current: {
        time: '2026-11-20T10:30',
        temperature_2m: 20,
        apparent_temperature: 19,
        relative_humidity_2m: 50,
        is_day: 1,
        weather_code: 0,
        wind_speed_10m: 5,
        wind_direction_10m: 90,
        precipitation: 0,
      },
      hourly: {
        time: times,
        temperature_2m: times.map((_, i) => i),
        precipitation_probability: times.map(() => 0),
        weather_code: times.map(() => 0),
        is_day: times.map(() => 1),
      },
      daily: {
        time: ['2026-11-20'],
        weather_code: [0],
        temperature_2m_max: [22],
        temperature_2m_min: [12],
        precipitation_probability_max: [0],
        sunrise: ['2026-11-20T07:10'],
        sunset: ['2026-11-20T17:10'],
      },
    }
    const f = normalizeForecast(raw)
    expect(f.hourly).toHaveLength(24)
    expect(f.hourly[0].time).toBe('2026-11-20T10:00')
    expect(f.current.isDay).toBe(true)
  })
})
