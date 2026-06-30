// components/AddTaskSection.jsx
// Wraps AddTaskForm — reads the addTask dispatch function from context.
// Zero props needed. Demonstrates the dispatch-only context subscription:
//   - Subscribes to TaskDispatchContext only
//   - addTask is stable (useCallback) → this component NEVER re-renders due to task changes
//   - Only re-renders if the dispatch context itself changes (essentially never)
//
// This is the "split context" pattern paying off:
// Adding or deleting tasks changes TaskStateContext — but NOT TaskDispatchContext.
// So this component is completely isolated from the data change waterfall.

import { useTaskDispatch } from '../context/TaskContext'
import AddTaskForm from './AddTaskForm'

function AddTaskSection() {
  // Only subscribes to dispatch — unaffected by task data changes
  const { addTask } = useTaskDispatch()

  return <AddTaskForm onAddTask={addTask} />
}

export default AddTaskSection
