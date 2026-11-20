import { SCALE_GRADIENT } from '../data/palette.js'
import { LAYERS } from '../data/layers.js'
import Glow from './bits/Glow.jsx'

/**
 * Desktop: a collapsible card at the bottom left that explains the colour
 * field and links to the coldest and warmest spot in view.
 * Mobile: a small "i" button that expands a compact Colder ▬ Warmer chip.
 */
export function LegendCard({ open, onToggle, extremes, unit, hour, onOpenSpot, layer = 'temperature' }) {
  const L = LAYERS[layer]
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
        <h2 id="legend-title">{L.label}</h2>
        <span className="legend-card__when">{hour ? `+${hour} h` : 'Now'}</span>
      </div>
      {open && (
        <div id="legend-body" className="legend-card__body">
          <span className="legend-card__bar" aria-hidden="true" style={{ background: L.gradient ?? SCALE_GRADIENT }} />
          <div className="legend-card__ends">
            <span>
              {L.words[0]} {L.format(L.min, unit)}
            </span>
            <span>
              {L.format(L.max, unit)} {L.words[1]}
            </span>
          </div>
          <p className="legend-card__explain">{L.explain}</p>
          <hr />
          <span className="legend-card__label">In view right now</span>
          {extremes ? (
            ['lo', 'hi'].map((k) => {
              const e = extremes[k]
              const word = L.extremes[k === 'lo' ? 0 : 1]
              const v = L.value(e.weather)
              return (
                <button
                  key={k}
                  type="button"
                  className="legend-card__spot"
                  onClick={() => onOpenSpot(e)}
                  aria-label={`${word} in view: ${e.name}, ${L.formatLong(v, unit)}. Open the forecast.`}
                >
                  <span className="legend-card__word">{word}</span>
                  <strong>{L.format(v, unit)}</strong>
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

export function LegendChip({ open, onToggle, layer = 'temperature' }) {
  const L = LAYERS[layer]
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
          <span>{L.words[0]}</span>
          <span className="legend-chip__bar" aria-hidden="true" style={{ background: L.gradient ?? SCALE_GRADIENT }} />
          <span>{L.words[1]}</span>
        </span>
      )}
    </div>
  )
}
