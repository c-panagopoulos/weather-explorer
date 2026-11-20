import { useEffect, useState } from 'react'
import ElasticSlider from './bits/ElasticSlider.jsx'

// "+N h" on the left; on the right the resulting time on the viewer's clock.
export const hourLabel = (hour) => (hour ? `+${hour} h` : 'Now')

const clock = (date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/**
 * A slim timeline for the next 24 hours, using React Bits' Elastic Slider
 * (role="slider" with arrow keys, Page Up/Down, Home/End, aria-valuetext and
 * a visible focus ring). Left: how many hours ahead; right: what time that
 * is on your clock. It moves the whole picture: the map colours, city and
 * place values, the probe and the open place.
 */
export default function TimeSlider({ hour, onHour, playing, onTogglePlay, reducedMotion }) {
  // Keep the clock current while the page stays open.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => clearInterval(id)
  }, [])
  const at = (h) => clock(new Date(now + h * 3600 * 1000))

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
        ariaLabel="Forecast time"
        formatValue={(v) => {
          const h = Math.round(v)
          return h ? `${h} hours from now, ${at(h)} your time` : `Now, ${at(0)}`
        }}
        // A literal colour: the component parses it on a canvas, which cannot read CSS variables.
        rangeColor="#f0a35a"
        maxStretch={24}
      />
      <time className="slider__time" aria-hidden="true" title="Your local time">
        {at(hour)}
      </time>
    </div>
  )
}
