// components/TaskListSection.jsx — Phase 9
//
// CHANGES FROM PHASE 8:
//   - Receives isLoading prop → shows skeleton cards during first fetch
//   - onDelete and onStatusChange now call API mutations via context dispatch
//     (the component API is unchanged — it still just calls the same functions)
//   - TaskRow wraps Link — clicking navigates to /tasks/:id (unchanged)
//
// WHY THE COMPONENT LOOKS ALMOST IDENTICAL:
// This is the power of the service layer + context pattern.
// The API migration happened in TaskContext and taskApi.js.
// TaskListSection doesn't know or care whether tasks come from
// localStorage, a REST API, or a WebSocket — it just renders what it receives.

import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useTasks, useTaskDispatch } from '../context/TaskContext'
import FilterBar from './FilterBar'
import Section from './Section'
import StatusBadge from './StatusBadge'
import PriorityIndicator from './PriorityIndicator'
import useRenderCount from '../hooks/useRenderCount'

// ─── Skeleton Card — shown while tasks are loading ───────────────────────────
// A skeleton mimics the shape of a real card with an animated shimmer.
// Better UX than a spinner: user understands what's loading.
function SkeletonCard() {
  return (
    <div className="task-card skeleton-card" aria-hidden="true">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-subtitle" />
    </div>
  )
}

// ─── TaskRow — a single task displayed as a clickable card ───────────────────
const TaskRow = memo(function TaskRow({
  id, title, status, priority, phase, onDelete, onStatusChange
}) {
  const renderCount = useRenderCount()
  const STATUS_CYCLE = ['todo', 'in-progress', 'done']

  function handleStatusClick(e) {
    e.preventDefault()     // stop Link navigation
    e.stopPropagation()
    const idx = STATUS_CYCLE.indexOf(status)
    onStatusChange(id, STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length])
  }

  function handleDelete(e) {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm('Delete this task?')) onDelete(id)
  }

  return (
    // The whole card is a Link — clicking anywhere navigates to detail page
    <Link to={`/tasks/${id}`} className={`task-card task-card-${status}`}>
      <div className="task-card-header">
        <h3 className="task-title">{title}</h3>
        <div className="task-card-actions">
          {/* e.preventDefault + stopPropagation prevents the Link from firing */}
          <button className="status-cycle-btn" onClick={handleStatusClick} title="Cycle status">
            <StatusBadge status={status} />
          </button>
          <button className="btn-delete" onClick={handleDelete} title="Delete" aria-label="Delete task">✕</button>
        </div>
      </div>
      <div className="task-card-footer">
        <span className="task-phase">Phase {phase}</span>
        <PriorityIndicator level={priority} />
        {import.meta.env.DEV && (
          <span className="render-count" title="Render count">renders: {renderCount}</span>
        )}
      </div>
    </Link>
  )
})

// ─── TaskListSection ──────────────────────────────────────────────────────────

function TaskListSection({ activeFilter, onFilterChange, isLoading = false }) {
  const { visibleTasks }                 = useTasks()
  const { deleteTask, updateTaskStatus } = useTaskDispatch()

  const filtered = activeFilter === 'all'
    ? visibleTasks
    : visibleTasks.filter(t => t.status === activeFilter)

  return (
    <Section title="My Tasks" count={filtered.length}>
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />

      <div className="task-grid">
        {/* Loading state — show 4 skeleton cards on first fetch */}
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No tasks match this filter.</p>
          </div>
        ) : (
          filtered.map(task => (
            <TaskRow
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              status={task.status}
              priority={task.priority}
              phase={task.phase}
              onDelete={deleteTask}
              onStatusChange={updateTaskStatus}
            />
          ))
        )}
      </div>
    </Section>
  )
}

export default TaskListSection
