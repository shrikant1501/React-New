// components/ProtectedRoute.jsx — Phase 10: Upgraded to use AuthContext.
//
// WHAT CHANGED FROM PHASE 8:
// ─────────────────────────────────────────────────────────────────────────
// Before: Read a localStorage flag ('isAuthenticated') directly.
//   Problem 1: Logout didn't instantly re-render — it required a page reload
//              for the flag change to be detected.
//   Problem 2: Vulnerable to manipulation (user sets localStorage manually).
//   Problem 3: No isInitialising awareness — caused flash-to-login on reload.
//
// After: Reads from AuthContext via useAuth().
//   ✅ Logout instantly re-renders all ProtectedRoutes (React state change)
//   ✅ Handles isInitialising — shows spinner while session is being restored
//   ✅ Consistent auth source — one place (AuthContext) owns auth truth
//
// THE isInitialising GUARD:
// ─────────────────────────────────────────────────────────────────────────
// App loads → AuthProvider mounts → reads localStorage (synchronous!) →
// sets user + token → sets isInitialising=false.
//
// BUT useState is async in React. The initial render fires BEFORE the
// useEffect in AuthProvider runs. So:
//
//   Render 1: user=null, isInitialising=true  → show spinner (not login page)
//   useEffect runs: token found → setUser(decoded), setIsInitialising(false)
//   Render 2: user={...}, isInitialising=false → show children (user is logged in)
//
// Without this guard, Render 1 sees isAuthenticated=false and redirects to /login
// — the user sees a flash of the login page even though they're logged in.
//
// USAGE (unchanged from Phase 8):
//   <Route path="/tasks" element={
//     <ProtectedRoute>
//       <TasksPage />
//     </ProtectedRoute>
//   } />

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitialising } = useAuth()
  const location = useLocation()

  // ── Initialising guard ────────────────────────────────────────────────
  // While AuthProvider is restoring the session from localStorage, we don't
  // know yet if the user is logged in. Show nothing (or a spinner) instead
  // of prematurely redirecting to /login.
  if (isInitialising) {
    // In a more polished app, return a full-screen loading spinner here.
    // null renders nothing — the page stays blank for the ~1ms it takes
    // to read localStorage. Fast enough to be imperceptible.
    return null
  }

  // ── Auth check ────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    // Not logged in — redirect to /login.
    // Pass current location as state so LoginPage can redirect back after login.
    // replace: don't add the protected route to history stack
    //   (so Back after login doesn't loop back to the protected route)
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  // ── Authenticated — render the protected content ─────────────────────
  return children
}

export default ProtectedRoute
