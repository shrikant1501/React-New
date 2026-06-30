// pages/TasksPage.jsx — Phase 9
// Filter lives in the URL (?filter=done) — unchanged from Phase 8.
// NEW: passes isLoading/isError down so TaskListSection can show skeletons.

import { useSearchParams } from 'react-router-dom'
import { useTasks } from '../context/TaskContext'
import StatsSection from '../components/StatsSection'
import AddTaskSection from '../components/AddTaskSection'
import TaskListSection from '../components/TaskListSection'
import ResetSection from '../components/ResetSection'

function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('filter') || 'all'

  const { isLoading, isError, error } = useTasks()

  function handleFilterChange(newFilter) {
    if (newFilter === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ filter: newFilter })
    }
  }

  // Full-page error state — shown when React Query exhausts all retries
  if (isError) {
    return (
      <div className="page tasks-page">
        <div className="error-page">
          <h2>⚠️ Could not load tasks</h2>
          <p>{error?.message}</p>
          <p className="error-hint">
            Make sure the API server is running: <code>npm run api</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page tasks-page">
      <StatsSection />
      <AddTaskSection />
      <TaskListSection
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        isLoading={isLoading}
      />
      <ResetSection />
    </div>
  )
}

export default TasksPage
