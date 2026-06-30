// hooks/useRenderCount.js
// Returns the number of times the calling component has rendered.
// Development-only tool — helps VISUALISE when memoisation is working.
//
// HOW IT WORKS:
//   useRef stores a mutable counter — incrementing it doesn't trigger re-renders.
//   We increment during render (before effects), so the count is always current.
//
// IMPORTANT: This counts renders, not commits.
//   In StrictMode (development), React double-renders. So you'll see counts
//   like 2, 4, 6... instead of 1, 2, 3. This is expected and correct.
//
// USAGE:
//   const renderCount = useRenderCount()
//   // In dev: display it to prove a component is or isn't re-rendering

import { useRef } from 'react'

function useRenderCount() {
  const count = useRef(0)
  count.current += 1   // increment during render — safe because no re-render triggered
  return count.current
}

export default useRenderCount
