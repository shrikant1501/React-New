// App.jsx — Phase 8: Route configuration.
// App now defines the route tree instead of direct layout.
// BrowserRouter is in main.jsx — App defines what renders at each URL.
//
// ROUTE TREE:
//   /               → redirect to /tasks
//   /tasks          → DashboardLayout > TasksPage        (nested route)
//   /tasks/:taskId  → DashboardLayout > TaskDetailPage   (nested route)
//   /settings       → DashboardLayout > SettingsPage     (nested route)
//   *               → NotFoundPage                        (catch-all)
//
// NESTED ROUTES EXPLAINED:
// Routes /tasks, /tasks/:taskId, and /settings all share DashboardLayout.
// DashboardLayout renders Header + Sidebar + <Outlet />.
// <Outlet /> is where the child route component (TasksPage, etc.) renders.
// When navigating between these routes, DashboardLayout STAYS mounted —
// only the content inside <Outlet /> changes.
//
// This is why Header doesn't flash, Sidebar doesn't disappear, and
// any sidebar animations don't reset on navigation.

import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './components/DashboardLayout'
import TasksPage from './pages/TasksPage'
import TaskDetailPage from './pages/TaskDetailPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      {/*
        Redirect root to /tasks.
        <Navigate> is the declarative equivalent of calling navigate() in code.
        replace: don't add '/' to history — back button won't return to '/'
      */}
      <Route path="/" element={<Navigate to="/tasks" replace />} />

      {/*
        Layout route: path="/*" means "this route handles all sub-paths".
        DashboardLayout renders for ALL paths starting with /.
        Its <Outlet /> renders the matched child route.
      */}
      <Route element={<DashboardLayout />}>

        {/* /tasks — the main tasks list */}
        <Route path="/tasks" element={<TasksPage />} />

        {/*
          /tasks/:taskId — individual task detail
          :taskId is a URL parameter — accessible via useParams() in TaskDetailPage
          e.g. /tasks/42 → useParams() returns { taskId: "42" }
        */}
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />

        {/* /settings */}
        <Route path="/settings" element={<SettingsPage />} />

      </Route>

      {/*
        Catch-all — matches any URL not matched by routes above.
        Place LAST — React Router tries routes in order, top to bottom.
        If this were first, it would match everything.
      */}
      <Route path="*" element={<NotFoundPage />} />

    </Routes>
  )
}

export default App
