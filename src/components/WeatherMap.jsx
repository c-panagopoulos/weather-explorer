import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { fetchCurrentBatch, pointKey } from '../api/openMeteo.js'
import { gridPoints } from '../utils/grid.js'
import { describeWeather } from '../utils/weatherCodes.js'
import { formatTemp, tempColor } from '../utils/format.js'

const MOVE_DEBOUNCE_MS = 450

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

function gridIcon(weather, unit) {
  const { icon } = describeWeather(weather.code, weather.isDay)
  const { bg, fg } = tempColor(weather.temperature)
  return L.divIcon({
    className: 'grid-marker',
    html: `<span class="grid-pill" style="background:${bg};color:${fg}"><span aria-hidden="true">${icon}</span>${formatTemp(weather.temperature, unit)}</span>`,
    iconSize: [64, 28],
    iconAnchor: [32, 14],
  })
}

function pinIcon(kind, label) {
  return L.divIcon({
    className: `pin pin--${kind}`,
    html: `<span class="pin__dot"></span>${label ? `<span class="pin__label">${escapeHtml(label)}</span>` : ''}`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

// Leaflet markers are keyboard-focusable but have no accessible name by default.
const labelled = (label) => ({
  add: (e) => {
    const el = e.target.getElement()
    el?.setAttribute('aria-label', label)
    el?.setAttribute('role', 'button')
  },
})

/** Fetches current weather for a grid of points covering the visible map. */
function WeatherGrid({ unit, onSelect, onSummary, onLoading }) {
  const map = useMap()
  const [cells, setCells] = useState([])
  const timer = useRef(null)
  const requestId = useRef(0)

  const load = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const b = map.getBounds()
      const small = map.getSize().x < 640
      const { points } = gridPoints(
        { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
        { columns: small ? 4 : 7, maxPoints: small ? 28 : 48 },
      )
      const id = ++requestId.current
      onLoading(true)
      try {
        const weather = await fetchCurrentBatch(points)
        if (id !== requestId.current) return
        const next = points
          .map((p) => ({ ...p, weather: weather.get(pointKey(p)) }))
          .filter((c) => c.weather)
        setCells(next)
        onSummary({ cells: next, error: null })
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

  return cells.map((c) => (
    <Marker
      key={`${c.lat},${c.displayLon}`}
      position={[c.lat, c.displayLon]}
      icon={gridIcon(c.weather, unit)}
      // The overview is summarised in text for screen readers (see App),
      // so 30+ grid markers don't each become a tab stop.
      keyboard={false}
      eventHandlers={{ click: () => onSelect({ lat: c.lat, lon: c.lon, source: 'map' }) }}
    />
  ))
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

export default function WeatherMap({ selected, places, unit, onSelect, onSummary, reducedMotion }) {
  const [loading, setLoading] = useState(false)
  const isSmall = useMemo(() => window.innerWidth < 640, [])

  return (
    <div className="map-wrap" aria-busy={loading}>
      <MapContainer
        className="map"
        center={[35, 15]}
        zoom={isSmall ? 2 : 3}
        minZoom={2}
        maxZoom={12}
        worldCopyJump
        zoomAnimation={!reducedMotion}
        fadeAnimation={!reducedMotion}
        aria-label="Weather map. Use the arrow keys to pan and plus or minus to zoom."
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Weather: <a href="https://open-meteo.com/">Open-Meteo</a>'
        />
        <WeatherGrid unit={unit} onSelect={onSelect} onSummary={onSummary} onLoading={setLoading} />
        <ClickToExplore onSelect={onSelect} />
        <FlyToSelection selected={selected} reducedMotion={reducedMotion} />

        {places.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={pinIcon('saved', p.name)}
            zIndexOffset={500}
            eventHandlers={{ click: () => onSelect({ ...p, source: 'place' }), ...labelled(`Saved place: ${p.name}`) }}
          />
        ))}

        {selected && (
          <Marker
            key={`sel-${selected.lat},${selected.lon}`}
            position={[selected.lat, selected.lon]}
            icon={pinIcon('selected')}
            zIndexOffset={1000}
            keyboard={false}
            interactive={false}
          />
        )}
      </MapContainer>
      {loading && (
        <div className="map-loading" aria-hidden="true">
          Updating map…
        </div>
      )}
    </div>
  )
}
