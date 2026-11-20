import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { fetchCurrentBatch, pointKey } from '../api/openMeteo.js'
import { gridPoints } from '../utils/grid.js'
import { describeWeather } from '../utils/weatherCodes.js'
import { formatTemp } from '../utils/format.js'
import { tempRgb } from '../data/palette.js'
import { CITIES } from '../data/cities.js'

const MOVE_DEBOUNCE_MS = 450
const MAX_CITIES = 24

const TILES = {
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
}
const ATTRIBUTION =
  'Tiles &copy; Esri — Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Weather: <a href="https://open-meteo.com/">Open-Meteo</a>'

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

function useColorScheme() {
  const query = '(prefers-color-scheme: light)'
  const [light, setLight] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const onChange = () => setLight(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return light ? 'light' : 'dark'
}

// The longitude at which a point is visible on the current (possibly wrapped) map copy.
function displayLonIn(bounds, lat, lon) {
  for (const k of [0, -360, 360]) if (bounds.contains([lat, lon + k])) return lon + k
  return null
}

/** Loads current weather for the grid + visible cities in ONE batched request. */
function WeatherData({ onData, onSummary, onLoading }) {
  const map = useMap()
  const timer = useRef(null)
  const requestId = useRef(0)

  const load = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const b = map.getBounds()
      const small = map.getSize().x < 640
      const { points } = gridPoints(
        { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
        { maxPoints: small ? 30 : 60 },
      )
      const cities = CITIES.filter((c) => displayLonIn(b, c.lat, c.lon) != null).slice(0, MAX_CITIES)
      const id = ++requestId.current
      onLoading(true)
      try {
        const weather = await fetchCurrentBatch([...points, ...cities])
        if (id !== requestId.current) return
        const cells = points.map((p) => ({ ...p, weather: weather.get(pointKey(p)) })).filter((c) => c.weather)
        const cityData = cities.map((c) => ({ ...c, weather: weather.get(pointKey(c)) })).filter((c) => c.weather)
        onData({ cells, cities: cityData })
        onSummary({ cells, error: null })
      } catch (error) {
        if (id === requestId.current) onSummary({ cells: [], error })
      } finally {
        if (id === requestId.current) onLoading(false)
      }
    }, MOVE_DEBOUNCE_MS)
  }

  useMapEvents({ moveend: load })
  useEffect(() => {
    load()
    return () => clearTimeout(timer.current)
  }, [])
  return null
}

/**
 * Smooth temperature field: grid values are interpolated (inverse distance
 * weighting) on a coarse canvas, then upscaled with a blur. The canvas lives
 * in Leaflet's overlay pane, so it pans with the map and is redrawn when
 * movement ends. The old field stays visible until new data arrives.
 */
function FieldLayer({ cells }) {
  const map = useMap()
  const canvasRef = useRef(null)
  const cellsRef = useRef(cells)
  cellsRef.current = cells

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.classList.remove('is-zooming')
    const size = map.getSize()
    canvas.width = size.x
    canvas.height = size.y
    canvas.style.width = `${size.x}px`
    canvas.style.height = `${size.y}px`
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]))
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size.x, size.y)
    const data = cellsRef.current
    if (!data.length) return

    const S = 8 // one coarse pixel = 8 screen pixels
    const M = 3 // margin so the blur doesn't fade the edges
    const W = Math.ceil(size.x / S) + 2 * M
    const H = Math.ceil(size.y / S) + 2 * M
    const pts = data.map((c) => {
      const p = map.latLngToContainerPoint([c.lat, c.displayLon])
      return [p.x / S + M - 0.5, p.y / S + M - 0.5, c.weather.temperature]
    })
    const small = document.createElement('canvas')
    small.width = W
    small.height = H
    const sctx = small.getContext('2d')
    const img = sctx.createImageData(W, H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let num = 0
        let den = 0
        let exact = null
        for (const [px, py, t] of pts) {
          const d2 = (px - x) ** 2 + (py - y) ** 2
          if (d2 < 0.01) {
            exact = t
            break
          }
          const w = 1 / (d2 * Math.sqrt(d2))
          num += w * t
          den += w
        }
        const [r, g, b] = tempRgb(exact ?? num / den)
        const k = (y * W + x) * 4
        img.data[k] = r
        img.data[k + 1] = g
        img.data[k + 2] = b
        img.data[k + 3] = 255
      }
    }
    sctx.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.filter = 'blur(10px)'
    ctx.drawImage(small, -M * S, -M * S, W * S, H * S)
    ctx.filter = 'none'
  }, [map])

  useEffect(() => {
    const canvas = L.DomUtil.create('canvas', 'field-layer')
    canvas.setAttribute('aria-hidden', 'true')
    map.getPanes().overlayPane.appendChild(canvas)
    canvasRef.current = canvas
    const hide = () => canvas.classList.add('is-zooming')
    map.on('moveend zoomend resize viewreset', draw)
    map.on('zoomstart', hide)
    return () => {
      map.off('moveend zoomend resize viewreset', draw)
      map.off('zoomstart', hide)
      canvas.remove()
    }
  }, [map, draw])

  useEffect(() => {
    draw()
  }, [cells, draw])

  return null
}

