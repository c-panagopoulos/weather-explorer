import { describeWeather } from '../utils/weatherCodes.js'
import { formatHour, formatTemp, toUnit } from '../utils/format.js'

const W = 640
const H = 170
const PAD = { top: 28, right: 12, bottom: 34, left: 12 }

/**
 * 24-hour temperature line with rain-chance bars. The SVG is a visual
 * summary; screen-reader users get the same data as a real table.
 */
export default function HourlyChart({ hours, unit }) {
  if (!hours.length) return null
  const temps = hours.map((h) => toUnit(h.temperature, unit))
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const span = Math.max(max - min, 1)
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (i) => PAD.left + (i / (hours.length - 1)) * innerW
  const y = (t) => PAD.top + (1 - (t - min) / span) * innerH * 0.8
  const line = temps.map((t, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(t).toFixed(1)}`).join(' ')
  const area = `${line} L${x(hours.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`
  const hi = temps.indexOf(max)
  const lo = temps.indexOf(min)

  return (
    <section className="hourly" aria-labelledby="hourly-title">
      <h3 id="hourly-title">Next 24 hours</h3>
      <div className="hourly__scroll">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="hourly__svg"
          role="img"
          aria-label={`Temperature over the next 24 hours, from ${formatTemp(hours[lo].temperature, unit, { withUnit: true })} at ${formatHour(hours[lo].time)} to ${formatTemp(hours[hi].temperature, unit, { withUnit: true })} at ${formatHour(hours[hi].time)}.`}
        >
          {hours.map((h, i) => {
            const barH = ((h.precipitationProbability ?? 0) / 100) * (innerH * 0.6)
            return (
              <rect
                key={`p${h.time}`}
                className="hourly__rain"
                x={x(i) - 4}
                y={H - PAD.bottom - barH}
                width="8"
                height={barH}
                rx="2"
              />
            )
          })}
          <path d={area} className="hourly__area" />
          <path d={line} className="hourly__line" />
          {hours.map((h, i) =>
            i % 3 === 0 ? (
              <g key={h.time}>
                <circle cx={x(i)} cy={y(temps[i])} r="3.5" className="hourly__dot" />
                <text x={x(i)} y={y(temps[i]) - 9} textAnchor="middle" className="hourly__temp">
                  {Math.round(temps[i])}°
                </text>
                <text x={x(i)} y={H - PAD.bottom + 16} textAnchor="middle" className="hourly__label">
                  {i === 0 ? 'Now' : formatHour(h.time)}
                </text>
                <text x={x(i)} y={H - 4} textAnchor="middle" className="hourly__icon">
                  {describeWeather(h.code, h.isDay).icon}
                </text>
              </g>
            ) : null,
          )}
        </svg>
      </div>
      <p className="hourly__legend">
        <span className="legend-swatch legend-swatch--line" aria-hidden="true" /> Temperature
        <span className="legend-swatch legend-swatch--rain" aria-hidden="true" /> Chance of rain
      </p>
      <table className="sr-only">
        <caption>Hourly forecast</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Conditions</th>
            <th scope="col">Temperature</th>
            <th scope="col">Chance of rain</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h.time}>
              <th scope="row">{formatHour(h.time)}</th>
              <td>{describeWeather(h.code, h.isDay).label}</td>
              <td>{formatTemp(h.temperature, unit, { withUnit: true })}</td>
              <td>{h.precipitationProbability ?? 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
