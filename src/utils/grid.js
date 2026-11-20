// Builds the "TV forecast" overview: a grid of sample points over the part
// of the map that is visible. Points are snapped to fixed multiples of the
// grid step, so panning reuses cached points instead of fetching new ones.

const STEPS = [0.25, 0.5, 1, 2, 3, 5, 10, 15, 20, 30, 45]

const wrapLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180
const tidy = (n) => Math.round(n * 1e4) / 1e4

/**
 * @param bounds {south, west, north, east} in degrees (west/east may go past ±180
 *               when the map shows a wrapped copy of the world)
 * @returns {{ step: number, points: {lat, lon, displayLon}[] }}
 *          `lon` is the real longitude (used for the API), `displayLon` keeps the
 *          marker on the copy of the world the user is looking at.
 */
export function gridPoints(bounds, { maxPoints = 60 } = {}) {
  const south = Math.max(bounds.south, -80)
  const north = Math.min(bounds.north, 80)
  const west = bounds.west
  const east = Math.min(bounds.east, bounds.west + 360)
  if (north <= south || east <= west) return { step: 0, points: [] }

  // Start from the step that would spread `maxPoints` evenly over the
  // visible area, then grow it until the grid fits the budget.
  const wanted = Math.sqrt(((east - west) * (north - south)) / maxPoints)
  let index = STEPS.findIndex((s) => s >= wanted)
  if (index === -1) index = STEPS.length - 1

  for (; index < STEPS.length; index++) {
    const step = STEPS[index]
    const points = []
    // Offset by half a step so points sit inside the view, not on its edge.
    for (let lat = Math.floor(south / step) * step + step / 2; lat < north; lat += step) {
      if (lat <= south) continue
      for (let lon = Math.floor(west / step) * step + step / 2; lon < east; lon += step) {
        if (lon <= west) continue
        points.push({ lat: tidy(lat), lon: tidy(wrapLon(lon)), displayLon: tidy(lon) })
      }
    }
    if (points.length <= maxPoints || index === STEPS.length - 1) {
      return { step, points: points.slice(0, maxPoints) }
    }
  }
  return { step: 0, points: [] }
}
