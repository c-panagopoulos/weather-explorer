import { useEffect, useState } from 'react'
import { fetchForecast, pointKey } from '../api/openMeteo.js'
import { describeWeather } from '../utils/weatherCodes.js'
import { formatTemp } from '../utils/format.js'
import { chipColors, tempCss } from '../data/palette.js'
import PlacesChart from './PlacesChart.jsx'
import { hourLabel } from './TimeSlider.jsx'

const SORTS = [
  ['warm', 'Warmest', (a, b) => (b.w?.temperature ?? -999) - (a.w?.temperature ?? -999)],
  ['cold', 'Coldest', (a, b) => (a.w?.temperature ?? 999) - (b.w?.temperature ?? 999)],
  ['name', 'A–Z', (a, b) => a.name.localeCompare(b.name)],
  ['added', 'Added', () => 0],
]

/**
 * The user's own collection of places, compared on one shared temperature
 * scale. Current values come from the shared batched request; today's
 * low/high and rain chance come from each place's (cached) forecast, loaded
 * only while the list is open.
 */
export default function PlacesBar({
  places,
  weather,
  selectedId,
  unit,
  open,
  onToggle,
  onSelect,
  onRemove,
  extremes,
  onOpenSpot,
  hour,
}) {
  const [sort, setSort] = useState('warm')
  const [view, setView] = useState('list')
  const [forecasts, setForecasts] = useState({})

  const placesKey = places.map((p) => pointKey(p)).join('|')
  useEffect(() => {
    if (!open || !places.length) return
    let active = true
    Promise.all(places.map((p) => fetchForecast(p.lat, p.lon).then((f) => [pointKey(p), f]).catch(() => null))).then(
      (list) => active && setForecasts(Object.fromEntries(list.filter(Boolean))),
    )
    return () => {
      active = false
    }
  }, [open, placesKey])

  const rows = places
    .map((p) => {
      const key = pointKey(p)
      const f = forecasts[key]
      const now = weather.get(key)
      // With the time slider moved, values come from the place's hourly forecast.
      const at = hour > 0 && f?.hourly[hour]
      const w = at ? { temperature: at.temperature, code: at.code, isDay: at.isDay } : now
      return { ...p, w, today: f?.daily[0], hours: f?.hourly }
    })
    .sort(SORTS.find((s) => s[0] === sort)[2])

  const withToday = rows.filter((r) => r.today)
  const gMin = withToday.length ? Math.min(...withToday.map((r) => r.today.min)) : 0
  const gMax = withToday.length ? Math.max(...withToday.map((r) => r.today.max)) : 1
  const pos = (t) => ((t - gMin) / Math.max(gMax - gMin, 1)) * 100

  const byTemp = rows.filter((r) => r.w).sort((a, b) => b.w.temperature - a.w.temperature)
  const warmest = byTemp[0]
  const coldest = byTemp[byTemp.length - 1]

  return (
    <section className={`places ${open ? 'is-open' : ''}`} aria-labelledby="places-title" data-obstacle>
      <span className="places__grip" aria-hidden="true" />
      <div className="places__head">
        <div className="places__heading">
          <h2 id="places-title" tabIndex={-1}>
            My places <span className="places__count">{places.length}</span>
          </h2>
          {!open && warmest && (
            <p className="places__summary">
              Warmest {warmest.name} {formatTemp(warmest.w.temperature, unit)} · Coldest {coldest.name}{' '}
              {formatTemp(coldest.w.temperature, unit)}
            </p>
          )}
        </div>
        <div className="places__tools">
          {open && places.length > 0 && (
            <div className="seg seg--view" role="group" aria-label="Show places as">
              {[
                ['list', 'List'],
                ['chart', 'Chart'],
              ].map(([k, label]) => (
                <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="btn-outline" aria-expanded={open} aria-controls="places-body" onClick={onToggle}>
            {open ? 'Hide' : places.length ? 'Compare' : 'Show'}
          </button>
        </div>
      </div>

      {open && (
        <div id="places-body" className="places__body">
          {places.length > 1 && (
            <div className="seg seg--sort" role="group" aria-label="Sort places">
              {SORTS.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {places.length === 0 ? (
            <div className="places__empty">
              <p>
                No places yet. Search for a city or tap the map, then choose <strong>Save</strong>. Your places line up
                here for comparing.
              </p>
              {extremes && (
                <div className="places__starts">
                  <span className="places__starts-label">Or start with the extremes in view</span>
                  <button type="button" className="btn-outline" onClick={() => onOpenSpot(extremes.hi)}>
                    Warmest · {extremes.hi.name} {formatTemp(extremes.hi.weather.temperature, unit)}
                  </button>
                  <button type="button" className="btn-outline" onClick={() => onOpenSpot(extremes.lo)}>
                    Coldest · {extremes.lo.name} {formatTemp(extremes.lo.weather.temperature, unit)}
                  </button>
                </div>
              )}
            </div>
          ) : view === 'chart' ? (
            <PlacesChart
              series={rows.filter((r) => r.hours).map((r) => ({ id: r.id, name: r.name, hours: r.hours }))}
              selectedId={selectedId}
              unit={unit}
              hour={hour}
            />
          ) : (
            <>
              <div className="prow-head" aria-hidden="true">
                <span>Place</span>
                <span>{hour ? `At ${hourLabel(hour).slice(-5)}` : 'Now'}</span>
                <span className="prow-head__range">Today low – high</span>
                <span className="prow-head__rain">Rain</span>
              </div>
              <ul className="prows">
                {rows.map((p) => {
                  const chip = p.w ? chipColors(p.w.temperature) : null
                  const cond = p.w ? describeWeather(p.w.code, p.w.isDay).label : 'Loading…'
                  const t = p.today
                  const current = p.id === selectedId
                  return (
                    <li key={p.id} className={`prow ${current ? 'is-current' : ''}`}>
                      <button
                        type="button"
                        className="prow__main"
                        onClick={() => onSelect({ ...p, source: 'place' })}
                        aria-current={current ? 'true' : undefined}
                      >
                        <span className="prow__place">
                          <span className="prow__name">{p.name}</span>
                          <span className="prow__cond">{cond}</span>
                        </span>
                        <span className="chip-temp" style={chip ? { background: chip.bg, color: chip.fg } : undefined}>
                          <span className="sr-only">{hour ? `At ${hourLabel(hour)} ` : 'Now '}</span>
                          {p.w ? formatTemp(p.w.temperature, unit) : '–'}
                        </span>
                        <span className="prow__range">
                          <span className="range__lo">
                            <span className="sr-only">Low </span>
                            {t ? formatTemp(t.min, unit) : '–'}
                          </span>
                          <span className="range__bar" aria-hidden="true">
                            {t && (
                              <>
                                <span
                                  className="range__fill"
                                  style={{
                                    left: `${pos(t.min)}%`,
                                    width: `${Math.max(pos(t.max) - pos(t.min), 4)}%`,
                                    background: `linear-gradient(90deg, ${tempCss(t.min)}, ${tempCss(t.max)})`,
                                  }}
                                />
                                {p.w && (
                                  <span
                                    className="range__tick"
                                    style={{ left: `${pos(Math.min(t.max, Math.max(t.min, p.w.temperature)))}%` }}
                                  />
                                )}
                              </>
                            )}
                          </span>
                          <span className="range__hi">
                            <span className="sr-only">High </span>
                            {t ? formatTemp(t.max, unit) : '–'}
                          </span>
                        </span>
                        <span className="prow__rain">
                          <span className="sr-only">Chance of rain </span>
                          {t ? `${t.precipitationProbability ?? 0}%` : '–'}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="prow__remove"
                        onClick={() => onRemove(p.id)}
                        aria-label={`Remove ${p.name} from my places`}
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}
