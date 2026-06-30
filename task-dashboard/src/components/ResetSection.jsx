// components/ResetSection.jsx
// Reads resetTasks from dispatch context — zero props from parent.
// Another example of a component that only needs dispatch (not state).

import { useTaskDispatch } from '../context/TaskContext'

function ResetSection() {
  const { resetTasks } = useTaskDispatch()

  return (
    <div className="reset-row">
      <button className="btn btn-reset" onClick={resetTasks}>
        Reset to Initial Tasks
      </button>
    </div>
  )
}

export default ResetSection
