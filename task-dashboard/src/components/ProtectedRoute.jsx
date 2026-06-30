// components/ProtectedRoute.jsx
// Wraps routes that require authentication.
// If the user is not authenticated, redirects to /login.
// Passes the original destination as location state so login can redirect back.
//
// SECURITY NOTE:
// This protects the UI only — it does NOT secure your data.
// A user can bypass this by manipulating localStorage or disabling JS.
// Real security lives in your backend API — every API call must be
// authenticated server-side regardless of what the frontend shows.
// ProtectedRoute is UX protection, not security.
//
// USAGE:
//   <Route path="/admin" element={
//     <ProtectedRoute requiredRole="admin">
//       <AdminPage />
//     </ProtectedRoute>
//   } />

import { Navigate, useLocation } from 'react-router-dom'

// For this phase we simulate auth with a simple localStorage flag.
// In a real app, this would come from an AuthContext (Phase 9 pattern).
function useSimpleAuth() {
  // Check localStorage for a simple auth flag — for demo purposes only
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  return { isAuthenticated }
}

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated } = useSimpleAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // <Navigate> is React Router's redirect component.
    // replace: true — don't add the protected route to history
    //   (so back button after login doesn't send back to the protected route)
    // state: pass where the user was trying to go so login can redirect there
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute
