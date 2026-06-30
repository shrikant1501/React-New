// components/StatsSection.jsx — Phase 9
// Now handles isLoading (first fetch) and isError states from React Query.

import { useTasks } from '../context/TaskContext'
import StatsBar from './StatsBar'

function StatsSection() {
  // isLoading: true only on the FIRST fetch (no cache yet)
  // After first load, React Query serves from cache while refetching in background
  const { stats, isLoading, isError } = useTasks()

  if (isLoading) return <div className="loading-bar">Loading tasks…</div>
  if (isError)   return <div className="error-bar">Failed to load stats.</div>

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
