// components/StatsSection.jsx
// Reads stats from TaskStateContext and renders the StatsBar.
// Zero props needed from parent — demonstrates context consumer pattern.
//
// Before Context: App computed stats and passed total, done, inProgress, todo
// After Context:  StatsSection reads from useTasks() directly.
// The App component no longer needs to know stats exist at all.

import { useTasks } from '../context/TaskContext'
import StatsBar from './StatsBar'

function StatsSection() {
  const { stats } = useTasks()

  return (
    <StatsBar
      total={stats.total}
      done={stats.done}
      inProgress={stats.inProgress}
      todo={stats.todo}
    />
  )
}

export default StatsSection
