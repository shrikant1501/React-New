// App.jsx — Phase 10: Authentication added to route tree.
//
// WHAT CHANGED FROM PHASE 8:
// ─────────────────────────────────────────────────────────────────────────
//   Added:    /login route → LoginPage
//   Added:    ProtectedRoute wraps all DashboardLayout routes
//   Updated:  Navigate from / goes to /login if not authenticated (via
//             ProtectedRoute on /tasks which redirects to /login)
//
// ROUTE TREE (Phase 10):
// ─────────────────────────────────────────────────────────────────────────
//   /               → redirect to /tasks → ProtectedRoute → LoginPage (if unauth)
//   /login          → LoginPage (public — no auth required)
//   /tasks          → ProtectedRoute → DashboardLayout > TasksPage
//   /tasks/:taskId  → ProtectedRoute → DashboardLayout > TaskDetailPage
//   /settings       → ProtectedRoute → DashboardLayout > SettingsPage
//   *               → NotFoundPage
//
// WHY WRAP DashboardLayout WITH ProtectedRoute?
// ─────────────────────────────────────────────────────────────────────────
// DashboardLayout wraps all three inner routes (/tasks, /tasks/:id, /settings).
// By placing ProtectedRoute around the layout route's element, we protect ALL
// three child routes with a single ProtectedRoute instance.
//
// Alternative: wrapping each Route individually — more explicit but repetitive.
// Wrapping the layout is the cleaner, DRY approach.
//
// HOW IT WORKS:
//   1. User visits /tasks (not logged in)
//   2. Route matches the layout route → React tries to render DashboardLayout
//   3. But first: ProtectedRoute renders
//   4. ProtectedRoute sees isAuthenticated=false → returns <Navigate to="/login">
//   5. User is redirected to /login with state.from = /tasks
//   6. User logs in → LoginPage navigates to /tasks (from state.from)

import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import TasksPage from './pages/TasksPage'
import TaskDetailPage from './pages/TaskDetailPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <Routes>

      {/* Root redirect — same as before */}
      <Route path="/" element={<Navigate to="/tasks" replace />} />

      {/*
        Public route — NO ProtectedRoute wrapper.
        /login is accessible without authentication.
        If an authenticated user visits /login, we could redirect them to
        /tasks (see the "already logged in" check in LoginPage).
        For simplicity, we don't add that redirect here.
      */}
      <Route path="/login" element={<LoginPage />} />

      {/*
        Protected layout route.
        ProtectedRoute wraps DashboardLayout — all nested routes are protected.
        If not authenticated: ProtectedRoute redirects to /login.
        If authenticated: DashboardLayout renders with <Outlet />.
      */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* These three routes are all protected via the layout above */}
        <Route path="/tasks"          element={<TasksPage />}      />
        <Route path="/tasks/:taskId"  element={<TaskDetailPage />} />
        <Route path="/settings"       element={<SettingsPage />}   />
      </Route>

      {/* Catch-all — still public, no ProtectedRoute needed */}
      <Route path="*" element={<NotFoundPage />} />

    </Routes>
  )
}

export default App
