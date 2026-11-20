import { formatTemp, toUnit } from '../utils/format.js'

const COLORS = ['#f0a35a', '#7ab8ff', '#a7d86e', '#e58fd0', '#5fd4c4', '#f2d36b']
const W = 444
const H = 240
const LEFT = 34
const RIGHT = 336
const TOP = 8
const BOTTOM = H - 24

/**
 * Every saved place's next 24 hours in one chart. Names sit at the end of
 * each line, pushed apart so they keep at least 14px between them. Labels
 * are HTML spans over the SVG; the SVG carries a text summary.
 */
export default function PlacesChart({ series, selectedId, unit, hour }) {
  if (!series.length) return <p className="places__note">Loading forecasts…</p>
  const all = series.flatMap((s) => s.hours.map((h) => toUnit(h.temperature, unit)))
  const min = Math.floor(Math.min(...all) / 5) * 5
  const max = Math.ceil(Math.max(...all) / 5) * 5
  const x = (i) => LEFT + (i / 23) * (RIGHT - LEFT)
  const y = (v) => TOP + (1 - (v - min) / Math.max(max - min, 1)) * (BOTTOM - TOP)

  const lines = series.map((s, i) => {
    const vals = s.hours.slice(0, 24).map((h) => toUnit(h.temperature, unit))
    const isSel = s.id === selectedId
    return {
      id: s.id,
      name: s.name,
      color: COLORS[i % COLORS.length],
      d: vals.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
      end: [x(vals.length - 1), y(vals[vals.length - 1])],
      labelY: y(vals[vals.length - 1]),
      width: isSel ? 3 : 2,
      opacity: selectedId && !isSel ? 0.6 : 1,
      lo: Math.round(Math.min(...vals)),
      hi: Math.round(Math.max(...vals)),
    }
  })
  // Push end labels apart (at least 14px) from top to bottom.
  const ordered = [...lines].sort((a, b) => a.labelY - b.labelY)
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].labelY - ordered[i - 1].labelY < 14) ordered[i].labelY = ordered[i - 1].labelY + 14
  }

  const grid = []
  for (let v = min; v <= max; v += 5) grid.push(v)
  const ticks = [0, 6, 12, 18, 23]
  const pct = (px, total) => `${(px / total) * 100}%`

  return (
    <div className="pchart">
      <p className="places__note">Temperature, next 24 hours{hour ? ' · dashed line = slider time' : ''}</p>
      <div className="pchart__plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Temperature over the next 24 hours: ${lines
            .map((l) => `${l.name} ${l.lo}° to ${l.hi}°${unit}`)
            .join(', ')}.`}
        >
          {grid.map((v) => (
            <line key={v} x1={LEFT} x2={RIGHT} y1={y(v)} y2={y(v)} className="pchart__grid" />
          ))}
          {hour > 0 && <line x1={x(hour)} x2={x(hour)} y1={TOP - 2} y2={BOTTOM} className="pchart__hour" />}
          {lines.map((l) => (
            <g key={l.id}>
              <path d={l.d} fill="none" stroke={l.color} strokeWidth={l.width} opacity={l.opacity} strokeLinejoin="round" />
              <circle cx={l.end[0]} cy={l.end[1]} r="3" fill={l.color} />
            </g>
          ))}
        </svg>
        {grid.map((v) => (
          <span key={`g${v}`} aria-hidden="true" className="pchart__ytick" style={{ left: pct(LEFT - 6, W), top: pct(y(v), H) }}>
            {formatTemp(unit === 'F' ? ((v - 32) * 5) / 9 : v, unit)}
          </span>
        ))}
        {ticks.map((i) => (
          <span key={`x${i}`} aria-hidden="true" className="pchart__xtick" style={{ left: pct(x(i), W) }}>
            {i ? `+${i} h` : 'Now'}
          </span>
        ))}
        {lines.map((l) => (
          <span
            key={`l${l.id}`}
            aria-hidden="true"
            className="pchart__label"
            style={{ left: pct(RIGHT + 8, W), top: pct(l.labelY, H), color: l.color }}
          >
            {l.name}
          </span>
        ))}
      </div>
    </div>
  )
}
