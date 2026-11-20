import { formatTemp } from '../utils/format.js'
import { SCALE_GRADIENT } from '../data/palette.js'
import Glow from './bits/Glow.jsx'

/**
 * Desktop: a collapsible card at the bottom left that explains the colour
 * field and links to the coldest and warmest spot in view.
 * Mobile: a small "i" button that expands a compact Colder ▬ Warmer chip.
 */
export function LegendCard({ open, onToggle, extremes, unit, hour, onOpenSpot }) {
  return (
    <Glow
      role="region"
      className={`legend-card glass ${open ? 'is-open' : ''}`}
      aria-labelledby="legend-title"
      data-obstacle=""
    >
      <div className="legend-card__head">
        <button
          type="button"
          className="info-btn"
          aria-expanded={open}
          aria-controls="legend-body"
          aria-label={open ? 'Hide legend' : 'Show legend'}
          onClick={onToggle}
        >
          i
        </button>
        <h2 id="legend-title">Temperature</h2>
        <span className="legend-card__when">{hour ? `+${hour} h` : 'Now'}</span>
      </div>
      {open && (
        <div id="legend-body" className="legend-card__body">
          <span className="legend-card__bar" aria-hidden="true" style={{ background: SCALE_GRADIENT }} />
          <div className="legend-card__ends">
            <span>Colder {formatTemp(-10, unit)}</span>
            <span>
              {formatTemp(32, unit)} Warmer
            </span>
          </div>
          <p className="legend-card__explain">
            Blue means colder air, red means warmer. Values come from a grid of points and are blended in between.
          </p>
          <hr />
          <span className="legend-card__label">In view right now</span>
          {extremes ? (
            ['lo', 'hi'].map((k) => {
              const e = extremes[k]
              const word = k === 'lo' ? 'Coldest' : 'Warmest'
              return (
                <button
                  key={k}
                  type="button"
                  className="legend-card__spot"
                  onClick={() => onOpenSpot(e)}
                  aria-label={`${word} in view: ${e.name}, ${formatTemp(e.weather.temperature, unit, { withUnit: true })}. Open the forecast.`}
                >
                  <span className="legend-card__word">{word}</span>
                  <strong>{formatTemp(e.weather.temperature, unit)}</strong>
                  <span className="legend-card__place">{e.name} →</span>
                </button>
              )
            })
          ) : (
            <span className="legend-card__explain">Loading the weather layer…</span>
          )}
        </div>
      )}
    </Glow>
  )
}

export function LegendChip({ open, onToggle }) {
  return (
    <div className="legend-chip" data-obstacle>
      <button
        type="button"
        className="info-btn info-btn--glass"
        aria-expanded={open}
        aria-controls="legend-chip"
        aria-label={open ? 'Hide colour legend' : 'Show colour legend'}
        onClick={onToggle}
      >
        i
      </button>
      {open && (
        <span id="legend-chip" className="legend-chip__body glass" role="note">
          <span>Colder</span>
          <span className="legend-chip__bar" aria-hidden="true" style={{ background: SCALE_GRADIENT }} />
          <span>Warmer</span>
        </span>
      )}
    </div>
  )
}
