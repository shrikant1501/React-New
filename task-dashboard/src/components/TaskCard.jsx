// TaskCard.jsx — Phase 3: Now interactive.
// Added: delete button, clickable status badge to cycle status.
//
// PROPS RECEIVED:
//   id          (number)   — unique task identifier
//   title       (string)   — task title
//   description (string)   — task description
//   status      (string)   — "todo" | "in-progress" | "done"
//   priority    (string)   — "low" | "medium" | "high"
//   phase       (number)   — which learning phase this task belongs to
//   onDelete    (function) — callback: parent removes this task by id
//   onStatusChange (function) — callback: parent updates this task's status
//
// KEY CONCEPTS:
//   - Callback props for child→parent communication
//   - Event handling (onClick)
//   - No state here — this component is still presentational
//     The TASK DATA lives in App. TaskCard just displays it and signals events.

import StatusBadge from './StatusBadge'
import PriorityIndicator from './PriorityIndicator'

// Status cycle order — clicking badge cycles through these in order
const STATUS_CYCLE = ['todo', 'in-progress', 'done']

function TaskCard({ id, title, description, status, priority, phase, onDelete, onStatusChange }) {

  function handleStatusClick() {
    // Calculate the next status in the cycle
    const currentIndex = STATUS_CYCLE.indexOf(status)
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length
    const nextStatus = STATUS_CYCLE[nextIndex]

    // Call the parent's callback with this task's id and the new status
    // TaskCard does NOT update state itself — it notifies the parent.
    // The parent owns the data; the parent decides what to do with the event.
    onStatusChange(id, nextStatus)
  }

  function handleDelete() {
    // Confirm before deleting — good UX practice
    if (window.confirm(`Delete "${title}"?`)) {
      onDelete(id)
    }
  }

  return (
    <div className={`task-card task-card-${status}`}>

      <div className="task-card-header">
        <h3 className="task-title">{title}</h3>

        <div className="task-card-actions">
          {/*
            StatusBadge is now wrapped in a button for accessibility.
            Clicking it cycles the status: todo → in-progress → done → todo
            We pass onClick to the wrapper button, not to StatusBadge itself.
            StatusBadge remains purely presentational — it doesn't know about clicking.
          */}
          <button
            className="status-cycle-btn"
            onClick={handleStatusClick}
            title="Click to cycle status"
          >
            <StatusBadge status={status} />
          </button>

          {/* Delete button — calls handleDelete which calls onDelete(id) */}
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
      </div>

    </div>
  )
}

export default TaskCard
