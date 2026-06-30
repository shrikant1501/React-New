// Header.jsx — Phase 7: Reads phase number from context; renders ThemeToggle.
// Demonstrates a component reading from multiple contexts independently.
//
// PROPS RECEIVED: none (reads everything from context)
// Previously: received currentPhase as a prop from App.

import { useTasks } from '../context/TaskContext'
import ThemeToggle from './ThemeToggle'

function Header() {
  // useTasks gives us the tasks — we derive the current phase from task data
  // (the highest phase number that has any task with status !== 'todo')
  // Alternatively we could store currentPhase in context — but deriving it
  // from task data demonstrates that context consumers can do their own logic.
  const { tasks } = useTasks()

  const currentPhase = tasks.reduce((maxPhase, task) => {
    if (task.status !== 'todo') return Math.max(maxPhase, task.phase)
    return maxPhase
  }, 1)

  return (
    <header className="header">
      <div className="header-brand">
        <h1>Task Dashboard</h1>
        <p>Manage your work, one task at a time</p>
      </div>
      <div className="header-meta">
        <span className="badge">Phase {currentPhase}</span>
        {/* ThemeToggle reads ThemeContext directly — no props needed */}
        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header
