import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion.js'

/**
 * Counts a number up (or down) to `value` with an ease-out curve.
 * Our own small implementation of the idea behind React Bits' CountUp,
 * without extra dependencies.
 *
 * Screen readers only get the final value: the animated copy is aria-hidden
 * and the real value sits in sr-only text. With reduced motion the final
 * value is shown immediately.
 */
export default function CountUp({ value, format, duration = 600, from = 0 }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? value : from)
  const current = useRef(reduced ? value : from)

  useEffect(() => {
    if (reduced || value == null) {
      current.current = value
      setShown(value)
      return
    }
    const start = performance.now()
    const a = current.current ?? value
    let raf
    const step = (t) => {
      const k = Math.min(1, (t - start) / duration)
      const v = a + (value - a) * (1 - (1 - k) ** 3)
      current.current = v
      setShown(v)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, reduced, duration])

  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}