const overlaps = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]

/**
 * Values on the map: saved places (focusable) and major cities (display only).
 * Labels are placed greedily (right, then left, otherwise dropped) so they never
 * overlap each other or any floating panel (elements marked data-obstacle).
 */
function Readouts({ places, placesWeather, cities, unit, onSelect, layoutKey }) {
  const map = useMap()
  const [items, setItems] = useState([])

  const compute = useCallback(() => {
    const cr = map.getContainer().getBoundingClientRect()
    const size = map.getSize()
    const bounds = map.getBounds()
    const obstacles = [...document.querySelectorAll('[data-obstacle]')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => [r.left - cr.left - 6, r.top - cr.top - 6, r.right - cr.left + 6, r.bottom - cr.top + 6])

    const near = (a, b) => Math.abs(a.lat - b.lat) < 0.3 && Math.abs(a.lon - b.lon) < 0.3
    const candidates = [
      ...places.map((p) => ({ ...p, saved: true, weather: placesWeather.get(pointKey(p)) })),
      ...cities.filter((c) => !places.some((p) => near(p, c))).map((c) => ({ ...c, saved: false })),
    ].filter((c) => c.weather)

    const boxes = []
    const out = []
    for (const it of candidates) {
      const dl = displayLonIn(bounds, it.lat, it.lon)
      if (dl == null) continue
      const p = map.latLngToContainerPoint([it.lat, dl])
      const sx = p.x
      const sy = p.y
      if (sx < 12 || sx > size.x - 12 || sy < 30 || sy > size.y - 12) continue
      const dot = [sx - 10, sy - 10, sx + 10, sy + 10]
      if (obstacles.some((o) => overlaps(o, dot)) || boxes.some((b) => overlaps(b, dot))) continue
      const lw = Math.round(Math.max(it.name.length * 7.6 + 8, 50))
      const right = [sx + 12, sy - 25, sx + 12 + lw, sy + 16]
      const left = [sx - 12 - lw, sy - 25, sx - 12, sy + 16]
      const ok = (b) =>
        b[0] >= 4 &&
        b[2] <= size.x - 4 &&
        b[1] >= 0 &&
        !boxes.some((k) => overlaps(k, b)) &&
        !obstacles.some((k) => overlaps(k, b))
      const side = ok(right) ? 'r' : ok(left) ? 'l' : null
      if (!side && !it.saved) continue
      boxes.push(dot)
      if (side) boxes.push(side === 'r' ? right : left)
      out.push({ ...it, displayLon: dl, side, lw })
    }
    setItems(out)
  }, [map, places, placesWeather, cities])

  useMapEvents({ moveend: compute, zoomend: compute, resize: compute })
  useEffect(() => {
    const t = setTimeout(compute, 60)
    window.addEventListener('resize', compute)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', compute)
    }
  }, [compute, layoutKey])

  return items.map((it) => {
    const t = formatTemp(it.weather.temperature, unit)
    const label = describeWeather(it.weather.code, it.weather.isDay).label
    const html = `<span class="ro ro--${it.side ?? 'none'}${it.saved ? ' ro--saved' : ''}"><span class="ro__dot"></span>${
      it.side
        ? `<span class="ro__label" style="width:${it.lw}px"><span class="ro__t">${t}</span><span class="ro__n">${escapeHtml(it.name)}</span></span>`
        : ''
    }</span>`
    const aria = `${it.saved ? 'Saved place' : 'City'}: ${it.name}, ${formatTemp(it.weather.temperature, unit, { withUnit: true })}, ${label}`
    return (
      <Marker
        // Re-mount when the content changes so the aria-label lands on the new element.
        key={`${it.id}-${it.side}-${t}-${it.displayLon}`}
        position={[it.lat, it.displayLon]}
        icon={L.divIcon({ className: 'ro-icon', html, iconSize: [44, 44], iconAnchor: [22, 22] })}
        keyboard={it.saved}
        zIndexOffset={it.saved ? 600 : 300}
        eventHandlers={{
          click: () => onSelect({ ...it, source: it.saved ? 'place' : 'search' }),
          add: (e) => {
            const el = e.target.getElement()
            if (!el) return
            el.setAttribute('aria-label', aria)
            if (it.saved) el.setAttribute('role', 'button')
            else el.setAttribute('aria-hidden', 'true')
          },
        }}
      />
    )
  })
}

