// components/DashboardLayout.jsx
// The persistent outer shell that wraps all dashboard pages.
// Renders: Header (top) + Sidebar (left) + <Outlet /> (main content)
//
// NESTED ROUTES EXPLAINED:
// When a user navigates to /tasks, React Router:
//   1. Renders DashboardLayout (the parent route's element)
//   2. Renders TasksPage inside the <Outlet /> (the child route's element)
// When they navigate to /settings:
//   1. DashboardLayout STAYS mounted — Header and Sidebar don't unmount/remount
//   2. Only the <Outlet /> content changes — TasksPage unmounts, SettingsPage mounts
//
// This is the power of nested routes — shared UI persists, only the "page" swaps.
// Without this: every navigation would destroy and recreate the entire layout.
//
// OUTLET: the slot where child route components render.
// Think of it like React's {children} prop, but controlled by the URL.

import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Header />
      <div className="dashboard-body">
        <Sidebar />
        <main className="dashboard-main">
          {/*
            <Outlet /> renders the matched child route's component.
            When URL is /tasks       → renders <TasksPage />
            When URL is /tasks/5     → renders <TaskDetailPage />
            When URL is /settings    → renders <SettingsPage />
          */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
