// src/context/AuthContext.jsx
//
// The central authentication context for the entire application.
//
// WHAT THIS CONTEXT PROVIDES:
// ─────────────────────────────────────────────────────────────────────────
//   user            → current user object { id, name, email, role } or null
//   token           → JWT string or null
//   isAuthenticated → boolean — derived from !!user (true when logged in)
//   isInitialising  → boolean — true while checking stored token on app load
//   isLoading       → boolean — true while login API call is in flight
//   error           → string or null — last login error message
//   login(email, password) → async — calls API, stores token, updates state
//   logout()               → sync  — clears storage and state
//
// WHY isInitialising IS CRITICAL:
// ─────────────────────────────────────────────────────────────────────────
// Problem: On app load, we read the token from localStorage and restore the
// session. But this takes one render cycle. During that first render:
//   - user is null (initial useState value)
//   - isAuthenticated is false
//
// Without isInitialising, ProtectedRoute sees isAuthenticated=false and
// immediately redirects to /login — the user sees a flash even though they
// have a valid token stored. Bad UX.
//
// Solution: isInitialising starts as true. We set it to false only AFTER
// we've read and validated the stored token. ProtectedRoute shows a spinner
// while isInitialising is true, then decides whether to redirect.
//
// This is the same pattern used in every production React app with auth.
//
// PROVIDER TREE POSITION:
// ─────────────────────────────────────────────────────────────────────────
// AuthProvider must be ABOVE QueryClientProvider because TaskContext uses
// React Query, and eventually API calls need the token. We'll add it to
// main.jsx:
//   BrowserRouter → AuthProvider → QueryClientProvider → ThemeProvider → TaskProvider

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, decodeToken, isTokenExpired } from '../services/authApi'

// ─── Storage Key ──────────────────────────────────────────────────────────────
// Single constant for the localStorage key — prevents typos across files
const TOKEN_KEY = 'auth_token'

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

// ─── AuthProvider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  // user: the decoded user object, or null when logged out
  const [user,           setUser          ] = useState(null)

  // token: the JWT string, or null when logged out
  const [token,          setToken         ] = useState(null)

  // isInitialising: true from app start until we've checked localStorage.
  // Keeps ProtectedRoute from flashing /login while we restore the session.
  const [isInitialising, setIsInitialising] = useState(true)

  // isLoading: true while login() is waiting for the API response
  const [isLoading,      setIsLoading     ] = useState(false)

  // error: the last login error message, or null
  const [error,          setError         ] = useState(null)

  // ── Session Restoration ──────────────────────────────────────────────────
  // On app mount: check if a valid token is already in localStorage.
  // If yes: restore the session (user appears logged in without re-entering creds).
  // If no (or expired): stay logged out.
  //
  // This runs ONCE — empty dependency array [] means "mount only".
  // Must run before any ProtectedRoute check → that's why isInitialising exists.
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)

    if (storedToken && !isTokenExpired(storedToken)) {
      // Token exists and is not expired — restore the session
      const decoded = decodeToken(storedToken)
      setToken(storedToken)
      setUser(decoded)
      // Note: we trust the decoded payload here because the token was previously
      // validated by the server at login time. In high-security apps, you'd also
      // call GET /auth/me here to re-validate with the backend.
    }
    // Whether we found a valid token or not, initialisation is complete.
    // ProtectedRoute can now make its redirect decision.
    setIsInitialising(false)
  }, [])

  // ── Login ─────────────────────────────────────────────────────────────────
  //
  // useCallback: login is stable across renders (memoised).
  // This matters because login will be in the context value — if it changed
  // on every AuthProvider render, all consumers would re-render unnecessarily.
  //
  // The login flow:
  //   1. Set loading state (shows spinner on login button)
  //   2. Call authApi.login() — this hits the API
  //   3. On success: store token in localStorage + update React state
  //   4. On failure: set error message (shows below the form)
  //   5. Always: clear loading state
  //
  const login = useCallback(async (email, password) => {
    setIsLoading(true)
    setError(null) // clear any previous error

    try {
      // authApi.login returns { user, token }
      const { user: loggedInUser, token: newToken } = await authApi.login(email, password)

      // Persist token so the session survives a page refresh
      localStorage.setItem(TOKEN_KEY, newToken)

      // Update React state — these two setState calls are batched in React 18+
      // (automatic batching). One re-render, not two.
      setToken(newToken)
      setUser(loggedInUser)

      // Return the user so the caller (LoginPage) can navigate after login
      return loggedInUser
    } catch (err) {
      // Error from authApi.login: "Invalid email or password" or network error
      setError(err.message)
      // Re-throw so LoginPage can also handle it if needed
      throw err
    } finally {
      // finally runs whether try succeeded or catch ran — always clears loading
      setIsLoading(false)
    }
  }, []) // [] — no dependencies, this function never needs to change

  // ── Logout ────────────────────────────────────────────────────────────────
  //
  // 1. Remove token from localStorage — session won't be restored on next load
  // 2. Clear React state — isAuthenticated becomes false instantly
  // 3. All ProtectedRoutes re-render with isAuthenticated=false → redirect to /login
  //
  // Note: we do NOT call authApi.logout() here in our mock. In production:
  //   await authApi.logout()  // tells server to invalidate token
  //   then clear local state
  //
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    // error is cleared too — fresh state for next login attempt
    setError(null)
  }, [])

  // ── Context Value ──────────────────────────────────────────────────────────
  //
  // isAuthenticated: derived from user — no separate state needed.
  // When user is set → isAuthenticated is true. When null → false.
  // Boolean coercion: !!null = false, !!{id:1,...} = true
  //
  // Unlike TaskContext, we don't use useMemo here because the value object
  // only changes when one of its fields changes — login, logout, and error
  // are stable (useCallback), user/token/isLoading change only on auth events.
  // The performance impact is negligible for an auth context.
  //
  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isInitialising,
    isLoading,
    error,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Custom Hook ──────────────────────────────────────────────────────────────
//
// The ONLY public API for consuming auth state.
// Components import useAuth(), never AuthContext directly.
// This gives us the freedom to change the internals without updating every consumer.
//
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}
