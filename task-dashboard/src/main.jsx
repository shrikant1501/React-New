// main.jsx — Phase 10: AuthProvider added to provider tree.
//
// PROVIDER ORDER (Phase 10):
// ─────────────────────────────────────────────────────────────────────────
//   BrowserRouter        → routing context (must be outermost)
//   AuthProvider         → NEW: auth state (user, token, login, logout)
//   QueryClientProvider  → server-state cache
//   ThemeProvider        → UI theme
//   TaskProvider         → task data (uses React Query internally)
//   App                  → route tree
//
// WHY AuthProvider BEFORE QueryClientProvider?
// ─────────────────────────────────────────────────────────────────────────
// AuthProvider is above QueryClientProvider so that in future phases,
// if we need to access the auth token inside React Query's queryFn callbacks
// (e.g. for token refresh on 401), we could do so via context or closure.
//
// In our current implementation, taskApi.js reads the token directly from
// localStorage — so the order doesn't strictly matter for now. But the
// correct architectural position for auth is near the top of the tree,
// wrapping everything that might need auth state.
//
// WHY AuthProvider AFTER BrowserRouter?
// ─────────────────────────────────────────────────────────────────────────
// AuthContext itself doesn't need routing. But AuthProvider's consumers
// (LoginPage, ProtectedRoute) use useNavigate and useLocation.
// Those hooks require BrowserRouter to be in the tree above them.
// Since AuthProvider's consumers are inside the tree, BrowserRouter just
// needs to be somewhere above those components — which it is.
//
// SUMMARY OF ALL PROVIDERS:
// ─────────────────────────────────────────────────────────────────────────
//   BrowserRouter        → makes routing hooks available (useNavigate, etc.)
//   AuthProvider         → makes useAuth() available (user, login, logout)
//   QueryClientProvider  → makes useQuery/useMutation available
//   ThemeProvider        → makes useTheme() available
//   TaskProvider         → makes useTasks()/useTaskDispatch() available

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { TaskProvider } from './context/TaskContext'
import App from './App.jsx'
import './index.css'

// QueryClient — created outside the component so it's never re-created on re-render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TaskProvider>
              <App />
            </TaskProvider>
          </ThemeProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
