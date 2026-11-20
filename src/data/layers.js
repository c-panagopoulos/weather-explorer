import { formatTemp, formatWind } from '../utils/format.js'
import { tempRgb } from './palette.js'

// Map layers. Each one knows how to read its value from a point's weather,
// how to colour it and how to talk about it. Rain and wind fade out at low
// values (alpha), so calm, dry areas leave the base map visible.
const RAIN = [
  [0, [120, 140, 170], 0],
  [15, [110, 160, 230], 70],
  [40, [80, 130, 235], 150],
  [70, [130, 95, 235], 210],
  [100, [205, 110, 245], 240],
]
const WIND = [
  [0, [90, 170, 170], 0],
  [8, [80, 180, 170], 60],
  [20, [120, 200, 110], 150],
  [35, [240, 200, 90], 205],
  [55, [240, 100, 80], 235],
]

function interpolate(stops, v) {
  if (v <= stops[0][0]) return [...stops[0][1], stops[0][2]]
  for (let i = 1; i < stops.length; i++) {
    const [b, cb, ab] = stops[i]
    if (v <= b) {
      const [a, ca, aa] = stops[i - 1]
      const k = (v - a) / (b - a)
      return [...ca.map((c, j) => Math.round(c + (cb[j] - c) * k)), Math.round(aa + (ab - aa) * k)]
    }
  }
  const last = stops[stops.length - 1]
  return [...last[1], last[2]]
}

const gradient = (stops) =>
  `linear-gradient(90deg, ${stops
    .map(([, c, a], i) => `rgba(${c.join(',')},${Math.max(a, 60) / 255}) ${Math.round((i / (stops.length - 1)) * 100)}%`)
    .join(', ')})`

export const LAYERS = {
  temperature: {
    id: 'temperature',
    label: 'Temperature',
    value: (w) => w.temperature,
    rgba: (v) => [...tempRgb(v), 255],
    format: (v, unit) => formatTemp(v, unit),
    formatLong: (v, unit) => formatTemp(v, unit, { withUnit: true }),
    min: -10,
    max: 32,
    words: ['Colder', 'Warmer'],
    extremes: ['Coldest', 'Warmest'],
    explain: 'Blue means colder air, red means warmer. Values come from a grid of points and are blended in between.',
  },
  rain: {
    id: 'rain',
    label: 'Rain',
    value: (w) => w.rain ?? 0,
    rgba: (v) => interpolate(RAIN, v),
    format: (v) => `${Math.round(v)}%`,
    formatLong: (v) => `${Math.round(v)}% chance of rain`,
    min: 0,
    max: 100,
    words: ['Dry', 'Wet'],
    extremes: ['Driest', 'Wettest'],
    explain: 'Clear means little chance of rain; blue to violet means rain is likely.',
    gradient: gradient(RAIN),
  },
  wind: {
    id: 'wind',
    label: 'Wind',
    value: (w) => w.wind ?? 0,
    rgba: (v) => interpolate(WIND, v),
    format: (v, unit) => formatWind(v, unit),
    formatLong: (v, unit) => `wind ${formatWind(v, unit)}`,
    min: 0,
    max: 55,
    words: ['Calm', 'Windy'],
    extremes: ['Calmest', 'Windiest'],
    explain: 'Clear means calm; teal to yellow to red means stronger wind.',
    gradient: gradient(WIND),
  },
}
