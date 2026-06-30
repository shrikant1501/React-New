// context/TaskContext.jsx
// Provides task state and operations to any component in the tree.
// Eliminates prop drilling by making data available globally.
//
// ARCHITECTURE DECISIONS:
//
// 1. SPLIT CONTEXTS — we use two separate contexts:
//    TaskStateContext    — the tasks array (changes on every mutation)
//    TaskDispatchContext — the action functions (NEVER change — stable setters)
//
//    WHY SPLIT?
//    A component that only needs to trigger actions (e.g., AddTaskForm) should
//    subscribe to TaskDispatchContext only. It will NEVER re-render due to task
//    data changes. If we put everything in one context, every subscriber
//    re-renders on every task change — including action-only components.
//
// 2. CUSTOM HOOKS — useTasks() and useTaskDispatch() wrap useContext.
//    Benefits:
//      a) Consumer components don't import the raw context object
//      b) Clear error message if used outside the Provider
//      c) Logic can be added here without changing all consumers
//
// 3. PROVIDER PATTERN — TaskProvider owns all state and provides it.
//    App.jsx becomes a pure layout shell — no state, no handlers.
//    State responsibility is co-located with the context that provides it.

import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import useDocumentTitle from '../hooks/useDocumentTitle'

// ─── Context Objects ──────────────────────────────────────────────────────────
// createContext(defaultValue):
//   defaultValue is ONLY used when a component reads the context without a
//   Provider anywhere above it in the tree. In practice this means: when the
//   component is rendered outside of TaskProvider (e.g., in a test or storybook).
//   null is a safe default — our custom hook throws a clear error in this case.

const TaskStateContext    = createContext(null)
const TaskDispatchContext = createContext(null)
const FilterContext       = createContext(null)

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INITIAL_TASKS = [
  {
    id: 1,
    title: 'Set up Vite + React project',
    description: 'Initialize the project, understand the folder structure, and build the first static components.',
    status: 'done', priority: 'high', phase: 1,
  },
  {
    id: 2,
    title: 'Learn JSX and Components',
    description: 'Understand JSX compilation, component rules, the Virtual DOM, and how React renders to the browser.',
    status: 'done', priority: 'high', phase: 1,
  },
  {
    id: 3,
    title: 'Master Props and Data Flow',
    description: 'Learn how to pass data between components using props, destructuring, default values, and the children pattern.',
    status: 'done', priority: 'high', phase: 2,
  },
  {
    id: 4,
    title: 'Understand useState Hook',
    description: 'Add interactivity with state — make the task dashboard respond to user actions.',
    status: 'done', priority: 'high', phase: 3,
  },
  {
    id: 5,
    title: 'Explore useEffect and Lifecycle',
    description: 'Learn about side effects — localStorage persistence, document title, cleanup functions.',
    status: 'done', priority: 'high', phase: 4,
  },
  {
    id: 6,
    title: 'useRef, Forms, and Controlled Components',
    description: 'Master the mutable box, DOM access, form validation, and the controlled vs uncontrolled distinction.',
    status: 'done', priority: 'high', phase: 5,
  },
  {
    id: 7,
    title: 'Performance: useMemo, useCallback, React.memo',
    description: 'Learn when and how to prevent unnecessary re-renders using memoisation tools.',
    status: 'done', priority: 'high', phase: 6,
  },
  {
    id: 8,
    title: 'Context API and State Management',
    description: 'Avoid prop drilling with React Context; understand global vs local state boundaries.',
    status: 'in-progress', priority: 'high', phase: 7,
  },
  {
    id: 9,
    title: 'React Router — Navigation',
    description: 'Add multi-page navigation, nested routes, and route parameters.',
    status: 'todo', priority: 'medium', phase: 8,
  },
]

// ─── Provider Component ───────────────────────────────────────────────────────
// TaskProvider is the "smart" component — it owns state and provides it.
// It renders THREE providers, each broadcasting a slice of the data.
// Children can subscribe to exactly the slice they need.

