import { useEffect, useState } from 'react'
import SpotlightCard from './SpotlightCard.jsx'
import { useReducedMotion } from '../../hooks/useReducedMotion.js'

const HOVER = '(hover: hover) and (pointer: fine)'
const LIGHT = '(prefers-color-scheme: light)'

function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const onChange = () => setMatch(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return match
}

/**
 * A panel with React Bits' SpotlightCard glow that follows the cursor.
 * Only on pointer devices and without reduced motion; otherwise a plain div.
 * The panel keeps its own glass surface and shadow (passed as CSS variables).
 */
export default function Glow({ className, children, surface = 'var(--glass)', shadow = 'none', ...rest }) {
  const canHover = useMedia(HOVER)
  const light = useMedia(LIGHT)
  const reduced = useReducedMotion()
  if (!canHover || reduced) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    )
  }
  return (
    <SpotlightCard
      className={`${className} glow`}
      theme={light ? 'light' : 'dark'}
      // A small, soft glow in the app's accent colour rather than white.
      spotlightColor={light ? '#b85a14' : '#f0a35a'}
      spotlightSize={140}
      intensity={0.22}
      borderGlow={0.35}
      style={{ '--spotlight-card-surface': surface, '--spotlight-card-shadow': shadow }}
      {...rest}
    >
      {children}
    </SpotlightCard>
  )
}
