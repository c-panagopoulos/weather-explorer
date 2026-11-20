import ElasticSlider from './bits/ElasticSlider.jsx'

// "+N h" rather than a clock time: the viewer's clock and each place's local time differ.
export const hourLabel = (hour) => (hour ? `+${hour} h` : 'Now')

/**
 * A slim timeline for the next 24 hours, using React Bits' Elastic Slider
 * (role="slider" with arrow keys, Page Up/Down, Home/End, aria-valuetext and
 * a visible focus ring). It drives My places and the open place (their
 * forecasts are already cached); the map field shows current conditions,
 * because hourly grid data would need a bigger API request.
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
      <span className="slider__label" aria-hidden="true">
        {hourLabel(hour)}
      </span>
      <ElasticSlider
        className="slider__elastic"
        value={hour}
        startingValue={0}
        maxValue={23}
        isStepped
        stepSize={1}
        onChange={(v) => onHour(Math.round(v))}
        valuePosition="none"
        ariaLabel="Forecast time for My places and the open place"
        formatValue={(v) => (Math.round(v) ? `${Math.round(v)} hours from now` : 'Now')}
        // A literal colour: the component parses it on a canvas, which cannot read CSS variables.
        rangeColor="#f0a35a"
        maxStretch={24}
      />
    </div>
  )
}
