// Colour scale for the temperature field and chips (−10 … 32 °C).
const STOPS = [
  [-10, [75, 79, 196]],
  [0, [63, 143, 214]],
  [8, [63, 191, 176]],
  [15, [156, 207, 106]],
  [20, [232, 197, 90]],
  [26, [240, 144, 74]],
  [32, [217, 83, 74]],
]

export function tempRgb(celsius) {
  if (celsius <= STOPS[0][0]) return STOPS[0][1]
  for (let i = 1; i < STOPS.length; i++) {
    const [b, cb] = STOPS[i]
    if (celsius <= b) {
      const [a, ca] = STOPS[i - 1]
      const k = (celsius - a) / (b - a)
      return ca.map((v, j) => Math.round(v + (cb[j] - v) * k))
    }
  }
  return STOPS[STOPS.length - 1][1]
}

export const tempCss = (celsius) => `rgb(${tempRgb(celsius).join(',')})`

/** Background + readable text colour (chosen by luminance) for a temperature chip. */
export function chipColors(celsius) {
  const [r, g, b] = tempRgb(celsius)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return { bg: `rgb(${r},${g},${b})`, fg: lum > 0.5 ? '#111317' : '#ffffff' }
}

export const SCALE_GRADIENT = `linear-gradient(90deg, ${STOPS.map(
  ([, c], i) => `rgb(${c.join(',')}) ${Math.round((i / (STOPS.length - 1)) * 100)}%`,
).join(', ')})`
