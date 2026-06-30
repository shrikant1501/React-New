// TaskCard.jsx — Phase 12: clsx added for conditional classNames.
//
// WHAT IS clsx?
// A tiny utility (~200 bytes) that builds className strings from conditions.
// It replaces verbose template literals and ternary expressions with a clean API.
//
// BEFORE (template literal ternary):
//   className={`task-card task-card-${status} ${isSelected ? 'selected' : ''}`}
//
// AFTER (clsx):
//   className={clsx('task-card', `task-card-${status}`, isSelected && 'selected')}
//
// clsx accepts: strings, objects { 'class': boolean }, arrays, falsy values
// Falsy values (false, null, undefined, 0) are silently ignored — no empty strings.
//
// clsx vs cx vs classnames:
//   clsx       — lightweight, tree-shakeable, ESM-first (we use this)
//   classnames — older, same API, slightly larger
//   cx         — Emotion's bound version (CSS-in-JS only)

import { memo } from 'react'
import clsx from 'clsx'
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
    // clsx: first arg is always-on base class, second is dynamic status variant.
    // Equivalent to: `task-card task-card-${status}` — but scales cleanly
    // when you add more conditions (e.g., isSelected, isDragging, isHighlighted).
    <div className={clsx('task-card', `task-card-${status}`)}>

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
