// Hour labels relative to the viewer's clock ("Now", "Sat 14:00").
export function hourLabel(hour) {
  if (!hour) return 'Now'
  const d = new Date(Date.now() + hour * 3600 * 1000)
  const sameDay = d.toDateString() === new Date().toDateString()
  const day = sameDay ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })
  return `${day} ${String(d.getHours()).padStart(2, '0')}:00`
}

/**
 * Scrub through the next 24 hours. It drives My places and the open place
 * (their forecasts are already cached); the map field shows current
 * conditions, because hourly grid data would need a bigger API request.
 */
export default function TimeSlider({ hour, onHour, playing, onTogglePlay, reducedMotion }) {
  const label = hourLabel(hour)
  return (
    <div className="slider glass" data-obstacle>
      {!reducedMotion && (
        <button type="button" className="slider__play" aria-pressed={playing} onClick={onTogglePlay}>
          <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
          {playing ? 'Pause' : 'Play'}
        </button>
      )}
      <div className="slider__main">
        <div className="slider__labels">
          <label htmlFor="hour-slider">{label}</label>
          <span>{hour ? `+${hour} h · My places and the open place` : 'Drag to see the next 24 hours'}</span>
        </div>
        <input
          id="hour-slider"
          type="range"
          min="0"
          max="23"
          step="1"
          value={hour}
          aria-valuetext={hour ? `${label}, ${hour} hours from now` : 'Now'}
          onChange={(e) => onHour(Number(e.target.value))}
        />
      </div>
    </div>
  )
}
