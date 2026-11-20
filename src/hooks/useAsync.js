import { useEffect, useState } from 'react'

/**
 * Runs an async loader whenever `key` changes and tracks loading / error.
 * Results from an older key are ignored, so fast clicking never shows the
 * weather of a previous place.
 */
export function useAsync(loader, key) {
  const [state, setState] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    if (key == null) return
    let active = true
    loader()
      .then((data) => active && setState({ key, data, error: null }))
      .catch((error) => active && setState({ key, data: null, error }))
    return () => {
      active = false
    }
  }, [key])

  const settled = state.key === key
  return {
    data: settled ? state.data : null,
    error: settled ? state.error : null,
    loading: key != null && !settled,
  }
}
