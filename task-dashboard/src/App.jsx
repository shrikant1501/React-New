// App.jsx — Phase 6: Performance optimisation with useMemo and useCallback.
//
// THE OPTIMISATION STORY:
//
// BEFORE (Phase 5 behaviour):
//   User changes filter → App re-renders → EVERYTHING re-renders
//   StatsBar, FilterBar, AddTaskForm, Header, all 6 TaskCards — all wasted work.
//   Only the visible task list actually needed to update.
//
// AFTER (Phase 6 behaviour):
//   User changes filter → App re-renders
//     → StatsBar: SKIPPED (memo + stats unchanged — tasks didn't change)
//     → FilterBar: RE-RENDERS (memo + activeFilter changed — this is needed)
//     → TaskCard×6: SKIPPED (memo + task data unchanged + callbacks stable)
//   Only what actually needs to update does update.
//
// TOOLS APPLIED:
//   useMemo:      stats, visibleTasks — avoid recomputation when deps unchanged
//   useCallback:  all handler functions — stable references for memo to work
//   React.memo:   TaskCard, StatsBar, FilterBar — opt-in to prop comparison
//
// KEY INSIGHT:
//   React.memo alone is not enough. If you pass a new function reference as
//   a prop (which happens on every render without useCallback), memo ALWAYS
//   sees "changed" props and re-renders anyway. The three tools work as a system.

