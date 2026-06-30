// main.jsx — Phase 9: React Query added.
//
// NEW: QueryClientProvider wraps the entire app.
// QueryClient is the cache — it stores all server data React Query fetches.
// Every useQuery/useMutation call reads from and writes to this cache.
//
// ReactQueryDevtools: a floating panel (bottom-right in dev) that shows:
//   - Every active query and its status (fresh/stale/fetching/error)
//   - Cached data for each query key
//   - The ability to manually refetch or invalidate queries
//   Only included in development builds (tree-shaken in production).
//
// PROVIDER ORDER:
//   BrowserRouter        → routing context
//   QueryClientProvider  → server-state cache
//   ThemeProvider        → UI theme
//   TaskProvider         → local UI state (filter, optimistic UI)
//   App                  → route tree

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from './context/ThemeContext'
import { TaskProvider } from './context/TaskContext'
import App from './App.jsx'
import './index.css'

// QueryClient holds the cache and default configuration.
// Created OUTSIDE the component so it is never re-created on re-render.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime: how long cached data is considered "fresh".
      // During this window, React Query serves cache without refetching.
      // After staleTime, the next mount/focus triggers a background refetch.
      staleTime: 1000 * 60 * 2, // 2 minutes

      // retry: how many times to retry a failed request before showing error.
      retry: 1,

      // refetchOnWindowFocus: automatically refetch when tab regains focus.
      // Great for dashboards — data stays fresh when user switches tabs.
      refetchOnWindowFocus: true,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TaskProvider>
            <App />
          </TaskProvider>
        </ThemeProvider>
        {/* DevTools only renders in development — safe to leave in code */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
