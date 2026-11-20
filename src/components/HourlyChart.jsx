import { describeWeather } from '../utils/weatherCodes.js'
import { formatHour, formatTemp, toUnit } from '../utils/format.js'

const W = 404
const H = 140
const PAD = { left: 16, right: 16, top: 30, bottom: 26 }

// Catmull-Rom spline through the points, written as cubic Bézier segments.
function smoothPath(pts) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

/**
 * 24-hour temperature curve with rain-chance bars. Labels are HTML spans laid
 * over the SVG (so they scale with the text, not the drawing). Screen-reader
 * users get a summary label plus the same data as a real table.
 */
export default function HourlyChart({ hours, unit, hour = 0 }) {
  if (!hours.length) return null
  const temps = hours.map((h) => toUnit(h.temperature, unit))
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const span = Math.max(max - min, 1)
  const innerH = H - PAD.top - PAD.bottom
  const x = (i) => PAD.left + (i / (hours.length - 1)) * (W - PAD.left - PAD.right)
  const y = (t) => PAD.top + (1 - (t - min) / span) * innerH
  const pts = temps.map((t, i) => [x(i), y(t)])
  const lo = temps.indexOf(min)
  const hi = temps.indexOf(max)
  const labels = hours.map((h, i) => ({ h, i })).filter(({ i }) => i % 4 === 0)

  return (
    <section className="hourly" aria-labelledby="hourly-title">
      <h3 id="hourly-title" className="eyebrow">
        Next 24 hours
      </h3>
      <div className="hourly__plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="hourly__svg"
          role="img"
          aria-label={`Temperature over the next 24 hours, from ${formatTemp(hours[lo].temperature, unit, { withUnit: true })} at ${formatHour(hours[lo].time)} to ${formatTemp(hours[hi].temperature, unit, { withUnit: true })} at ${formatHour(hours[hi].time)}.`}
        >
          {hours.map((h, i) => {
            const barH = ((h.precipitationProbability ?? 0) / 100) * innerH * 0.55
            return (
              <rect key={h.time} className="hourly__rain" x={x(i) - 2} y={H - PAD.bottom - barH} width="4" height={barH} rx="2" />
            )
          })}
          <path key={hours[0].time + temps.join(',')} d={smoothPath(pts)} className="hourly__line draw" pathLength="1" />
          {labels.map(({ i }) => (
            <circle key={i} cx={pts[i][0]} cy={pts[i][1]} r="2.5" className="hourly__dot" />
          ))}
          {hour > 0 && hour < pts.length && (
            <line x1={pts[hour][0]} x2={pts[hour][0]} y1={PAD.top - 8} y2={H - PAD.bottom} className="hourly__marker" />
          )}
          <circle cx={pts[0][0]} cy={pts[0][1]} r="6" className="hourly__now" />
        </svg>
        {labels.map(({ h, i }) => (
          <span key={`t${i}`} aria-hidden="true" className="hourly__temp" style={{ left: `${(pts[i][0] / W) * 100}%`, top: `${((pts[i][1] - 6) / H) * 100}%` }}>
            {Math.round(temps[i])}°
          </span>
        ))}
        {labels.map(({ h, i }) => (
          <span key={`h${i}`} aria-hidden="true" className="hourly__hour" style={{ left: `${(pts[i][0] / W) * 100}%` }}>
            {i === 0 ? 'Now' : formatHour(h.time)}
          </span>
        ))}
      </div>
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
