// App.jsx — Phase 7: A pure layout shell. Zero state. Zero props passed down.
//
// BEFORE (Phase 6): App owned everything:
//   - tasks state, filter state
//   - stats computation, visibleTasks computation
//   - all handler functions
//   - passed everything down as props through 2-3 levels
//   - 200+ lines of logic mixed with layout
//
// AFTER (Phase 7): App owns nothing:
//   - No useState, no useMemo, no useCallback
//   - No props passed to children
//   - Just layout structure
//   - State lives in TaskProvider (context/TaskContext.jsx)
//   - Components read what they need directly from context
//   - App is now just a skeleton — the layout blueprint
//
// THIS IS THE POWER OF CONTEXT:
// App went from a 200-line "God component" to a clean 30-line layout.
// Each child component is now self-sufficient.
// Adding a new page/section requires ZERO changes to App.

import Header from './components/Header'
import StatsSection from './components/StatsSection'
import AddTaskSection from './components/AddTaskSection'
import TaskListSection from './components/TaskListSection'
import ResetSection from './components/ResetSection'
import LifecycleDemo from './components/LifecycleDemo'
import { useState } from 'react'
import './App.css'

function App() {
  // App only owns purely local UI state — things no other component needs.
  // The lifecycle demo toggle is a good example: it's App's own UI preference,
  // not shared data. Local state (useState) is still the right tool here.
  const [showLifecycleDemo, setShowLifecycleDemo] = useState(false)

  return (
    <>
      {/* Header reads from TaskContext and ThemeContext directly */}
      <Header />

      <main className="main-content">

        {/* Each section component reads its own data from context */}
        <StatsSection />

        <AddTaskSection />

        <div className="lifecycle-toggle-row">
          <label className="lifecycle-toggle-label">
            <input
              type="checkbox"
              checked={showLifecycleDemo}
              onChange={e => setShowLifecycleDemo(e.target.checked)}
            />
            <span>Show Lifecycle Visualiser</span>
          </label>
        </div>
        {showLifecycleDemo && <LifecycleDemo />}

        {/* TaskListSection reads tasks, filter, and dispatch from context */}
        <TaskListSection />

        <ResetSection />

      </main>
    </>
  )
}

export default App
