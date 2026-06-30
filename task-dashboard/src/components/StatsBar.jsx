// StatsBar.jsx — Phase 6: Wrapped with React.memo.
// All props are primitives (numbers) → memo comparison is always reliable.
// StatsBar should ONLY re-render when the actual counts change.
// With memo: a filter change in App will NOT cause StatsBar to re-render —
// because total/done/inProgress/todo are unchanged when only the filter changes.
//
// PROPS RECEIVED:
//   total       (number) — total task count
//   done        (number) — completed tasks
//   inProgress  (number) — in-progress tasks
//   todo        (number) — not started tasks

import { memo } from 'react'

const StatsBar = memo(function StatsBar({ total, done, inProgress, todo }) {
  return (
    <div className="stats-bar">
      <div className="stat-item">
        <span className="stat-value">{total}</span>
        <span className="stat-label">Total</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value stat-done">{done}</span>
        <span className="stat-label">Done</span>
      </div>
      <div className="stat-item">
        <span className="stat-value stat-progress">{inProgress}</span>
        <span className="stat-label">In Progress</span>
      </div>
      <div className="stat-item">
        <span className="stat-value stat-todo">{todo}</span>
        <span className="stat-label">To Do</span>
      </div>
    </div>
  )
})

export default StatsBar
