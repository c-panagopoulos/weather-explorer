import { useEffect, useId, useRef, useState } from 'react'
import { searchPlaces, pointKey } from '../api/openMeteo.js'
import { getCached } from '../api/cache.js'
import { describeWeather } from '../utils/weatherCodes.js'
import { formatTemp, placeLabel } from '../utils/format.js'

const MIN_CHARS = 2
const DEBOUNCE_MS = 300

// Accessible autocomplete following the WAI-ARIA combobox pattern:
// arrow keys move through results, Enter picks one, Escape first closes the
// list and then clears the text.
export default function SearchBox({ onSelect, unit }) {
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_CHARS) {
      setResults([])
      setStatus('')
      return
    }
    let current = true
    // Wait until the user stops typing before calling the API.
    const timer = setTimeout(async () => {
      try {
        const found = await searchPlaces(q)
        if (!current) return
        setResults(found)
        setActive(-1)
        setOpen(true)
        setStatus(found.length ? `${found.length} places found. Use the arrow keys to choose.` : 'No places found.')
      } catch (err) {
        if (current) setStatus(err.message)
      }
    }, DEBOUNCE_MS)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [query])

  function choose(place) {
    onSelect({ ...place, source: 'search' })
    setQuery('')
    setResults([])
    setOpen(false)
    setStatus(`Showing weather for ${placeLabel(place)}.`)
    inputRef.current?.blur()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open && results.length) setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const pick = results[active] ?? results[0]
      if (open && pick) {
        e.preventDefault()
        choose(pick)
      }
    } else if (e.key === 'Escape') {
      if (open && results.length) {
        setOpen(false)
        setActive(-1)
      } else {
        setQuery('')
      }
    }
  }

  const expanded = open && results.length > 0

  return (
    <div className="search" role="search" data-obstacle>
      <label htmlFor={id} className="sr-only">
        Search for a city or place
      </label>
      <svg className="search__icon" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="8" cy="8" r="5.5" />
        <path d="M12.2 12.2 16 16" />
      </svg>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck="false"
        placeholder="Search a city or place"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <ul id={listId} role="listbox" aria-label="Search results" className="search__list" hidden={!expanded}>
        {results.map((r, i) => {
          // Only show weather we already have: no extra requests for search results.
          const w = getCached(`current:${pointKey(r)}`)
          return (
            <li
              key={r.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="search__option"
              // mousedown fires before the input's blur, so the click is not lost
              onMouseDown={(e) => {
                e.preventDefault()
                choose(r)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="search__text">
                <span className="search__name">{r.name}</span>
                <span className="search__meta">{[r.admin1, r.country].filter(Boolean).join(', ')}</span>
              </span>
              {w && (
                <span className="search__wx">
                  <span className="search__cond">{describeWeather(w.code, w.isDay).label}</span>
                  <span className="search__temp">{formatTemp(w.temperature, unit)}</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  )
}
