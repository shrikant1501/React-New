// pages/TaskDetailPage.jsx
// Shows the full details of a single task.
// URL: /tasks/:taskId  e.g. /tasks/5
//
// DEMONSTRATES:
//   useParams()   — extracts the :taskId segment from the URL
//   useNavigate() — programmatic navigation (Back button, or after delete)
//   URL parameters as a source of truth — the task ID is in the URL

import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTasks, useTaskDispatch } from '../context/TaskContext'
import StatusBadge from '../components/StatusBadge'
import PriorityIndicator from '../components/PriorityIndicator'

function TaskDetailPage() {
  // useParams: reads the dynamic :taskId segment from the current URL
  // Always returns strings — parse to number if comparing to numeric IDs
  const { taskId } = useParams()
  const navigate   = useNavigate()

  const { tasks }           = useTasks()
  const { deleteTask, updateTaskStatus } = useTaskDispatch()

  // Find the task in context using the URL param
  const task = tasks.find(t => t.id === Number(taskId))

  // Handle case where task doesn't exist (deleted, bad URL, etc.)
  if (!task) {
    return (
      <div className="page detail-page">
        <div className="detail-not-found">
          <h2>Task not found</h2>
          <p>This task may have been deleted or the URL is invalid.</p>
          <Link to="/tasks" className="btn btn-primary">
            ← Back to Tasks
          </Link>
        </div>
      </div>
    )
  }

  function handleDelete() {
    if (window.confirm(`Delete "${task.title}"?`)) {
      deleteTask(task.id)
      // After deletion, navigate back to the task list
      // replace: true so the deleted task's page isn't in history
      navigate('/tasks', { replace: true })
    }
  }

  const STATUS_CYCLE = ['todo', 'in-progress', 'done']
  function handleStatusCycle() {
    const idx     = STATUS_CYCLE.indexOf(task.status)
    const nextIdx = (idx + 1) % STATUS_CYCLE.length
    updateTaskStatus(task.id, STATUS_CYCLE[nextIdx])
  }

  return (
    <div className="page detail-page">
      <div className="detail-header">
        <Link to="/tasks" className="back-link">
          ← Back to Tasks
        </Link>
        <span className="detail-phase-badge">Phase {task.phase}</span>
      </div>

      <div className="detail-card">
        <div className="detail-title-row">
          <h1 className="detail-title">{task.title}</h1>
          <button
            className="status-cycle-btn"
            onClick={handleStatusCycle}
            title="Click to cycle status"
          >
            <StatusBadge status={task.status} />
          </button>
        </div>

        <p className="detail-description">{task.description || 'No description provided.'}</p>

        <div className="detail-meta">
          <div className="detail-meta-item">
            <span className="detail-meta-label">Priority</span>
            <PriorityIndicator level={task.priority} />
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Task ID</span>
            <span className="detail-meta-value">#{task.id}</span>
          </div>
        </div>

        <div className="detail-actions">
          <button className="btn btn-primary" onClick={handleStatusCycle}>
            Cycle Status
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete Task
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskDetailPage
