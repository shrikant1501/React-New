// App.jsx — Phase 3: State is now alive.
// App owns ALL shared state and passes it down as props.
// Children communicate back up via callback props.
//
// STATE OWNED BY APP:
//   tasks        — the array of all task objects (mutated via setter)
//   activeFilter — which filter button is selected ("all" | "todo" | etc.)
//
// DATA FLOW DIAGRAM:
//   App (tasks state, filter state)
//    │
//    ├─→ StatsBar     ← receives computed counts (derived from tasks state)
//    ├─→ AddTaskForm  ← receives onAddTask callback
//    ├─→ FilterBar    ← receives activeFilter + onFilterChange callback
//    └─→ TaskCard[]   ← receives task data + onDelete + onStatusChange callbacks
//         │
//         ├─→ StatusBadge     (presentational)
//         └─→ PriorityIndicator (presentational)

import { useState } from 'react'
import Header from './components/Header'
import TaskCard from './components/TaskCard'
import Section from './components/Section'
import StatsBar from './components/StatsBar'
import FilterBar from './components/FilterBar'
import AddTaskForm from './components/AddTaskForm'
import './App.css'

// ─── Initial Data ─────────────────────────────────────────────────────────────
// Defined OUTSIDE the component so it is created once, not on every render.
// This is important: if this were inside App(), it would be recreated on every
// render, causing a new array reference every time (breaks memoisation later).

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
    status: 'in-progress',
    priority: 'high',
    phase: 3,
  },
  {
    id: 5,
    title: 'Explore useEffect Hook',
    description: 'Learn about side effects — fetching data, subscriptions, and syncing with external systems.',
    status: 'todo',
    priority: 'medium',
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
  // ── State declarations ────────────────────────────────────────────────────
  //
  // useState(INITIAL_TASKS) — first render: tasks = INITIAL_TASKS
  // On subsequent renders: tasks = whatever setTasks was last called with
  //
  // The INITIAL_TASKS constant is only used once — on the very first render.
  // After that, React reads the value from the Fiber node's memoizedState.
  const [tasks, setTasks] = useState(INITIAL_TASKS)

  // Filter state — which category of tasks to show
  const [activeFilter, setActiveFilter] = useState('all')

  // ── Derived values (computed from state — NOT separate state) ─────────────
  //
  // These are NOT useState calls — they are plain computed values.
  // RULE: if a value can be calculated from existing state, do NOT put it in
  // useState. Derive it during render. Keeping redundant state in sync is
  // a common source of bugs.
  //
  // These recalculate automatically on every render (whenever tasks changes).
  const stats = {
    total:      tasks.length,
    done:       tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    todo:       tasks.filter(t => t.status === 'todo').length,
  }

  // Apply the active filter to produce the visible list
  const visibleTasks = activeFilter === 'all'
    ? tasks
    : tasks.filter(task => task.status === activeFilter)

  // ── Event handlers ────────────────────────────────────────────────────────
  //
  // These functions are defined inside App because they need access to
  // setTasks. They will be passed DOWN as callback props to children.
  // Children call them; App updates state; React re-renders.

  function handleAddTask(newTaskData) {
    // Create a new task with a unique id.
    // Date.now() gives a timestamp-based number — simple and works for our
    // purposes. In production you'd use a UUID library or a server-generated ID.
    const newTask = {
      ...newTaskData,          // spread: title, description, priority, status
      id: Date.now(),          // unique identifier
      phase: 3,                // tasks added via form belong to current phase
    }

    // IMMUTABILITY: we create a NEW array — not mutate the existing one.
    // [...tasks, newTask] creates a new array with all existing tasks + newTask.
    // React sees a new array reference → triggers re-render.
    setTasks(prevTasks => [...prevTasks, newTask])
    //        ↑ Functional update: we use prev => [...] because the new state
    //          depends on the previous state. This is the correct pattern.
  }

  function handleDeleteTask(taskId) {
    // filter() returns a NEW array — immutability preserved.
    // Every task EXCEPT the one with matching id is kept.
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId))
  }

  function handleStatusChange(taskId, newStatus) {
    // map() returns a NEW array — immutability preserved.
    // For the matching task, we create a NEW object with the updated status.
    // For all other tasks, we return the same object reference (no copy needed).
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus }   // new object — changed
          : task                             // same reference — unchanged
      )
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header currentPhase={3} />

      <main className="main-content">

        {/* StatsBar receives derived numbers — not the raw tasks array.
            It doesn't need the full tasks data, only the counts. */}
        <StatsBar
          total={stats.total}
          done={stats.done}
          inProgress={stats.inProgress}
          todo={stats.todo}
        />

        {/* AddTaskForm receives only the callback — it owns its own form state */}
        <AddTaskForm onAddTask={handleAddTask} />

        <Section title="My Tasks" count={visibleTasks.length}>

          {/* FilterBar: receives the current filter value AND the setter callback.
              This is "lifting state up" — the filter state lives in App, not FilterBar,
              because App needs it to compute visibleTasks. */}
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            // ↑ We pass setActiveFilter directly as the callback.
            //   setActiveFilter IS a function: (newValue) => update state
            //   FilterBar calls onFilterChange(value) → same as setActiveFilter(value)
          />

          <div className="task-grid">
            {visibleTasks.length === 0 ? (
              // Conditional rendering: show empty state when no tasks match filter
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

      </main>
    </>
  )
}

export default App
