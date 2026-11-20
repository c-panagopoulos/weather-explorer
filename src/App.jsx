import { useCallback, useEffect, useRef, useState } from 'react'
import SearchBox from './components/SearchBox.jsx'
import WeatherMap from './components/WeatherMap.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import PlacesBar from './components/PlacesBar.jsx'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useReducedMotion } from './hooks/useReducedMotion.js'
import { reverseGeocodeOwnPosition } from './api/places.js'
import { fetchCurrentBatch, pointKey } from './api/openMeteo.js'
import { formatCoords, formatTemp } from './utils/format.js'
import { describeNearest, nearestName } from './data/places.js'
import TimeSlider from './components/TimeSlider.jsx'
import { LegendCard, LegendChip } from './components/Legend.jsx'
import LayersMenu from './components/LayersMenu.jsx'

// Stable id for a place: geocoding id when we have one, otherwise its rounded coordinates.
const placeId = (loc) => (loc.id && !String(loc.id).startsWith('pt:') ? String(loc.id) : `pt:${pointKey(loc)}`)

// Share links look like #/<placeId>?lat=..&lon=..&name=..&u=C
function readHash() {
  const m = window.location.hash.match(/^#\/([^?]+)\?(.*)$/)
  if (!m) return null
  const q = new URLSearchParams(m[2])
  const lat = Number(q.get('lat'))
  const lon = Number(q.get('lon'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  const t = Number((q.get('t') || '').replace(/[^0-9]/g, ''))
  return {
    unit: q.get('u') === 'F' ? 'F' : q.get('u') === 'C' ? 'C' : null,
    hour: Number.isInteger(t) && t > 0 && t < 24 ? t : 0,
    place: {
      id: decodeURIComponent(m[1]),
      lat,
      lon,
      name: q.get('name') || undefined,
      admin1: q.get('admin1') || '',
      country: q.get('country') || '',
      source: 'search',
    },
  }
}

const isDesktop = () => window.matchMedia?.('(min-width: 900px)').matches ?? true

export default function App() {
  const [selected, setSelected] = useState(null)
  const [places, setPlaces] = useLocalStorage('weather-explorer:places', [])
  const [unit, setUnit] = useLocalStorage('weather-explorer:unit', 'C')
  const [overview, setOverview] = useState({ cells: [], error: null })
  const [placesWeather, setPlacesWeather] = useState(new Map())
  const [placesOpen, setPlacesOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useLocalStorage('weather-explorer:legend', true)
  const [chipOpen, setChipOpen] = useLocalStorage('weather-explorer:legend-chip', false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const [hour, setHour] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reducedMotion = useReducedMotion()

  const select = useCallback((loc) => setSelected({ ...loc, id: placeId(loc) }), [])

  function showToast(text, { undo, ms = 3500, kind } = {}) {
    clearTimeout(toastTimer.current)
    setToast({ text, undo, kind })
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }

  // Restore a shared selection and unit on load.
  useEffect(() => {
    const shared = readHash()
    if (!shared) return
    if (shared.unit) setUnit(shared.unit)
    if (shared.hour) setHour(shared.hour)
    select(shared.place)
  }, [])

  // Current weather for saved places (one batched, cached request).
  const placesKey = places.map((p) => pointKey(p)).join('|')
  useEffect(() => {
    if (!places.length) return
    let active = true
    fetchCurrentBatch(places)
      .then((w) => active && setPlacesWeather(w))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [placesKey])

  // Play steps through the hours once, then stops.
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setHour((h) => {
        if (h >= 23) {
          setPlaying(false)
          return 23
        }
        return h + 1
      })
    }, 800)
    return () => clearInterval(id)
  }, [playing])
  useEffect(() => {
    if (reducedMotion) setPlaying(false)
  }, [reducedMotion])

  function togglePlay() {
    if (playing) return setPlaying(false)
    if (hour >= 23) setHour(0)
    setPlaying(true)
  }

  const isSaved = selected ? places.some((p) => p.id === selected.id) : false

  function toggleSave() {
    if (!selected) return
    if (isSaved) {
      removePlace(selected.id)
      return
    }
    const fallbackName =
      selected.source === 'geo'
        ? 'My location'
        : describeNearest(selected.lat, selected.lon).replace(/^\d+ km from /, 'Off ') || formatCoords(selected.lat, selected.lon)
    setPlaces([
      ...places,
      {
        id: selected.id,
        name: selected.name ?? fallbackName,
        admin1: selected.admin1 ?? '',
        country: selected.country ?? '',
        lat: selected.lat,
        lon: selected.lon,
      },
    ])
  }

  function removePlace(id) {
    const index = places.findIndex((p) => p.id === id)
    if (index === -1) return
    const place = places[index]
    setPlaces(places.filter((p) => p.id !== id))
    showToast(`Removed ${place.name}.`, {
      ms: 6000,
      undo: () => {
        setPlaces((cur) => {
          if (cur.some((p) => p.id === id)) return cur
          const next = [...cur]
          next.splice(index, 0, place)
          return next
        })
        setToast(null)
      },
    })
  }

  async function share() {
    if (!selected) return
    const q = new URLSearchParams({ lat: selected.lat.toFixed(4), lon: selected.lon.toFixed(4), u: unit })
    if (hour) q.set('t', `+${hour}h`)
    if (selected.name) {
      q.set('name', selected.name)
      if (selected.admin1) q.set('admin1', selected.admin1)
      if (selected.country) q.set('country', selected.country)
    }
    const url = `${window.location.origin}${window.location.pathname}#/${encodeURIComponent(selected.id)}?${q}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied')
    } catch {
      window.history.replaceState(null, '', url)
      showToast('Could not copy. The link is now in the address bar.')
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      showToast('Your browser does not support location.', { kind: 'error', ms: 8000 })
      return
    }
    setGeoBusy(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude
        const lon = coords.longitude
        setGeoBusy(false)
        select({ lat, lon, source: 'geo' })
        // Put a real name on it if we can (this also enables the city photo).
        const named = await reverseGeocodeOwnPosition(lat, lon)
        if (named) {
          setSelected((cur) => (cur?.source === 'geo' && cur.lat === lat ? { ...cur, ...named } : cur))
        }
      },
      (err) => {
        setGeoBusy(false)
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. You can still search for your city.'
            : 'Could not get your location. Try searching for your city instead.'
        showToast(message, { kind: 'error', ms: 10000 })
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  }

  // Escape closes the My places dropdown first, then the details panel
  // (unless focus is inside the search box, which handles Escape itself).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.target.closest?.('.search') || e.target.closest?.('.layers')) return
      if (placesOpen && isDesktop()) {
        setPlacesOpen(false)
        document.querySelector('.places-btn')?.focus()
        return
      }
      setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placesOpen])

  // On desktop My places is a dropdown: a click outside closes it.
  useEffect(() => {
    if (!placesOpen || !isDesktop()) return
    const onDown = (e) => {
      if (!e.target.closest?.('.places, .places-btn, .toast-region')) setPlacesOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [placesOpen])

  const selectFromPlaces = (p) => {
    select(p)
    if (isDesktop()) setPlacesOpen(false)
  }

  const cells = overview.cells
  const raw = cells.length
    ? cells.reduce(
        (acc, c) => ({
          lo: c.weather.temperature < acc.lo.weather.temperature ? c : acc.lo,
          hi: c.weather.temperature > acc.hi.weather.temperature ? c : acc.hi,
        }),
        { lo: cells[0], hi: cells[0] },
      )
    : null
  const extremes = raw && {
    lo: { ...raw.lo, name: nearestName(raw.lo.lat, raw.lo.lon) },
    hi: { ...raw.hi, name: nearestName(raw.hi.lat, raw.hi.lon) },
  }
  const openSpot = (c) => select({ lat: c.lat, lon: c.lon, source: 'search' })
  const layoutKey = `${selected ? selected.id : '-'}|${placesOpen}|${places.length}|${!!overview.error}|${legendOpen}|${chipOpen}|${hour}`

  return (
    <div className={`app ${selected ? 'has-panel' : ''} ${placesOpen ? 'places-open' : ''}`}>
      <a href="#places-title" className="skip-link">
        Skip to my places
      </a>
      <h1 className="sr-only">Weather Explorer</h1>
      <main className="stage">
        <WeatherMap
          selected={selected}
          places={places}
          placesWeather={placesWeather}
          unit={unit}
          onSelect={select}
          onSummary={setOverview}
          reducedMotion={reducedMotion}
          layoutKey={layoutKey}
          probeHidden={!!selected && !isDesktop()}
        />

        <header className="topbar">
          <div className="brand" aria-hidden="true" data-obstacle>
            Weather<span> Explorer</span>
          </div>
          <SearchBox onSelect={select} unit={unit} />
          <div className="topbar__tools">
            <button
              type="button"
              className="round-btn mobile-only"
              onClick={locateMe}
              disabled={geoBusy}
              aria-label={geoBusy ? 'Locating…' : 'My location'}
              title="My location"
              data-obstacle
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <circle cx="8" cy="8" r="5.5" />
                <circle cx="8" cy="8" r="1.8" fill="currentColor" />
              </svg>
            </button>
            <button type="button" className="pill desktop-only" onClick={locateMe} disabled={geoBusy} data-obstacle>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <circle cx="8" cy="8" r="5.5" />
                <circle cx="8" cy="8" r="1.8" fill="currentColor" />
              </svg>
              {geoBusy ? 'Locating…' : 'My location'}
            </button>
            <div className="seg seg--pill desktop-only" role="group" aria-label="Temperature unit" data-obstacle>
              {['C', 'F'].map((u) => (
                <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}>
                  °{u}
                  <span className="sr-only">{u === 'C' ? ' Celsius' : ' Fahrenheit'}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="round-btn mobile-only"
              onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
              aria-label={
                unit === 'C' ? 'Temperature unit: Celsius. Switch to Fahrenheit' : 'Temperature unit: Fahrenheit. Switch to Celsius'
              }
              data-obstacle
            >
              °{unit}
            </button>
            <button
              type="button"
              className={`pill places-btn desktop-only ${placesOpen ? 'is-open' : ''}`}
              aria-expanded={placesOpen}
              aria-controls="places-pop"
              onClick={() => setPlacesOpen((o) => !o)}
              data-obstacle
            >
              <span aria-hidden="true" className="places-btn__star">
                ★
              </span>
              My places
              <span className="places-btn__count">{places.length}</span>
              <span aria-hidden="true" className="places-btn__caret">
                {placesOpen ? '▴' : '▾'}
              </span>
            </button>
          </div>
        </header>

        <div className="mapbar mobile-only">
          <LegendChip open={chipOpen} onToggle={() => setChipOpen((o) => !o)} />
          <LayersMenu />
        </div>

        <div className="desktop-only">
          <LegendCard
            open={legendOpen}
            onToggle={() => setLegendOpen((o) => !o)}
            extremes={extremes}
            unit={unit}
            hour={hour}
            onOpenSpot={openSpot}
          />
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {extremes &&
            `Coldest in view ${extremes.lo.name} ${formatTemp(extremes.lo.weather.temperature, unit, { withUnit: true })}; warmest ${extremes.hi.name} ${formatTemp(extremes.hi.weather.temperature, unit, { withUnit: true })}.`}
        </p>

        {overview.error && (
          <div className="paused glass" role="status" aria-live="polite">
            <strong>The weather layer is paused</strong>
            <span>{overview.error.message} The map still works, and you can still search.</span>
          </div>
        )}

        <PlacesBar
          places={places}
          weather={placesWeather}
          selectedId={selected?.id}
          unit={unit}
          open={placesOpen}
          onToggle={() => setPlacesOpen((o) => !o)}
          onSelect={selectFromPlaces}
          onRemove={removePlace}
          extremes={extremes}
          onOpenSpot={openSpot}
          hour={hour}
        />

        <TimeSlider
          hour={hour}
          onHour={(h) => {
            setPlaying(false)
            setHour(h)
          }}
          playing={playing}
          onTogglePlay={togglePlay}
          reducedMotion={reducedMotion}
        />

        {selected && (
          <DetailPanel
            location={selected}
            unit={unit}
            isSaved={isSaved}
            places={places}
            placesWeather={placesWeather}
            onToggleSave={toggleSave}
            onClose={() => setSelected(null)}
            onShare={share}
            hour={hour}
          />
        )}

        <div className="toast-region" role="status" aria-live="polite">
          {toast && (
            <div className={`toast ${toast.kind === 'error' ? 'toast--error' : ''}`}>
              <span>{toast.text}</span>
              {toast.undo && (
                <button type="button" className="toast__action" onClick={toast.undo}>
                  Undo
                </button>
              )}
              {toast.kind === 'error' && (
                <button type="button" className="toast__close" aria-label="Dismiss message" onClick={() => setToast(null)}>
                  <span aria-hidden="true">✕</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