function ClickToExplore({ onSelect }) {
  useMapEvents({
    click: (e) => onSelect({ lat: e.latlng.lat, lon: L.Util.wrapNum(e.latlng.lng, [-180, 180]), source: 'map' }),
  })
  return null
}

function FlyToSelection({ selected, reducedMotion }) {
  const map = useMap()
  useEffect(() => {
    if (!selected || selected.source === 'map') return
    const zoom = Math.max(map.getZoom(), 6)
    if (reducedMotion) map.setView([selected.lat, selected.lon], zoom)
    else map.flyTo([selected.lat, selected.lon], zoom, { duration: 1.2 })
  }, [map, selected, reducedMotion])
  return null
}

const selectedIcon = L.divIcon({
  className: 'sel-icon',
  html: '<span class="sel-pin"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export default function WeatherMap({ selected, places, placesWeather, unit, onSelect, onSummary, reducedMotion, layoutKey }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ cells: [], cities: [] })
  const scheme = useColorScheme()
  const isSmall = window.innerWidth < 640

  return (
    <div className="map-wrap" aria-busy={loading}>
      <MapContainer
        className="map"
        center={[40, 15]}
        zoom={isSmall ? 3 : 4}
        minZoom={2}
        maxZoom={12}
        worldCopyJump
        zoomControl={false}
        zoomAnimation={!reducedMotion}
        fadeAnimation={!reducedMotion}
        aria-label="Weather map. Use the arrow keys to pan and plus or minus to zoom."
      >
        <TileLayer key={scheme} url={TILES[scheme]} attribution={ATTRIBUTION} maxNativeZoom={16} />
        <ZoomControl position="bottomright" />
        <WeatherData onData={setData} onSummary={onSummary} onLoading={setLoading} />
        <FieldLayer cells={data.cells} />
        <ClickToExplore onSelect={onSelect} />
        <FlyToSelection selected={selected} reducedMotion={reducedMotion} />
        <Readouts
          places={places}
          placesWeather={placesWeather}
          cities={data.cities}
          unit={unit}
          onSelect={onSelect}
          layoutKey={layoutKey}
        />
        {selected && (
          <Marker
            key={`sel-${selected.lat},${selected.lon}`}
            position={[selected.lat, selected.lon]}
            icon={selectedIcon}
            zIndexOffset={1000}
            keyboard={false}
            interactive={false}
          />
        )}
      </MapContainer>
      {loading && (
        <div className="chip map-loading" aria-hidden="true">
          Updating map…
        </div>
      )}
    </div>
  )
}
