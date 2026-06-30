// App.jsx — Phase 13: Code splitting with React.lazy + Suspense + ErrorBoundary.
//
// WHAT CHANGED FROM PHASE 10:
// ─────────────────────────────────────────────────────────────────────────
// Before: All page components are eagerly imported at the top.
//         Every page's JavaScript is bundled into ONE file and downloaded
//         on first load — even pages the user may never visit.
//
// After:  Pages are lazily imported via React.lazy().
//         Each page becomes a SEPARATE CHUNK — downloaded on demand.
//         The initial bundle shrinks. Users download only what they need.
//
// HOW React.lazy WORKS:
// ─────────────────────────────────────────────────────────────────────────
// React.lazy(() => import('./pages/TasksPage'))
//
// import() is a dynamic import — a browser/bundler feature (not React-specific).
// It returns a Promise that resolves to the module.
// Vite sees dynamic imports and creates separate JS files (chunks) for them.
//
// When the user navigates to /tasks for the first time:
//   1. React sees <TasksPage /> needs to render
//   2. The lazy wrapper starts the import() Promise
//   3. <Suspense fallback={<Loading />}> renders the fallback while it loads
//   4. Promise resolves → TasksPage renders → Suspense shows the real content
//
// On subsequent visits: the chunk is cached by the browser — instant load.
//
// WHAT Suspense DOES:
// ─────────────────────────────────────────────────────────────────────────
// Suspense is a boundary that catches Promises thrown by its children.
// React.lazy works by throwing a Promise during render (when the chunk isn't
// loaded yet). Suspense catches that Promise and renders `fallback` until
// the Promise resolves.
//
// This is not magic — it's an intentional React mechanism called
// "throw-based suspense". Any library can integrate with Suspense by
// throwing a Promise (React Query does this with its useSuspenseQuery).
//
// ERRORBOUNDARY PLACEMENT:
// ─────────────────────────────────────────────────────────────────────────
// ErrorBoundary wraps the ENTIRE Routes tree.
// If any route component crashes during render, ErrorBoundary catches it
// and shows the fallback UI instead of a blank white screen.
//
// The hierarchy:
//   ErrorBoundary          ← catches render errors from any child
//     Suspense             ← shows loading spinner during lazy chunk download
//       Routes             ← route matching
//         ProtectedRoute   ← auth guard
//           DashboardLayout + pages

import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'

// ── Lazy imports ──────────────────────────────────────────────────────────────
//
// React.lazy() takes a function that returns a dynamic import().
// The function is NOT called immediately — only when the component first renders.
//
// Each of these becomes a separate JS chunk in the Vite build output.
// You'll see them in the build output:
//   dist/assets/TasksPage-Bx4kQ2.js
//   dist/assets/LoginPage-Cy5mR3.js
//   etc.
//
// DashboardLayout and ProtectedRoute are NOT lazy — they're needed immediately
// on every authenticated route. Lazy-loading them would add delay to every page.
import DashboardLayout from './components/DashboardLayout'

const TasksPage      = lazy(() => import('./pages/TasksPage'))
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'))
const SettingsPage   = lazy(() => import('./pages/SettingsPage'))
const NotFoundPage   = lazy(() => import('./pages/NotFoundPage'))
const LoginPage      = lazy(() => import('./pages/LoginPage'))

// ── Route-level loading fallback ──────────────────────────────────────────────
// Shown during the brief window while a lazy chunk downloads.
// In a real app: a skeleton that matches the page layout.
// Here: a minimal centred spinner.
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner" />
    </div>
  )
}

function App() {
  return (
    // ErrorBoundary: catches any render error from any page component.
    // Without this, a crash in TasksPage shows a blank white screen.
    // With this: shows a "Something went wrong" UI with a retry button.
    <ErrorBoundary>
      {/*
        Suspense: renders <PageLoader /> while any lazy chunk is downloading.
        ONE Suspense boundary for all routes — simpler than one per route.
        If you want per-route fallbacks, nest Suspense inside each Route element.
      */}
      <Suspense fallback={<PageLoader />}>
        <Routes>

          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/tasks"         element={<TasksPage />}      />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/settings"      element={<SettingsPage />}   />
          </Route>

          <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
