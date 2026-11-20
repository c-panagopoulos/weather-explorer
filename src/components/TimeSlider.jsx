// "+N h" rather than a clock time: the viewer's clock and each place's local time differ.
export const hourLabel = (hour) => (hour ? `+${hour} h` : 'Now')

/**
 * A slim timeline for the next 24 hours. It drives My places and the open
 * place (their forecasts are already cached); the map field shows current
 * conditions, because hourly grid data would need a bigger API request.
 */
export default function TimeSlider({ hour, onHour, playing, onTogglePlay, reducedMotion }) {
  return (
    <div className="slider glass" data-obstacle>
      {!reducedMotion && (
        <button type="button" className="slider__play" aria-pressed={playing} onClick={onTogglePlay}>
          <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
          {playing ? 'Pause' : 'Play'}
        </button>
      )}
      <label htmlFor="hour-slider" className="slider__label">
        {hourLabel(hour)}
        <span className="sr-only"> · forecast time for My places and the open place</span>
      </label>
      <input
        id="hour-slider"
        type="range"
        min="0"
        max="23"
        step="1"
        value={hour}
        aria-valuetext={hour ? `${hour} hours from now` : 'Now'}
        onChange={(e) => onHour(Number(e.target.value))}
      />
    </div>
  )
}
