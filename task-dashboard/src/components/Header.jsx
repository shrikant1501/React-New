// Header.jsx — Phase 10: Shows logged-in user info + logout button.
//
// WHAT CHANGED FROM PHASE 7:
//   Before: Only showed phase badge + ThemeToggle
//   After:  Also shows user avatar/name and logout button (when logged in)
//
// WHY useAuth() HERE?
// Header is always mounted (it's in DashboardLayout which wraps all routes).
// When logout() is called, user becomes null instantly — the header re-renders
// and hides the user info. This is the power of React state over localStorage:
// the change is synchronous and instantly propagates to all consumers.
//
// NOTE: Header only renders inside DashboardLayout, which is only mounted for
// authenticated routes. So isAuthenticated will always be true here.
// We still read user from useAuth() for the user's name.

import { useNavigate } from 'react-router-dom'
import { useTasks } from '../context/TaskContext'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

function Header() {
  const navigate = useNavigate()
  const { tasks } = useTasks()
  const { user, logout } = useAuth()

  // Derive current phase from task data (unchanged from Phase 7)
  const currentPhase = tasks.reduce((maxPhase, task) => {
    if (task.status !== 'todo') return Math.max(maxPhase, task.phase)
    return maxPhase
  }, 1)

  // ── Logout handler ─────────────────────────────────────────────────────
  // 1. Call logout() → clears AuthContext state + localStorage token
  // 2. Navigate to /login — user is now unauthenticated
  // No async needed: logout() is synchronous (no API call in our mock)
  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
    // replace: true — so after logout, the Back button doesn't go to a protected page
  }

  return (
    <header className="header">
      <div className="header-brand">
        <h1>Task Dashboard</h1>
        <p>Manage your work, one task at a time</p>
      </div>

      <div className="header-meta">
        <span className="badge">Phase {currentPhase}</span>

        {/* ── User Info + Logout ───────────────────────────────────────
          user will always exist here (we're in a protected layout),
          but the conditional guard is good defensive programming.
        ──────────────────────────────────────────────────────────── */}
        {user && (
          <div className="header-user">
            {/* User avatar — first letter of their name */}
            <div className="user-avatar" title={user.email}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{user.name.split(' ')[0]}</span>
            <button
              className="btn-logout"
              onClick={handleLogout}
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        )}

        {/* ThemeToggle reads ThemeContext directly — unchanged */}
        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header
