import { useLayoutEffect, useRef } from 'react'

/**
 * FLIP animation for a list (our own small version of the idea behind React
 * Bits' Animated List, which is a selectable listbox and does not fit rows
 * that contain buttons). New items slide in; items that move after a sort
 * glide to their new place. Children need a data-key attribute.
 */
export function useFlip(listRef, keys, disabled) {
  const previous = useRef(null)
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const items = [...list.children]
    const now = new Map(items.map((el) => [el.dataset.key, el.getBoundingClientRect().top]))
    const before = previous.current
    if (before && !disabled) {
      const ease = 'cubic-bezier(0.2, 0.7, 0.2, 1)'
      for (const el of items) {
        const from = before.get(el.dataset.key)
        const to = now.get(el.dataset.key)
        if (from == null) {
          el.animate([{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: ease })
        } else if (Math.abs(from - to) > 1) {
          el.animate([{ transform: `translateY(${from - to}px)` }, { transform: 'none' }], { duration: 380, easing: ease })
        }
      }
    }
    previous.current = now
  }, [keys])
}
