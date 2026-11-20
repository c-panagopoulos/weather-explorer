import { useEffect, useId, useRef, useState } from 'react'
import { searchPlaces } from '../api/openMeteo.js'
import { placeLabel } from '../utils/format.js'

const MIN_CHARS = 2
const DEBOUNCE_MS = 300

// Accessible autocomplete following the WAI-ARIA combobox pattern:
// arrow keys move through results, Enter picks one, Escape closes the list.
export default function SearchBox({ onSelect }) {
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
      setOpen(false)
      setActive(-1)
    }
  }

  const expanded = open && results.length > 0

  return (
    <div className="search" role="search">
      <label htmlFor={id} className="sr-only">
        Search for a city or place
      </label>
      <span className="search__icon" aria-hidden="true">
        🔍
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck="false"
        placeholder="Search a city…"
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
        {results.map((r, i) => (
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
            <span className="search__name">{r.name}</span>
            <span className="search__meta">{[r.admin1, r.country].filter(Boolean).join(', ')}</span>
          </li>
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  )
}
