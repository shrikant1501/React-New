// components/ResetSection.jsx — Phase 9
// Reset now deletes all tasks via API (DELETE /tasks/:id for each).
// Shows a confirmation and a loading state while the operation runs.

import { useTaskDispatch, useTasks } from '../context/TaskContext'

function ResetSection() {
  const { resetTasks }    = useTaskDispatch()
  const { isLoading }     = useTasks()

  function handleReset() {
    if (window.confirm('Delete all tasks from the server? This cannot be undone.')) {
      resetTasks()
    }
  }

  return (
    <div className="reset-row">
      <button
        className="btn btn-reset"
        onClick={handleReset}
        disabled={isLoading}
      >
        {isLoading ? 'Working…' : 'Reset All Tasks'}
      </button>
    </div>
  )
}

export default ResetSection
