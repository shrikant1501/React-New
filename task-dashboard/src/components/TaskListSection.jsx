// components/TaskListSection.jsx — Phase 8: filter driven by URL query params.
//
// CHANGE FROM PHASE 7:
// Previously: read activeFilter from FilterContext (React state)
// Now:        receives activeFilter + onFilterChange as props from TasksPage
//
// WHY THE CHANGE?
// The filter is now URL state (useSearchParams in TasksPage).
// URL state should be owned by the page/route component — it's page-level state.
// TaskListSection is a component within the page — it receives the filter
// as a prop, just like any other piece of data it needs to display.
//
// This is an important architectural decision:
//   Context: app-wide state that many unrelated components need
//   URL state (useSearchParams): page-level state that should be bookmarkable
//   Props: data passed from parent to child within a page
//   Local state: data only one component needs
//
// PROPS RECEIVED:
//   activeFilter   (string)   — current filter value from URL
//   onFilterChange (function) — updates URL query param

import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useTasks, useTaskDispatch } from '../context/TaskContext'
import FilterBar from './FilterBar'
import Section from './Section'
import StatusBadge from './StatusBadge'
import PriorityIndicator from './PriorityIndicator'
import useRenderCount from '../hooks/useRenderCount'

// Inline TaskCard row — links to the detail page
const TaskRow = memo(function TaskRow({
  id, title, status, priority, phase, onDelete, onStatusChange
}) {
  const renderCount = useRenderCount()
  const STATUS_CYCLE = ['todo', 'in-progress', 'done']

  function handleStatusClick(e) {
    e.preventDefault()  // prevent navigation — we handle the click
    e.stopPropagation()
    const idx = STATUS_CYCLE.indexOf(status)
    onStatusChange(id, STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length])
  }

  function handleDelete(e) {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm(`Delete task?`)) onDelete(id)
  }

  return (
    <Link to={`/tasks/${id}`} className={`task-card task-card-${status}`}>
      <div className="task-card-header">
        <h3 className="task-title">{title}</h3>
        <div className="task-card-actions">
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

function TaskListSection({ activeFilter, onFilterChange }) {
  const { visibleTasks }                 = useTasks()
  const { deleteTask, updateTaskStatus } = useTaskDispatch()

  // Compute filtered tasks from context's visibleTasks based on URL filter
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
        {filtered.length === 0 ? (
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
