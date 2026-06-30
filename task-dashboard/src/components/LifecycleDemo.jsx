// LifecycleDemo.jsx
// A teaching component that makes the useEffect lifecycle visible via console logs.
// This is NOT part of the production app — it is a learning tool.
//
// Open your browser DevTools Console and interact with the app to see:
//   - MOUNT: fires once when this component first appears
//   - UPDATE: fires when 'count' changes
//   - CLEANUP (update): fires just before the next UPDATE effect run
//   - UNMOUNT (cleanup): fires when component disappears from DOM
//
// HOW TO USE:
//   - Toggle the checkbox in the dashboard to mount/unmount this component
//   - Click the counter button to trigger updates
//   - Watch the console to see the exact lifecycle sequence

import { useState, useEffect } from 'react'

function LifecycleDemo() {
  const [count, setCount] = useState(0)

  // ── Effect 1: Runs on every render (no deps array) ──────────────────────
  useEffect(() => {
    console.log('%c[Effect 1 — no deps] Runs after EVERY render', 'color: #94a3b8')
  })

  // ── Effect 2: Runs once on mount (empty deps array) ─────────────────────
  useEffect(() => {
    console.log('%c[Effect 2 — mount] Component MOUNTED', 'color: #22c55e; font-weight: bold')

    return () => {
      console.log('%c[Effect 2 — cleanup] Component UNMOUNTED', 'color: #ef4444; font-weight: bold')
    }
  }, [])
  // [] = run once on mount, cleanup only on unmount

  // ── Effect 3: Runs when 'count' changes ─────────────────────────────────
  useEffect(() => {
    console.log(`%c[Effect 3 — count dep] count changed to: ${count}`, 'color: #6366f1')

    return () => {
      console.log(`%c[Effect 3 — cleanup] cleaning up before count changes again (was: ${count})`, 'color: #f59e0b')
    }
  }, [count])
  // [count] = run on mount AND whenever count changes
  // cleanup runs BEFORE the next time this effect runs

  return (
    <div className="lifecycle-demo">
      <h4>🔬 Lifecycle Visualiser</h4>
      <p className="lifecycle-hint">Open DevTools Console and interact below:</p>
      <div className="lifecycle-controls">
        <span className="lifecycle-count">Count: {count}</span>
        <button className="btn btn-primary" onClick={() => setCount(c => c + 1)}>
          Increment
        </button>
      </div>
    </div>
  )
}

export default LifecycleDemo
