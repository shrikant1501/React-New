// TaskCard.jsx — Phase 6: Wrapped with React.memo for performance optimisation.
//
// WHY React.memo HERE?
// TaskCard is rendered once per task — currently 6+ instances.
// When App re-renders (e.g., filter changes), ALL TaskCards re-rendered by default.
// Since a filter change doesn't affect task data, those re-renders are wasted.
// React.memo skips re-renders when all props are shallowly equal.
//
// FOR React.memo TO WORK, the parent (App) must provide STABLE prop references:
//   - title, description, status, priority, phase → primitives → stable ✅
//   - id → primitive → stable ✅
//   - onDelete, onStatusChange → functions → UNSTABLE unless useCallback ✅ (done in App)
//
// RENDER COUNT INDICATOR (development only):
// We use useRenderCount to display how many times this component has rendered.
// This makes it VISUALLY obvious when memoisation is working vs not working.
// Without optimisation: all 6 cards increment on every App re-render.
// With optimisation: only the changed card increments.

import { memo } from 'react'
import StatusBadge from './StatusBadge'
import PriorityIndicator from './PriorityIndicator'
import useRenderCount from '../hooks/useRenderCount'

const STATUS_CYCLE = ['todo', 'in-progress', 'done']

// memo() wraps the component. React will shallow-compare props before re-rendering.
// If all props pass Object.is() comparison → render is SKIPPED.
// Note: memo wraps the whole component, not individual renders inside it.
const TaskCard = memo(function TaskCard({
  id, title, description, status, priority, phase, onDelete, onStatusChange
}) {
  // ── Development: render count tracker ─────────────────────────────────────
  // This hook uses useRef internally — incrementing doesn't trigger re-renders.
  // Remove this in production (or hide behind an env variable check).
  const renderCount = useRenderCount()

  function handleStatusClick() {
    const currentIndex = STATUS_CYCLE.indexOf(status)
    const nextIndex    = (currentIndex + 1) % STATUS_CYCLE.length
    onStatusChange(id, STATUS_CYCLE[nextIndex])
  }

  function handleDelete() {
    if (window.confirm(`Delete "${title}"?`)) {
      onDelete(id)
    }
  }

  return (
    <div className={`task-card task-card-${status}`}>

      <div className="task-card-header">
        <h3 className="task-title">{title}</h3>

        <div className="task-card-actions">
          <button
            className="status-cycle-btn"
            onClick={handleStatusClick}
            title="Click to cycle status"
          >
            <StatusBadge status={status} />
          </button>

          <button
            className="btn-delete"
            onClick={handleDelete}
            title="Delete task"
            aria-label={`Delete task: ${title}`}
          >
            ✕
          </button>
        </div>
      </div>

      <p className="task-description">{description}</p>

      <div className="task-card-footer">
        <span className="task-phase">Phase {phase}</span>
        <PriorityIndicator level={priority} />

        {/* Render counter — visible proof of memoisation working */}
        {import.meta.env.DEV && (
          <span
            className="render-count"
            title="Number of times this component has rendered"
          >
            renders: {renderCount}
          </span>
        )}
        {/*
          import.meta.env.DEV — Vite's way of checking if we're in development.
          This entire span is REMOVED from the production bundle by Vite's tree-shaker.
          It only appears during development — exactly what we want.
        */}
      </div>

    </div>
  )
})

export default TaskCard
