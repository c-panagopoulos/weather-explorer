// The app always fetches metric data and converts on the client.
// That way switching °C/°F never costs an extra API request.

export const toUnit = (celsius, unit) => (unit === 'F' ? (celsius * 9) / 5 + 32 : celsius)

export function formatTemp(celsius, unit, { withUnit = false } = {}) {
  if (celsius == null || Number.isNaN(celsius)) return '–'
  const value = Math.round(toUnit(celsius, unit))
  return withUnit ? `${value}°${unit}` : `${value}°`
}

export function formatWind(kmh, unit) {
  if (kmh == null) return '–'
  return unit === 'F' ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`
}

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const compassDirection = (deg) => DIRECTIONS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]

export function formatCoords(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`
}

// Open-Meteo returns local times without an offset ("2026-11-20T14:00"),
// already in the place's timezone, so we format the string itself rather
// than letting the browser convert it to the viewer's timezone.
export const formatHour = (isoLocal) => isoLocal.slice(11, 16)

export function formatDay(isoDate, index) {
  if (index === 0) return 'Today'
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
}

export function placeLabel(place) {
  return [place.name, place.admin1 !== place.name ? place.admin1 : '', place.country].filter(Boolean).join(', ')
}

// TV-forecast style colour scale. Each step has a text colour chosen to
// keep WCAG AA contrast on top of its background.
const SCALE = [
  { max: -20, bg: '#5b3f9e', fg: '#ffffff' },
  { max: -10, bg: '#3f5fbf', fg: '#ffffff' },
  { max: 0, bg: '#6fa8ff', fg: '#0b1b33' },
  { max: 8, bg: '#9fd7ff', fg: '#0b1b33' },
  { max: 15, bg: '#b9f0a5', fg: '#10260a' },
  { max: 22, bg: '#ffe680', fg: '#2e2400' },
  { max: 28, bg: '#ffb35c', fg: '#2e1600' },
  { max: 34, bg: '#f36b3b', fg: '#1f0700' },
  { max: Infinity, bg: '#b3202a', fg: '#ffffff' },
]

export const tempColor = (celsius) => SCALE.find((s) => celsius <= s.max) ?? SCALE[SCALE.length - 1]