export function TaskProvider({ children }) {
  const [tasks, setTasks]               = useLocalStorage('tasks', INITIAL_TASKS)
  const [activeFilter, setActiveFilter] = useState('all')

  // ── Derived: stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      tasks.length,
    done:       tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    todo:       tasks.filter(t => t.status === 'todo').length,
  }), [tasks])

  // ── Derived: visible tasks ───────────────────────────────────────────────
  const visibleTasks = useMemo(() =>
    activeFilter === 'all'
      ? tasks
      : tasks.filter(t => t.status === activeFilter),
    [tasks, activeFilter]
  )

  // ── Document title ───────────────────────────────────────────────────────
  useDocumentTitle(
    stats.todo > 0 ? `(${stats.todo} todo) Task Dashboard` : 'Task Dashboard'
  )

  // ── Action handlers ──────────────────────────────────────────────────────
  // useCallback ensures these are stable references.
  // They go into TaskDispatchContext — which NEVER changes, so consumers
  // of dispatch context NEVER re-render due to task data changes.

  const addTask = useCallback((taskData) => {
    setTasks(prev => [...prev, {
      ...taskData,
      id: Date.now(),
      phase: 7,
    }])
  }, [setTasks])

  const deleteTask = useCallback((taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }, [setTasks])

  const updateTaskStatus = useCallback((taskId, newStatus) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ))
  }, [setTasks])

  const resetTasks = useCallback(() => {
    if (window.confirm('Reset all tasks to initial state?')) {
      setTasks(INITIAL_TASKS)
    }
  }, [setTasks])

  // ── Context values ───────────────────────────────────────────────────────
  // useMemo on context values prevents ALL consumers from re-rendering
  // just because the TaskProvider's parent re-rendered.
  // Without useMemo: { tasks, stats, visibleTasks } is a new object every render
  // → all TaskStateContext consumers re-render (even if tasks didn't change)

  const stateValue = useMemo(() => ({
    tasks,
    stats,
    visibleTasks,
  }), [tasks, stats, visibleTasks])

  // Dispatch value: NEVER changes because all functions are useCallback'd
  // and setters are stable. This object is created once.
  const dispatchValue = useMemo(() => ({
    addTask,
    deleteTask,
    updateTaskStatus,
    resetTasks,
  }), [addTask, deleteTask, updateTaskStatus, resetTasks])

  const filterValue = useMemo(() => ({
    activeFilter,
    setActiveFilter,
  }), [activeFilter, setActiveFilter])

  return (
    // Three providers nested — each child subscribes to the slice it needs.
    // Nesting order doesn't affect functionality.
    <TaskStateContext.Provider value={stateValue}>
      <TaskDispatchContext.Provider value={dispatchValue}>
        <FilterContext.Provider value={filterValue}>
          {children}
        </FilterContext.Provider>
      </TaskDispatchContext.Provider>
    </TaskStateContext.Provider>
  )
}

// ─── Custom Hooks (Consumer API) ──────────────────────────────────────────────
// These are the ONLY way components should access context.
// They never import the raw context objects — those stay private to this file.

// Provides: { tasks, stats, visibleTasks }
export function useTasks() {
  const context = useContext(TaskStateContext)
  if (context === null) {
    throw new Error('useTasks must be used within a <TaskProvider>')
  }
  return context
}

// Provides: { addTask, deleteTask, updateTaskStatus, resetTasks }
export function useTaskDispatch() {
  const context = useContext(TaskDispatchContext)
  if (context === null) {
    throw new Error('useTaskDispatch must be used within a <TaskProvider>')
  }
  return context
}

// Provides: { activeFilter, setActiveFilter }
export function useFilter() {
  const context = useContext(FilterContext)
  if (context === null) {
    throw new Error('useFilter must be used within a <TaskProvider>')
  }
  return context
}
