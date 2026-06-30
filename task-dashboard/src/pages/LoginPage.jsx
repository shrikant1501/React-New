// src/pages/LoginPage.jsx
//
// The login form — the entry point for unauthenticated users.
//
// KEY CONCEPTS DEMONSTRATED:
// ─────────────────────────────────────────────────────────────────────────
// 1. Controlled form with validation (Phase 3/5 patterns applied to auth)
// 2. Async form submission with loading/error states from AuthContext
// 3. Post-login redirect to where the user originally tried to go
//    ("redirect after login" pattern — works with ProtectedRoute from Phase 8)
// 4. useNavigate for programmatic navigation after async operation completes
//
// THE REDIRECT PATTERN:
// ─────────────────────────────────────────────────────────────────────────
// ProtectedRoute passes the blocked URL as router state:
//   <Navigate to="/login" state={{ from: location }} replace />
//
// LoginPage reads that state:
//   const location = useLocation()
//   const from = location.state?.from?.pathname || '/tasks'
//
// After successful login:
//   navigate(from, { replace: true })
//   // → sends the user where they tried to go, not always /tasks
//
// This is the standard "auth redirect" UX pattern used in every real app.

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Read where the user was trying to go before being redirected to /login.
  // Optional chaining (?.) handles the case where the user navigated to /login
  // directly (no 'from' state — default to /tasks).
  const from = location.state?.from?.pathname || '/tasks'

  const { login, isLoading, error } = useAuth()

  // ── Local form state ────────────────────────────────────────────────────
  // Controlled inputs — same pattern as Phase 3 (useState for each field)
  const [email,    setEmail   ] = useState('')
  const [password, setPassword] = useState('')

  // ── Form submit ──────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()               // prevent browser's default form reload
    if (!email || !password) return  // basic guard — button is disabled anyway

    try {
      // login() is async — it calls the API and updates AuthContext state.
      // On success: user is set in AuthContext → isAuthenticated becomes true.
      await login(email, password)

      // Only reached if login succeeded (no error thrown).
      // Navigate to where the user originally tried to go (or /tasks by default).
      // replace: true — don't add /login to history; back button skips it.
      navigate(from, { replace: true })
    } catch {
      // Error is already stored in AuthContext (error state from useAuth).
      // We display it from there — no need to set local error state.
      // The catch here just prevents unhandled promise rejection.
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* ── Branding ──────────────────────────────────────────────── */}
        <div className="login-brand">
          <h1>Task Dashboard</h1>
          <p>Sign in to access your tasks</p>
        </div>

        {/* ── Error Banner ───────────────────────────────────────────
          error comes from AuthContext — set by login() on failure.
          Only shown when error is non-null.
          null && <div> = false — React renders nothing for falsy values.
        ──────────────────────────────────────────────────────────── */}
        {error && (
          <div className="login-error" role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* ── Demo Credentials Helper ────────────────────────────────
          In production you would NOT show credentials.
          This is a teaching aid so you can log in without memorising them.
        ──────────────────────────────────────────────────────────── */}
        <div className="login-demo-hint">
          <p><strong>Demo credentials:</strong></p>
          <p>Email: <code>shrikant@example.com</code></p>
          <p>Password: <code>password123</code></p>
        </div>

        {/* ── Login Form ─────────────────────────────────────────────
          onSubmit on the <form> — fires on Enter key too (not just button click)
          This is better UX than putting onClick on the button.
        ──────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>

          <div className="form-group">
            <div className="form-field-row">
              <label htmlFor="email" className="form-label">
                Email
              </label>
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="form-input"
              autoComplete="email"
              autoFocus           // cursor lands here on page load — good UX
              required
            />
          </div>

          <div className="form-group">
            <div className="form-field-row">
              <label htmlFor="password" className="form-label">
                Password
              </label>
            </div>
            <input
              id="password"
              type="password"      // masks characters — ALWAYS use type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="form-input"
              autoComplete="current-password"
              required
            />
          </div>

          {/*
            Disabled when:
              - isLoading: API call in flight — prevents double-submit
              - !email || !password: form is incomplete
            Shows "Signing in…" during load — user feedback
          */}
          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>

        </form>

      </div>
    </div>
  )
}

export default LoginPage
