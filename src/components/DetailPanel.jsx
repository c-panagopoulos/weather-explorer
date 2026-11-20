import { useEffect, useRef } from 'react'
import { fetchForecast, pointKey } from '../api/openMeteo.js'
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
  toUnit,
} from '../utils/format.js'
import { tempCss } from '../data/palette.js'
import { describeNearest, nearestPlace } from '../data/places.js'
import { atHour } from '../data/hourly.js'
import WeatherScene from './WeatherScene.jsx'
import CountUp from './bits/CountUp.jsx'
import Glow from './bits/Glow.jsx'
import HourlyChart from './HourlyChart.jsx'

// "2° warmer than Lisbon · 9° colder than Cairo": the closest warmer and colder saved places.
function compareLine(location, temperature, places, placesWeather, unit, hour) {
  const me = toUnit(temperature, unit)
  const others = places
    .filter((p) => p.id !== location.id)
    .map((p) => ({ name: p.name, w: atHour(placesWeather.get(pointKey(p)), hour) }))
    .filter((o) => o.w)
    .map((o) => ({ name: o.name, d: Math.round(me - toUnit(o.w.temperature, unit)) }))
  const same = others.find((o) => o.d === 0)
  const warmer = others.filter((o) => o.d > 0).sort((a, b) => a.d - b.d)[0]
  const colder = others.filter((o) => o.d < 0).sort((a, b) => b.d - a.d)[0]
  return [
    same && `Same as ${same.name}`,
    warmer && `${warmer.d}° warmer than ${warmer.name}`,
    colder && `${-colder.d}° colder than ${colder.name}`,
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ')
}

export default function DetailPanel({ location, unit, isSaved, places, placesWeather, onToggleSave, onClose, onShare, hour = 0 }) {
  const headingRef = useRef(null)
  const key = `${location.lat.toFixed(2)},${location.lon.toFixed(2)}`
  const { data, error, loading } = useAsync(() => fetchForecast(location.lat, location.lon), key)

  // Move focus to the new place so keyboard and screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [key])

  const title = location.name ?? (location.source === 'geo' ? 'Your location' : 'Selected point')
  const subtitle = location.name
    ? [location.admin1 !== location.name ? location.admin1 : '', location.country].filter(Boolean).join(', ') +
      (location.source === 'geo' ? ' · your location' : '')
    : describeNearest(location.lat, location.lon) || formatCoords(location.lat, location.lon)

  // Points picked on the map borrow the photo of the nearest city (within 150 km).
  const near = location.name ? null : nearestPlace(location.lat, location.lon)
  const photoPlace = location.name
    ? location
    : near && near.km < 150
      ? { name: near.place.name, admin1: '', country: near.place.country, nearby: true }
      : null

  const current = data?.current
  // With the time slider moved, the big number and condition show that hour.
  const at = hour > 0 ? data?.hourly[hour] : null
  const shown = at ?? current
  const weather = shown ? describeWeather(shown.code, shown.isDay) : null
  const today = data?.daily[0]
  const vs = shown ? compareLine(location, shown.temperature, places, placesWeather, unit, hour) : ''
  const atClock = new Date(Date.now() + hour * 3600 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const weekMin = data ? Math.min(...data.daily.map((d) => d.min)) : 0
  const weekMax = data ? Math.max(...data.daily.map((d) => d.max)) : 1
  const pos = (t) => ((t - weekMin) / Math.max(weekMax - weekMin, 1)) * 100

  return (
    <Glow
      className="panel"
      role="complementary"
      aria-labelledby="panel-title"
      aria-busy={loading}
      data-obstacle=""
      surface="var(--surface)"
      shadow="var(--shadow)"
    >
      <span className="panel__grip" aria-hidden="true" />
      <WeatherScene place={photoPlace} effect={weather?.effect ?? 'clear'} isDay={current ? current.isDay : null}>
        <div className="scene__top">
          <div className="scene__titles">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1}>
              {title}
            </h2>
            <p className="panel__sub">{subtitle}</p>
          </div>
          <div className="panel__actions">
            <button
              type="button"
              className={`btn-glass ${isSaved ? 'is-saved' : ''}`}
              aria-pressed={isSaved}
              onClick={onToggleSave}
              aria-label={isSaved ? `${title} is saved. Remove from my places` : `Save ${title} to my places`}
            >
              <span aria-hidden="true">{isSaved ? '★' : '☆'}</span>
              {isSaved ? 'Saved' : 'Save'}
            </button>
            <button type="button" className="btn-glass" onClick={onClose} aria-label="Close details">
              <span aria-hidden="true">✕</span>
              <span className="btn-glass__text" aria-hidden="true">
                Close
              </span>
            </button>
          </div>
        </div>

        {shown && (
          <div className="now">
            <span className="now__temp">
              <span aria-hidden="true">
                <CountUp
                  key={key}
                  mode="roll"
                  easing="spring"
                  to={Math.round(toUnit(shown.temperature, unit))}
                  duration={0.9}
                  trigger="load"
                  suffix="°"
                />
              </span>
              <span className="sr-only">
                {at ? `In ${hour} hours: ` : ''}
                {formatTemp(shown.temperature, unit, { withUnit: true })}
              </span>
            </span>
            <span className="now__meta">
              <span className="now__cond">{weather.label}</span>
              {today && (
                <span className="now__hl">
                  H {formatTemp(today.max, unit)} · L {formatTemp(today.min, unit)}
                </span>
              )}
              {vs && <span className="now__vs">{vs}</span>}
              {at && (
                <span className="now__at">
                  +{hour} h · {atClock} your time · now {formatTemp(current.temperature, unit)}
                </span>
              )}
            </span>
          </div>
        )}
        {data && <HourlyChart hours={data.hourly} unit={unit} hour={hour} />}
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
            <p className="legend">
              <span className="legend__item">
                <span className="legend__line" aria-hidden="true" /> Temperature
              </span>
              <span className="legend__item">
                <span className="legend__bar" aria-hidden="true" /> Chance of rain
              </span>
            </p>
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
                <dt>Sunrise–set</dt>
                <dd>
                  {formatHour(today.sunrise)}–{formatHour(today.sunset)}
                </dd>
              </div>
            </dl>

            <section aria-labelledby="daily-title">
              <h3 id="daily-title" className="eyebrow">
                7 days
              </h3>
              <ul className="daily anim-in anim-in--late">
                {data.daily.map((d, i) => (
                  <li key={d.date} className="daily__row">
                    <span className="daily__day">{formatDay(d.date, i)}</span>
                    <span className="daily__cond">{describeWeather(d.code, true).label}</span>
                    <span className="daily__rain">
                      <span className="sr-only">Chance of rain </span>
                      {d.precipitationProbability ?? 0}%
                    </span>
                    <span className="daily__lo">
                      <span className="sr-only">Low </span>
                      {formatTemp(d.min, unit)}
                    </span>
                    <span className="range__bar" aria-hidden="true">
                      <span
                        className="range__fill"
                        style={{
                          left: `${pos(d.min)}%`,
                          width: `${Math.max(pos(d.max) - pos(d.min), 4)}%`,
                          background: `linear-gradient(90deg, ${tempCss(d.min)}, ${tempCss(d.max)})`,
                        }}
                      />
                    </span>
                    <span className="daily__hi">
                      <span className="sr-only">High </span>
                      {formatTemp(d.max, unit)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <div className="panel__foot">
              <p className="panel__tz">Local times shown in {data.timezone.replaceAll('_', ' ')}.</p>
              <button type="button" className="btn-outline" onClick={onShare}>
                <span aria-hidden="true">↗</span> Share link
              </button>
            </div>
          </>
        )}
      </div>

      {/* Announce the result once it arrives. */}
      <p className="sr-only" role="status" aria-live="polite">
        {data &&
          `${location.name ? placeLabel(location) : title}: ${at ? `in ${hour} hours ` : ''}${formatTemp(shown.temperature, unit, { withUnit: true })}, ${weather.label}.`}
      </p>
    </Glow>
  )
}
