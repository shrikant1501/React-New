// pages/SettingsPage.jsx
// Application settings page.
// URL: /settings
//
// DEMONSTRATES:
//   - A separate route renders completely different content
//   - useTheme() hook consumed in a route component
//   - Navigating to this page preserves the header/sidebar layout (nested routes)

import { useTheme } from '../context/ThemeContext'
import { useTasks, useTaskDispatch } from '../context/TaskContext'

function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { stats }              = useTasks()
  const { resetTasks }         = useTaskDispatch()

  return (
    <div className="page settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure your Task Dashboard preferences</p>
      </div>

      <div className="settings-grid">

        {/* ── Appearance ──────────────────────────────── */}
        <div className="settings-card">
          <h2>Appearance</h2>
          <div className="settings-row">
            <div>
              <p className="settings-label">Theme</p>
              <p className="settings-hint">
                Currently: <strong>{theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</strong>
              </p>
            </div>
            <button className="btn btn-primary" onClick={toggleTheme}>
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>

        {/* ── Data Management ──────────────────────────── */}
        <div className="settings-card">
          <h2>Data</h2>
          <div className="settings-row">
            <div>
              <p className="settings-label">Task Storage</p>
              <p className="settings-hint">
                {stats.total} tasks stored in localStorage
              </p>
            </div>
            <button className="btn btn-reset" onClick={resetTasks}>
              Reset All Tasks
            </button>
          </div>
        </div>

        {/* ── About ─────────────────────────────────────── */}
        <div className="settings-card">
          <h2>About</h2>
          <p className="settings-hint">
            Task Dashboard — A React learning project built phase by phase.
          </p>
          <p className="settings-hint" style={{ marginTop: '0.5rem' }}>
            Built with React 19, Vite 8, and React Router DOM 7.
          </p>
        </div>

      </div>
    </div>
  )
}

export default SettingsPage
