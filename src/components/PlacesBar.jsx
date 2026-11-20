import { useEffect, useState } from 'react'
import { fetchCurrentBatch, pointKey } from '../api/openMeteo.js'
import { describeWeather } from '../utils/weatherCodes.js'
import { formatTemp, tempColor } from '../utils/format.js'

const SORTS = {
  added: { label: 'Order added', fn: () => 0 },
  warm: { label: 'Warmest first', fn: (a, b) => (b.w?.temperature ?? -999) - (a.w?.temperature ?? -999) },
  cold: { label: 'Coldest first', fn: (a, b) => (a.w?.temperature ?? 999) - (b.w?.temperature ?? 999) },
  name: { label: 'A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
}

/**
 * The user's own collection of places, side by side, so they can compare
 * conditions at a glance. All current temperatures come from one batched
 * request (and the shared cache).
 */
export default function PlacesBar({ places, selectedId, unit, onSelect, onRemove }) {
  const [weather, setWeather] = useState(new Map())
  const [sort, setSort] = useState('added')

  const placesKey = places.map((p) => pointKey(p)).join('|')
  useEffect(() => {
    if (!places.length) return
    let active = true
    fetchCurrentBatch(places)
      .then((w) => active && setWeather(w))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [placesKey])

  const items = places.map((p) => ({ ...p, w: weather.get(pointKey(p)) })).sort(SORTS[sort].fn)

  return (
    <section className="places" aria-labelledby="places-title">
      <div className="places__head">
        <h2 id="places-title">
          My places <span className="places__count">({places.length})</span>
        </h2>
        {places.length > 1 && (
          <label className="places__sort">
            <span className="sr-only">Sort places</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {places.length === 0 ? (
        <p className="places__empty">
          Save places with <span aria-hidden="true">☆</span>
          <span className="sr-only">the save button</span> to build your own weather picture and compare them here.
        </p>
      ) : (
        <ul className="places__list">
          {items.map((p) => {
            const d = p.w ? describeWeather(p.w.code, p.w.isDay) : null
            const color = p.w ? tempColor(p.w.temperature) : null
            return (
              <li key={p.id} className={`place-card ${p.id === selectedId ? 'is-active' : ''}`}>
                <button
                  type="button"
                  className="place-card__main"
                  onClick={() => onSelect({ ...p, source: 'place' })}
                  aria-current={p.id === selectedId ? 'true' : undefined}
                >
                  <span className="place-card__name">{p.name}</span>
                  <span className="place-card__country">{p.country}</span>
                  {p.w ? (
                    <span className="place-card__weather">
                      <span aria-hidden="true">{d.icon}</span>
                      <span className="place-card__temp" style={{ background: color.bg, color: color.fg }}>
                        {formatTemp(p.w.temperature, unit)}
                      </span>
                      <span className="sr-only">{d.label}</span>
                    </span>
                  ) : (
                    <span className="place-card__weather">…</span>
                  )}
                </button>
                <button
                  type="button"
                  className="place-card__remove"
                  onClick={() => onRemove(p.id)}
                  aria-label={`Remove ${p.name}`}
                  title="Remove"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