import { useState, useMemo, useCallback } from 'react'
import Header from './components/Header'
import TaskCard from './components/TaskCard'
import Section from './components/Section'
import StatsBar from './components/StatsBar'
import FilterBar from './components/FilterBar'
import AddTaskForm from './components/AddTaskForm'
import LifecycleDemo from './components/LifecycleDemo'
import useLocalStorage from './hooks/useLocalStorage'
import useDocumentTitle from './hooks/useDocumentTitle'
import './App.css'

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INITIAL_TASKS = [
  {
    id: 1,
    title: 'Set up Vite + React project',
    description: 'Initialize the project, understand the folder structure, and build the first static components.',
    status: 'done',
    priority: 'high',
    phase: 1,
  },
  {
    id: 2,
    title: 'Learn JSX and Components',
    description: 'Understand JSX compilation, component rules, the Virtual DOM, and how React renders to the browser.',
    status: 'done',
    priority: 'high',
    phase: 1,
  },
  {
    id: 3,
    title: 'Master Props and Data Flow',
    description: 'Learn how to pass data between components using props, destructuring, default values, and the children pattern.',
    status: 'done',
    priority: 'high',
    phase: 2,
  },
  {
    id: 4,
    title: 'Understand useState Hook',
    description: 'Add interactivity with state — make the task dashboard respond to user actions.',
    status: 'done',
    priority: 'high',
    phase: 3,
  },
  {
    id: 5,
    title: 'Explore useEffect and Lifecycle',
    description: 'Learn about side effects — localStorage persistence, document title, cleanup functions.',
    status: 'done',
    priority: 'high',
    phase: 4,
  },
  {
    id: 6,
    title: 'useRef, Forms, and Controlled Components',
    description: 'Master the mutable box, DOM access, form validation, and the controlled vs uncontrolled distinction.',
    status: 'done',
    priority: 'high',
    phase: 5,
  },
  {
    id: 7,
    title: 'Performance: useMemo, useCallback, React.memo',
    description: 'Learn when and how to prevent unnecessary re-renders using memoisation tools.',
    status: 'in-progress',
    priority: 'high',
    phase: 6,
  },
  {
    id: 8,
    title: 'Context API and State Management',
    description: 'Avoid prop drilling with React Context; understand global vs local state.',
    status: 'todo',
    priority: 'medium',
    phase: 7,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

function App() {
  const [tasks, setTasks]               = useLocalStorage('tasks', INITIAL_TASKS)
  const [activeFilter, setActiveFilter] = useState('all')
  const [showLifecycleDemo, setShowLifecycleDemo] = useState(false)

  // ── useMemo: stats ────────────────────────────────────────────────────────
  // Without useMemo: these three filter() calls run on EVERY render.
  //   If filter changes, tasks didn't change — yet we still re-filter 3 times.
  // With useMemo: only recomputes when [tasks] changes.
  //   A filter change skips this computation entirely.
  //
  // Also: the stats OBJECT is a new reference on every render without useMemo.
  //   Even if StatsBar is wrapped in memo, a new object reference would defeat it.
  //   useMemo preserves the SAME object reference when tasks hasn't changed.
  const stats = useMemo(() => ({
    total:      tasks.length,
    done:       tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    todo:       tasks.filter(t => t.status === 'todo').length,
  }), [tasks])

  // ── useMemo: visibleTasks ─────────────────────────────────────────────────
  // Without useMemo: filters tasks array on every render.
  // With useMemo: only re-filters when tasks OR activeFilter changes.
  // Two separate concerns in deps — each triggers the recomputation independently.
  const visibleTasks = useMemo(() =>
    activeFilter === 'all'
      ? tasks
      : tasks.filter(task => task.status === activeFilter),
    [tasks, activeFilter]
  )

  // ── useDocumentTitle (not memoised — it's a hook, not a value) ────────────
  useDocumentTitle(
    stats.todo > 0 ? `(${stats.todo} todo) Task Dashboard` : 'Task Dashboard'
  )

  // ── useCallback: handlers ─────────────────────────────────────────────────
  // Without useCallback: each of these is a NEW function on every render.
  //   TaskCard is wrapped in React.memo — but memo compares onDelete/onStatusChange.
  //   New function reference → Object.is returns false → memo BYPASSED.
  //   Every TaskCard re-renders on every App render — memo is useless.
  // With useCallback: same function reference returned until deps change.
  //   React.memo's comparison sees same reference → SKIPS re-render ✅
  //
  // Dependencies are empty [] because:
  //   - setTasks is guaranteed stable by React (setter identity never changes)
  //   - These functions use FUNCTIONAL UPDATES (prev => ...) so they don't
  //     close over 'tasks' directly — no stale closure risk.

  const handleAddTask = useCallback((newTaskData) => {
    const newTask = {
      ...newTaskData,
      id: Date.now(),
      phase: 6,
    }
    setTasks(prev => [...prev, newTask])
  }, [setTasks])
  // Note: setTasks from useLocalStorage may not be guaranteed stable like useState's.
  // We add it to deps to be safe. In practice it IS stable (useState under the hood).

  const handleDeleteTask = useCallback((taskId) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }, [setTasks])

  const handleStatusChange = useCallback((taskId, newStatus) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus }
          : task
      )
    )
  }, [setTasks])

  const handleResetTasks = useCallback(() => {
    if (window.confirm('Reset all tasks to initial state?')) {
      setTasks(INITIAL_TASKS)
    }
  }, [setTasks])

  // ── setActiveFilter is already stable (useState setter) ───────────────────
  // We pass it DIRECTLY to FilterBar — no useCallback wrapper needed.
  // This is an important nuance: useState setters are ALWAYS stable references.
  // No need to wrap them in useCallback.

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header currentPhase={6} />

      <main className="main-content">

        {/*
          StatsBar is memo'd + receives primitive number props.
          stats object is useMemo'd — same reference when tasks unchanged.
          Result: StatsBar skips render on filter changes.
        */}
        <StatsBar
          total={stats.total}
          done={stats.done}
          inProgress={stats.inProgress}
          todo={stats.todo}
        />

        <AddTaskForm onAddTask={handleAddTask} />

        <div className="lifecycle-toggle-row">
          <label className="lifecycle-toggle-label">
            <input
              type="checkbox"
              checked={showLifecycleDemo}
              onChange={e => setShowLifecycleDemo(e.target.checked)}
            />
            <span>Show Lifecycle Visualiser (open DevTools Console)</span>
          </label>
        </div>
        {showLifecycleDemo && <LifecycleDemo />}

        {/*
          FilterBar is memo'd + receives:
            activeFilter: primitive string → stable ✅
            onFilterChange: setActiveFilter, a stable useState setter ✅
          Result: FilterBar re-renders ONLY when filter changes — not when tasks change.
        */}
        <Section title="My Tasks" count={visibleTasks.length}>

          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          <div className="task-grid">
            {visibleTasks.length === 0 ? (
              <div className="empty-state">
                <p>No tasks match this filter.</p>
              </div>
            ) : (
              visibleTasks.map(task => (
                /*
                  TaskCard is memo'd + receives:
                    id, title, description, status, priority, phase → primitives ✅
                    onDelete → useCallback, stable reference ✅
                    onStatusChange → useCallback, stable reference ✅
                  Result: Only the TaskCard whose task data changed will re-render.
                  All others are SKIPPED even when App re-renders.
                  WATCH THE RENDER COUNTERS to verify this!
                */
                <TaskCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  status={task.status}
                  priority={task.priority}
                  phase={task.phase}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </div>

        </Section>

        <div className="reset-row">
          <button className="btn btn-reset" onClick={handleResetTasks}>
            Reset to Initial Tasks
          </button>
        </div>

      </main>
    </>
  )
}

export default App
