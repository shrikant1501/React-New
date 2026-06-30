// components/AddTaskSection.jsx — Phase 9
// Now shows a loading spinner while the POST request is in flight.
// isAdding comes from the mutation's isPending state in TaskContext.

import { useTaskDispatch } from '../context/TaskContext'
import AddTaskForm from './AddTaskForm'

function AddTaskSection() {
  // isAdding: true while POST /tasks is in flight (from useMutation.isPending)
  const { addTask, isAdding } = useTaskDispatch()

  return (
    <div>
      <AddTaskForm onAddTask={addTask} isSubmitting={isAdding} />
    </div>
  )
}

export default AddTaskSection
