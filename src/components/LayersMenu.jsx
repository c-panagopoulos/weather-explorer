import { useEffect, useRef, useState } from 'react'

const LAYERS = [
  {
    id: 'temperature',
    label: 'Temperature',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="7" y="2" width="4" height="10" rx="2" />
        <circle cx="9" cy="13.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: 'rain',
    label: 'Rain',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M9 2.5C9 2.5 4 8.5 4 11.5a5 5 0 0 0 10 0C14 8.5 9 2.5 9 2.5Z" />
      </svg>
    ),
  },
  {
    id: 'wind',
    label: 'Wind',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M2 6h10" />
        <path d="M2 10h13" />
        <path d="M2 14h8" />
      </svg>
    ),
  },
]

/**
 * Mobile map-layer menu. Only Temperature exists today: Rain and Wind need
 * hourly grid data from the API, so they are shown disabled with a reason.
 */
export default function LayersMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div className="layers" ref={ref} data-obstacle>
      <button
        type="button"
        className={`layers__btn glass ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-controls="layers-menu"
        aria-label="Map layer: Temperature. Change layer"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 2 16 6 9 10 2 6Z" />
          <path d="M2 9.5 9 13.5 16 9.5" />
        </svg>
        <span aria-hidden="true" className="layers__caret">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div id="layers-menu" className="layers__menu glass" role="group" aria-label="Map layer">
          <ul>
            {LAYERS.map((l) => {
              const available = l.id === 'temperature'
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    aria-pressed={available}
                    aria-disabled={!available}
                    aria-describedby={available ? undefined : 'layers-note'}
                    onClick={() => available && setOpen(false)}
                  >
                    {l.icon}
                    {l.label}
                  </button>
                </li>
              )
            })}
          </ul>
          <p id="layers-note" className="layers__note">
            Rain and wind layers are coming soon.
          </p>
        </div>
      )}
    </div>
  )
}
