// pages/TasksPage.jsx
// The main tasks page — renders stats, form, and the filtered task list.
// URL: /tasks  or  /tasks?filter=done
//
// KEY CHANGE FROM PHASE 7:
// The active filter is now stored in the URL query string (?filter=done)
// instead of React state. This makes the filter:
//   ✅ Bookmarkable — share /tasks?filter=done to share a filtered view
//   ✅ Shareable — send a URL, recipient sees the same filtered state
//   ✅ History-aware — browser back button restores previous filter
//   ✅ Refreshable — page refresh preserves the filter
//
// useSearchParams is React Router's hook for reading/writing query strings.
// It works identically to useState — [value, setter] — but syncs with the URL.

import { useSearchParams } from 'react-router-dom'
import StatsSection from '../components/StatsSection'
import AddTaskSection from '../components/AddTaskSection'
import TaskListSection from '../components/TaskListSection'
import ResetSection from '../components/ResetSection'

function TasksPage() {
  // useSearchParams: reads/writes the URL query string
  // ?filter=done → searchParams.get('filter') === 'done'
  // No query string → searchParams.get('filter') === null
  const [searchParams, setSearchParams] = useSearchParams()

  // Read filter from URL, fall back to 'all' if not set
  const activeFilter = searchParams.get('filter') || 'all'

  // Update the URL when filter changes — this IS the state now
  function handleFilterChange(newFilter) {
    if (newFilter === 'all') {
      // Remove the filter param entirely for 'all' (cleaner URL)
      setSearchParams({})
    } else {
      setSearchParams({ filter: newFilter })
    }
  }

  return (
    <div className="page tasks-page">
      <StatsSection />
      <AddTaskSection />
      <TaskListSection
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />
      <ResetSection />
    </div>
  )
}

export default TasksPage
