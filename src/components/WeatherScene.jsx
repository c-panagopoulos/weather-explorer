import { useMemo } from 'react'
import { fetchCityPhoto } from '../api/places.js'
import { useAsync } from '../hooks/useAsync.js'

// How many animated particles each effect uses.
const PARTICLES = { drizzle: 40, rain: 70, thunder: 80, snow: 45 }

// Deterministic pseudo-random numbers so particles don't jump on re-render.
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function Particles({ effect }) {
  const count = PARTICLES[effect] ?? 0
  const items = useMemo(() => {
    const rand = seeded(count + 7)
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      style: {
        left: `${rand() * 100}%`,
        animationDelay: `${-rand() * 3}s`,
        animationDuration: `${effect === 'snow' ? 4 + rand() * 5 : 0.5 + rand() * 0.5}s`,
        opacity: 0.35 + rand() * 0.6,
        '--drift': `${(rand() - 0.5) * 60}px`,
        '--size': `${effect === 'snow' ? 3 + rand() * 5 : 1}px`,
      },
    }))
  }, [count, effect])
  if (!count) return null
  const className = effect === 'snow' ? 'flake' : 'drop'
  return items.map((p) => <span key={p.key} className={className} style={p.style} />)
}

/**
 * A photo of the place (from Wikipedia) with the current weather drawn on
 * top: rain, snow, fog, drifting clouds, sunshine or lightning. Purely
 * decorative for screen readers except the photo's alt text; animations
 * stop when the user prefers reduced motion (handled in CSS).
 */
export default function WeatherScene({ place, effect, isDay, children }) {
  const photoKey = place?.name ? `${place.name}|${place.admin1}|${place.country}` : null
  const { data: photo } = useAsync(() => fetchCityPhoto(place), photoKey)

  return (
    <figure className={`scene scene--${effect} ${isDay ? 'scene--day' : 'scene--night'}`}>
      {photo ? (
        <img
          className="scene__photo"
          src={photo.src}
          alt={`${photo.title}${photo.description ? ` – ${photo.description}` : ''}`}
          loading="lazy"
        />
      ) : (
        <div className="scene__photo scene__photo--fallback" />
      )}
      <div className="scene__fx" aria-hidden="true">
        <div className="scene__tint" />
        {effect === 'clear' && isDay && <div className="sun" />}
        {(effect === 'cloudy' || effect === 'drizzle' || effect === 'rain' || effect === 'thunder') && (
          <>
            <div className="cloud cloud--1" />
            <div className="cloud cloud--2" />
          </>
        )}
        {effect === 'fog' && (
          <>
            <div className="fog fog--1" />
            <div className="fog fog--2" />
          </>
        )}
        {effect === 'thunder' && <div className="lightning" />}
        <Particles effect={effect} />
      </div>
      <div className="scene__content">{children}</div>
      {photo && (
        <figcaption className="scene__credit">
          Photo:{' '}
          <a href={photo.pageUrl} target="_blank" rel="noreferrer">
            Wikipedia<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </figcaption>
      )}
    </figure>
  )
}
