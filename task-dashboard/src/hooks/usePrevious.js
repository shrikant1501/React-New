// hooks/usePrevious.js
// Returns the value from the PREVIOUS render.
// This is a classic useRef pattern — one of the most cited examples in
// React documentation for demonstrating the "mutable box" nature of useRef.
//
// HOW IT WORKS:
//   1. useRef holds the "previous" value — persists across renders
//   2. useEffect (no deps) runs AFTER every render — after the component
//      has rendered with the NEW value, we store it as the "previous"
//      for NEXT time
//   3. So during render: ref.current still holds the OLD value (from last render)
//      After render: ref.current is updated to the CURRENT value
//
// WHY useRef NOT useState?
//   If we used useState to store the previous value, updating it would
//   trigger ANOTHER re-render, which would trigger another update,
//   causing an infinite loop. useRef mutates without re-rendering — perfect.
//
// EXAMPLE:
//   Render 1: value=5  → usePrevious returns undefined (nothing stored yet)
//   Render 2: value=8  → usePrevious returns 5
//   Render 3: value=12 → usePrevious returns 8

import { useRef, useEffect } from 'react'

function usePrevious(value) {
  const ref = useRef(undefined)

  // useEffect with no deps array runs after EVERY render.
  // At the time this effect runs, the component has already rendered with 'value'.
  // We store 'value' NOW so it becomes the "previous" for the NEXT render.
  useEffect(() => {
    ref.current = value
  })

  // Return the ref's CURRENT content BEFORE the effect runs.
  // During the current render, ref.current still holds the value from
  // the PREVIOUS render — which is exactly what we want to return.
  return ref.current
}

export default usePrevious
