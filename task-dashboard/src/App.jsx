// App.jsx — Phase 4: Lifecycle, useEffect, and persistence.
//
// WHAT CHANGED FROM PHASE 3:
//   1. useState(INITIAL_TASKS) → useLocalStorage('tasks', INITIAL_TASKS)
//      Tasks now persist across page refreshes automatically.
//
//   2. Stats computation → useTaskStats(tasks) custom hook
//      Logic extracted out of App into a reusable hook.
//
//   3. useDocumentTitle — browser tab title updates with task count.
//
//   4. LifecycleDemo — toggled by local state to demonstrate mount/unmount.
//
// HOOKS USED IN THIS COMPONENT:
//   useLocalStorage  — custom: state + localStorage sync (uses useState + useEffect)
//   useTaskStats     — custom: derived stat computation
//   useDocumentTitle — custom: document.title side effect (uses useEffect)
//   useState         — for filter and lifecycle demo toggle

import { useState } from 'react'
import Header from './components/Header'
import TaskCard from './components/TaskCard'
import Section from './components/Section'
import StatsBar from './components/StatsBar'
import FilterBar from './components/FilterBar'
import AddTaskForm from './components/AddTaskForm'
import LifecycleDemo from './components/LifecycleDemo'
import useLocalStorage from './hooks/useLocalStorage'
import useTaskStats from './hooks/useTaskStats'
import useDocumentTitle from './hooks/useDocumentTitle'
import './App.css'

// ─── Initial Data (outside component — created once, not on every render) ────
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
    status: 'in-progress',
    priority: 'high',
    phase: 4,
  },
  {
    id: 6,
    title: 'React Router — Navigation',
    description: 'Add multi-page navigation to the dashboard with React Router DOM.',
    status: 'todo',
    priority: 'low',
    phase: 7,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

function App() {
  // ── Custom hook: persisted state ─────────────────────────────────────────
  // useLocalStorage has the SAME interface as useState.
  // Internally it uses useState + useEffect to sync with localStorage.
  // From App's perspective, it's just "state that also saves itself".
  const [tasks, setTasks] = useLocalStorage('tasks', INITIAL_TASKS)

  // ── Regular state ─────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState('all')
  const [showLifecycleDemo, setShowLifecycleDemo] = useState(false)

  // ── Custom hook: computed stats ───────────────────────────────────────────
  // Extracts the filter+count logic out of App. Cleaner component body.
  const stats = useTaskStats(tasks)

  // ── Custom hook: document title side effect ───────────────────────────────
  // Updates the browser tab title whenever the todo count changes.
  // The hook internally uses useEffect — App doesn't need to care about that.
  useDocumentTitle(
    stats.todo > 0
      ? `(${stats.todo} todo) Task Dashboard`
      : 'Task Dashboard'
  )

  // ── Derived value ─────────────────────────────────────────────────────────
  const visibleTasks = activeFilter === 'all'
    ? tasks
    : tasks.filter(task => task.status === activeFilter)

  // ── Event handlers ────────────────────────────────────────────────────────

  function handleAddTask(newTaskData) {
    const newTask = {
      ...newTaskData,
      id: Date.now(),
      phase: 4,
    }
    setTasks(prev => [...prev, newTask])
  }

  function handleDeleteTask(taskId) {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  function handleStatusChange(taskId, newStatus) {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus }
          : task
      )
    )
  }

  function handleResetTasks() {
    // Demonstrates: setTasks replaces localStorage value entirely.
    // Useful to "reset" the demo back to initial state.
    if (window.confirm('Reset all tasks to initial state?')) {
      setTasks(INITIAL_TASKS)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header currentPhase={4} />

      <main className="main-content">

        <StatsBar
          total={stats.total}
          done={stats.done}
          inProgress={stats.inProgress}
          todo={stats.todo}
        />

        <AddTaskForm onAddTask={handleAddTask} />

        {/*
          LifecycleDemo is conditionally rendered — it mounts and unmounts
          based on showLifecycleDemo state. This lets us observe the full
          mount → update → unmount lifecycle in the console.

          IMPORTANT: When showLifecycleDemo goes from false → true:
            - LifecycleDemo is MOUNTED (Effect 2 fires: "Component MOUNTED")
          When it goes from true → false:
            - LifecycleDemo is UNMOUNTED (Effect 2 cleanup fires: "Component UNMOUNTED")
        */}
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

        {/* Conditional rendering: LifecycleDemo only exists in the DOM when checked */}
        {showLifecycleDemo && <LifecycleDemo />}

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

        {/* Reset button — demonstrates that setTasks overwrites localStorage too */}
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
