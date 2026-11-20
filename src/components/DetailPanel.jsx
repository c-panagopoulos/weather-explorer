import { useEffect, useRef } from 'react'
import { fetchForecast } from '../api/openMeteo.js'
import { useAsync } from '../hooks/useAsync.js'
import { describeWeather } from '../utils/weatherCodes.js'
import {
  compassDirection,
  formatCoords,
  formatDay,
  formatHour,
  formatTemp,
  formatWind,
  placeLabel,
} from '../utils/format.js'
import WeatherScene from './WeatherScene.jsx'
import HourlyChart from './HourlyChart.jsx'

export default function DetailPanel({ location, unit, isSaved, onToggleSave, onClose }) {
  const headingRef = useRef(null)
  const key = `${location.lat.toFixed(2)},${location.lon.toFixed(2)}`
  const { data, error, loading } = useAsync(() => fetchForecast(location.lat, location.lon), key)

  // Move focus to the new place so keyboard and screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [key])

  const title = location.name ?? (location.source === 'geo' ? 'Your location' : 'Selected point')
  const subtitle = location.name
    ? [location.admin1 !== location.name ? location.admin1 : '', location.country].filter(Boolean).join(', ')
    : formatCoords(location.lat, location.lon)

  const current = data?.current
  const weather = current ? describeWeather(current.code, current.isDay) : null
  const today = data?.daily[0]

  return (
    <aside className="panel" aria-labelledby="panel-title" aria-busy={loading}>
      <div className="panel__grip" aria-hidden="true" />
      <WeatherScene place={location.name ? location : null} effect={weather?.effect ?? 'clear'} isDay={current?.isDay ?? true}>
        <div className="panel__head">
          <div>
            <h2 id="panel-title" ref={headingRef} tabIndex={-1}>
              {location.source === 'geo' && <span aria-hidden="true">📍 </span>}
              {title}
            </h2>
            <p className="panel__sub">{subtitle}</p>
          </div>
          <div className="panel__actions">
            <button
              type="button"
              className="icon-btn"
              aria-pressed={isSaved}
              onClick={onToggleSave}
              aria-label={isSaved ? `Remove ${title} from my places` : `Save ${title} to my places`}
              title={isSaved ? 'Remove from my places' : 'Save to my places'}
            >
              <span aria-hidden="true">{isSaved ? '★' : '☆'}</span>
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details" title="Close">
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
        {current && (
          <div className="now">
            <span className="now__icon" aria-hidden="true">
              {weather.icon}
            </span>
            <span className="now__temp">{formatTemp(current.temperature, unit, { withUnit: true })}</span>
            <span className="now__label">
              {weather.label}
              {today && (
                <span className="now__range">
                  H {formatTemp(today.max, unit)} · L {formatTemp(today.min, unit)}
                </span>
              )}
            </span>
          </div>
        )}
      </WeatherScene>

      <div className="panel__body">
        {loading && <p className="panel__msg">Loading forecast…</p>}
        {error && (
          <p className="panel__msg panel__msg--error" role="alert">
            {error.message}
          </p>
        )}

        {data && (
          <>
            <dl className="stats">
              <div>
                <dt>Feels like</dt>
                <dd>{formatTemp(current.feelsLike, unit, { withUnit: true })}</dd>
              </div>
              <div>
                <dt>Humidity</dt>
                <dd>{current.humidity}%</dd>
              </div>
              <div>
                <dt>Wind</dt>
                <dd>
                  {formatWind(current.windSpeed, unit)} {compassDirection(current.windDirection)}
                </dd>
              </div>
              <div>
                <dt>Sunrise / sunset</dt>
                <dd>
                  {formatHour(today.sunrise)} / {formatHour(today.sunset)}
                </dd>
              </div>
            </dl>

            <HourlyChart hours={data.hourly} unit={unit} />

            <section aria-labelledby="daily-title">
              <h3 id="daily-title">7-day forecast</h3>
              <ul className="daily">
                {data.daily.map((d, i) => {
                  const w = describeWeather(d.code, true)
                  return (
                    <li key={d.date} className="daily__row">
                      <span className="daily__day">{formatDay(d.date, i)}</span>
                      <span className="daily__cond">
                        <span aria-hidden="true">{w.icon}</span> {w.label}
                      </span>
                      <span className="daily__rain">
                        <span className="sr-only">Chance of rain </span>
                        {d.precipitationProbability ?? 0}%
                      </span>
                      <span className="daily__temps">
                        <span className="sr-only">High </span>
                        <strong>{formatTemp(d.max, unit)}</strong>
                        <span className="sr-only">, low </span>
                        <span aria-hidden="true"> / </span>
                        {formatTemp(d.min, unit)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
            <p className="panel__tz">Local times shown in {data.timezone.replaceAll('_', ' ')}.</p>
          </>
        )}
      </div>

      {/* Announce the result once it arrives. */}
      <p className="sr-only" role="status" aria-live="polite">
        {data && `${location.name ? placeLabel(location) : title}: ${formatTemp(current.temperature, unit, { withUnit: true })}, ${weather.label}.`}
      </p>
    </aside>
  )
}
