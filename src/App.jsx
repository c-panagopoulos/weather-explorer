import { useCallback, useEffect, useState } from 'react'
import SearchBox from './components/SearchBox.jsx'
import WeatherMap from './components/WeatherMap.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import PlacesBar from './components/PlacesBar.jsx'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useReducedMotion } from './hooks/useReducedMotion.js'
import { reverseGeocodeOwnPosition } from './api/places.js'
import { pointKey } from './api/openMeteo.js'
import { formatCoords, formatTemp } from './utils/format.js'

// Stable id for a place: geocoding id when we have one, otherwise its rounded coordinates.
const placeId = (loc) => (loc.id && !String(loc.id).startsWith('pt:') ? String(loc.id) : `pt:${pointKey(loc)}`)

export default function App() {
  const [selected, setSelected] = useState(null)
  const [places, setPlaces] = useLocalStorage('weather-explorer:places', [])
  const [unit, setUnit] = useLocalStorage('weather-explorer:unit', 'C')
  const [overview, setOverview] = useState({ cells: [], error: null })
  const [geoStatus, setGeoStatus] = useState({ state: 'idle', message: '' })
  const reducedMotion = useReducedMotion()

  const select = useCallback((loc) => setSelected({ ...loc, id: placeId(loc) }), [])

  const isSaved = selected ? places.some((p) => p.id === selected.id) : false

  function toggleSave() {
    if (!selected) return
    if (isSaved) {
      setPlaces(places.filter((p) => p.id !== selected.id))
      return
    }
    const fallbackName = selected.source === 'geo' ? 'My location' : formatCoords(selected.lat, selected.lon)
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

  function locateMe() {
    if (!navigator.geolocation) {
      setGeoStatus({ state: 'error', message: 'Your browser does not support location.' })
      return
    }
    setGeoStatus({ state: 'loading', message: 'Finding your location…' })
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude
        const lon = coords.longitude
        select({ lat, lon, source: 'geo' })
        setGeoStatus({ state: 'idle', message: '' })
        // Put a real name on it if we can (this also enables the city photo).
        const named = await reverseGeocodeOwnPosition(lat, lon)
        if (named) {
          setSelected((cur) => (cur?.source === 'geo' && cur.lat === lat ? { ...cur, ...named } : cur))
        }
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. You can still search for your city.'
            : 'Could not get your location. Try searching for your city instead.'
        setGeoStatus({ state: 'error', message })
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  }

  // Escape closes the details panel (unless focus is inside the search box).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.target.closest?.('.search')) setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const temps = overview.cells.map((c) => c.weather.temperature)
  const min = temps.length ? Math.min(...temps) : null
  const max = temps.length ? Math.max(...temps) : null

  return (
    <div className={`app ${selected ? 'has-panel' : ''}`}>
      <a href="#places-title" className="skip-link">
        Skip to my places
      </a>
      <header className="topbar">
        <h1 className="brand">
          <span aria-hidden="true">🌍</span> Weather Explorer
        </h1>
        <SearchBox onSelect={select} />
        <div className="topbar__tools">
          <button type="button" className="btn" onClick={locateMe} disabled={geoStatus.state === 'loading'}>
            <span aria-hidden="true">📍</span>
            <span className="btn__text">{geoStatus.state === 'loading' ? 'Locating…' : 'My location'}</span>
          </button>
          <div className="unit-toggle" role="group" aria-label="Temperature unit">
            {['C', 'F'].map((u) => (
              <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}>
                °{u}
                <span className="sr-only">{u === 'C' ? ' Celsius' : ' Fahrenheit'}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="toast-region" role="status" aria-live="polite">
        {geoStatus.message && (
          <p className={`toast ${geoStatus.state === 'error' ? 'toast--error' : ''}`}>
            {geoStatus.message}
            {geoStatus.state === 'error' && (
              <button
                type="button"
                className="toast__close"
                aria-label="Dismiss message"
                onClick={() => setGeoStatus({ state: 'idle', message: '' })}
              >
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </p>
        )}
      </div>

      <main className="layout">
        <div className="stage">
          <WeatherMap
            selected={selected}
            places={places}
            unit={unit}
            onSelect={select}
            onSummary={setOverview}
            reducedMotion={reducedMotion}
          />
          <div className="overview" role="status" aria-live="polite">
            {overview.error ? (
              <span className="overview__error">{overview.error.message}</span>
            ) : min != null ? (
              <>
                <span className="overview__scale" aria-hidden="true" />
                <span>
                  In view: <strong>{formatTemp(min, unit)}</strong> to <strong>{formatTemp(max, unit)}</strong>
                  <span className="overview__hint"> · tap anywhere to explore</span>
                </span>
              </>
            ) : (
              <span>Loading the weather overview…</span>
            )}
          </div>
          <PlacesBar
            places={places}
            selectedId={selected?.id}
            unit={unit}
            onSelect={select}
            onRemove={(id) => setPlaces(places.filter((p) => p.id !== id))}
          />
        </div>

        {selected && (
          <DetailPanel
            location={selected}
            unit={unit}
            isSaved={isSaved}
            onToggleSave={toggleSave}
            onClose={() => setSelected(null)}
          />
        )}
      </main>
    </div>
  )
}
