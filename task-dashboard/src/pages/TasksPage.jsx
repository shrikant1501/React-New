// pages/TasksPage.jsx — Phase 13: useTransition for non-urgent filter updates.
//
// WHAT IS useTransition?
// ─────────────────────────────────────────────────────────────────────────
// Some state updates are urgent (typing in a text field — must feel instant).
// Some are non-urgent (filtering a list — a slight delay is acceptable).
//
// useTransition lets you mark an update as non-urgent. React can then:
//   1. Keep the UI responsive to urgent updates (new keystrokes, clicks)
//   2. Interrupt and restart the non-urgent work if needed
//   3. Show a pending indicator while the transition runs
//
// useTransition returns:
//   isPending — true while the transition is in progress
//   startTransition(fn) — wrap non-urgent state updates inside fn
//
// HOW IT WORKS INTERNALLY (React Fiber):
// ─────────────────────────────────────────────────────────────────────────
// React's Fiber architecture assigns priority to updates:
//   High priority: user input (typing, clicking) → must not block
//   Low priority:  transitions (filter, search) → can be interrupted
//
// Without useTransition:
//   User clicks "Done" filter → React blocks the main thread to re-render
//   all task cards → UI may stutter if there are hundreds of cards.
//
// With useTransition:
//   User clicks "Done" filter → React marks the list re-render as low priority
//   → If user clicks again immediately, React cancels the first re-render
//   → React processes the LATEST click only → no wasted work
//
// REAL-WORLD VALUE:
// ─────────────────────────────────────────────────────────────────────────
// Most visible on slow devices or with large lists (1000+ items).
// With our 10 tasks, the effect is imperceptible — but the pattern is the same.
// isPending gives you a visual indicator to show the user something is happening.

import { useTransition } from 'react'
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

  // ── useTransition ─────────────────────────────────────────────────────────
  // isPending: true while the transition (URL update + re-render) is running
  // startTransition: marks the state update inside it as deferrable
  const [isPending, startTransition] = useTransition()

  function handleFilterChange(newFilter) {
    // Wrap the URL state update in startTransition.
    // React treats this as non-urgent — it won't block user input.
    // If the user clicks a different filter before this completes,
    // React will abandon this render and start a new one for the latest value.
    startTransition(() => {
      if (newFilter === 'all') {
        setSearchParams({})
      } else {
        setSearchParams({ filter: newFilter })
      }
    })
  }

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
      {/*
        isPending: passed down so TaskListSection can dim the list while
        the new filter's render is in progress.
        isLoading: true only during the initial data fetch (skeleton cards).
        They serve different purposes and can both be true simultaneously.
      */}
      <TaskListSection
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        isLoading={isLoading}
        isPending={isPending}
      />
      <ResetSection />
    </div>
  )
}

export default TasksPage
