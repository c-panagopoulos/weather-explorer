import { useEffect, useState } from 'react'

// useState that survives a page reload. Storage can be unavailable
// (private mode, blocked cookies), so every access is guarded and the
// app keeps working with in-memory state.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw == null ? initialValue : JSON.parse(raw)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore: storage is a convenience, not a requirement.
    }
  }, [key, value])

  return [value, setValue]
}
