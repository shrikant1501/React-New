// components/Sidebar.jsx
// Left-hand navigation sidebar.
// Uses NavLink — like Link but automatically adds 'active' class
// when its path matches the current URL.
//
// NavLink's className prop accepts a function: ({ isActive }) => string
// This is how you apply conditional styling based on the current route.
// No need for manual state tracking — the router knows the current URL.

import { NavLink } from 'react-router-dom'
import { useTasks } from '../context/TaskContext'

const NAV_ITEMS = [
  { to: '/tasks',    label: 'Tasks',    icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

function Sidebar() {
  const { stats } = useTasks()

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
            // ↑ isActive: true when the current URL matches or starts with 'to'
            // React Router determines this — no manual URL comparison needed
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {/* Show todo count badge on Tasks link */}
            {item.to === '/tasks' && stats.todo > 0 && (
              <span className="sidebar-badge">{stats.todo}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-stats">
          <div className="sidebar-stat">
            <span className="sidebar-stat-value">{stats.done}</span>
            <span className="sidebar-stat-label">done</span>
          </div>
          <div className="sidebar-stat">
            <span className="sidebar-stat-value">{stats.inProgress}</span>
            <span className="sidebar-stat-label">active</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
