# Phase 8 — React Router

---

## 1. Goal of This Phase

By the end of this phase you will understand:
- Why client-side routing exists and how it differs from server-side routing
- How React Router works internally (History API, location matching, rendering)
- Every core primitive: `BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`, `Outlet`, `Navigate`
- Every core hook: `useParams`, `useNavigate`, `useLocation`, `useSearchParams`
- Nested routes and shared layouts — the most important pattern in real apps
- URL parameters vs query parameters — when to use each
- Protected routes — the UI-layer auth guard pattern
- How we refactored the Task Dashboard to be URL-driven

---

## 2. Why React Router Exists — The Problem It Solves

### Traditional Multi-Page App (MPA)
```
User clicks a link
  → Browser sends GET /settings to server
  → Server returns a brand-new HTML page
  → Browser destroys current page, mounts new page
  → Full reload: CSS re-parsed, JS re-executed, state lost
```

### Single-Page App (SPA) Problem
React gives us one HTML file (`index.html`). The URL never changes by default.  
If the user refreshes on `/tasks/5` — the browser asks the server for `/tasks/5`  
and gets a 404 because the server only knows about `/` (or `index.html`).

**React Router solves this** by:
1. Intercepting browser navigation events (clicks, back/forward)
2. Updating the URL using the **History API** (no server request)
3. Re-rendering the matching React components for the new URL
4. Configuring the dev server (Vite) to serve `index.html` for ALL routes

The user sees URL changes. The server is never contacted. React handles everything.

---

## 3. How React Router Works Internally

### The History API (JavaScript Foundation)
React Router is built on top of the browser's native History API:

```javascript
// These are the native browser APIs React Router uses under the hood:
window.history.pushState(state, title, '/tasks')    // change URL, add to history
window.history.replaceState(state, title, '/tasks') // change URL, replace current entry
window.addEventListener('popstate', handler)         // fires on back/forward buttons
```

**Key insight**: `pushState` changes the URL in the address bar WITHOUT making a server request.  
React Router wraps this in a clean API so you never call it directly.

### Internal Flow — What Happens When You Click a `<Link>`

```
User clicks <Link to="/settings">
  ↓
React Router intercepts the click (prevents default browser navigation)
  ↓
Calls window.history.pushState({}, '', '/settings')
  ↓
URL in address bar updates to /settings — NO server request
  ↓
React Router's internal location state updates
  ↓
BrowserRouter re-renders all its children
  ↓
<Routes> scans its child <Route> list top-to-bottom
  ↓
Finds <Route path="/settings" element={<SettingsPage />} />
  ↓
Renders <SettingsPage /> in place of the previous match
  ↓
React's reconciler diffs the old and new trees
  ↓
Only changed components re-render (DashboardLayout stays mounted!)
```

### The Location Object
At any time React Router maintains a **location object**:
```javascript
{
  pathname: '/tasks/5',    // the path segment
  search:   '?filter=done', // query string (with ?)
  hash:     '',             // hash fragment
  state:    null,           // state passed via navigate() or <Navigate>
  key:      'ax7zq1'        // unique key for this history entry
}
```
All routing hooks (`useParams`, `useSearchParams`, `useLocation`) read from this object.

### Route Matching Algorithm
`<Routes>` uses a **best-match** algorithm (not first-match like older React Router v5):
- Specificity wins: `/tasks/5` matches `/tasks/:taskId` before `*`
- Static segments beat dynamic: `/tasks/settings` beats `/tasks/:taskId` for that URL
- The `*` catch-all only matches if nothing else does

---

## 4. Core Concepts

### 4.1 BrowserRouter
The **context provider** for all routing. Must wrap everything that uses routing.

```jsx
// main.jsx
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

**What it does internally:**
- Creates a React context with the current location, history object, and navigation functions
- Subscribes to `popstate` (back/forward) events on `window`
- Re-renders the tree whenever the URL changes

**Rule**: There must be exactly ONE `BrowserRouter` in your app, at the root.

---

### 4.2 Routes and Route
`<Routes>` is the container. `<Route>` defines what renders at each path.

```jsx
// App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/"         element={<Navigate to="/tasks" replace />} />
      <Route element={<DashboardLayout />}>
        <Route path="/tasks"          element={<TasksPage />} />
        <Route path="/tasks/:taskId"  element={<TaskDetailPage />} />
        <Route path="/settings"       element={<SettingsPage />} />
      </Route>
      <Route path="*"         element={<NotFoundPage />} />
    </Routes>
  )
}
```

**Key points:**
- `path="*"` is the catch-all — always place it LAST
- A `<Route>` with no `path` is a **layout route** — it renders for all child paths
- `:taskId` is a **URL parameter** (dynamic segment) — captured by `useParams()`

---

### 4.3 Nested Routes and Outlet — The Most Important Pattern

**The problem**: `/tasks`, `/tasks/5`, and `/settings` all share the same Header + Sidebar.  
Without nested routes: every navigation would destroy and recreate the entire layout.  
With nested routes: the layout stays mounted, only the "page slot" changes.

```jsx
// App.jsx — layout route with no path
<Route element={<DashboardLayout />}>      {/* parent: renders for all children */}
  <Route path="/tasks"         element={<TasksPage />} />
  <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
  <Route path="/settings"      element={<SettingsPage />} />
</Route>
```

```jsx
// DashboardLayout.jsx — the persistent shell
import { Outlet } from 'react-router-dom'

function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Header />                    {/* stays mounted — never re-created */}
      <div className="dashboard-body">
        <Sidebar />                 {/* stays mounted — never re-created */}
        <main className="dashboard-main">
          <Outlet />                {/* ← child route renders HERE */}
        </main>
      </div>
    </div>
  )
}
```

**`<Outlet />`** is the slot where the matched child component renders.  
Think of it as `{children}` but controlled by the URL instead of a parent component.

**Navigation between /tasks → /settings:**
```
Before: DashboardLayout → TasksPage    (in Outlet)
After:  DashboardLayout → SettingsPage (in Outlet)

DashboardLayout: NOT unmounted — same instance stays alive
TasksPage:       unmounts
SettingsPage:    mounts fresh
```

This means: Header state persists, Sidebar stays highlighted correctly, no layout flash.

---

### 4.4 Link vs NavLink

Both render an `<a>` tag that navigates without a full page reload.

```jsx
import { Link, NavLink } from 'react-router-dom'

// Link — basic navigation
<Link to="/tasks">Go to Tasks</Link>
<Link to="/tasks" replace>Go (replace history)</Link>

// NavLink — Link that knows if it's active
<NavLink
  to="/tasks"
  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
>
  Tasks
</NavLink>

// NavLink also accepts style as a function
<NavLink
  to="/tasks"
  style={({ isActive }) => ({ color: isActive ? 'blue' : 'gray' })}
>
  Tasks
</NavLink>
```

**Key difference**: `NavLink` receives `{ isActive, isPending }` in its `className` and `style` props.  
`isActive` is `true` when the current URL matches (or starts with) the `to` path.

**When to use which:**
| Use `Link` | Use `NavLink` |
|---|---|
| General navigation (back buttons, detail pages) | Navigation menus, sidebars, tabs |
| When you don't need active state | When you need to highlight the current page |

---

### 4.5 Navigate Component
Declarative redirect — renders nothing, immediately redirects.

```jsx
import { Navigate } from 'react-router-dom'

// Redirect / → /tasks
<Route path="/" element={<Navigate to="/tasks" replace />} />

// Conditional redirect (used in ProtectedRoute)
if (!isAuthenticated) {
  return <Navigate to="/login" state={{ from: location }} replace />
}
```

**`replace` prop**: Uses `replaceState` instead of `pushState` — the redirect doesn't appear in history.  
Without `replace`: user clicks back → lands on `/` → immediately redirected again (infinite loop feel).  
With `replace`: `/` never appears in history, back button skips it cleanly.

---

### 4.6 useNavigate — Programmatic Navigation
```jsx
import { useNavigate } from 'react-router-dom'

function TaskDetailPage() {
  const navigate = useNavigate()

  function handleDelete() {
    deleteTask(task.id)
    navigate('/tasks', { replace: true })  // go to /tasks, replace history entry
  }

  function handleBack() {
    navigate(-1)  // go back one step in browser history
    // navigate(1)  // go forward
    // navigate(-2) // go back two steps
  }
}
```

**Options:**
```javascript
navigate('/path')                        // push to history
navigate('/path', { replace: true })     // replace current history entry
navigate('/path', { state: { from: location } }) // pass state
navigate(-1)                             // relative: go back
```

**When to use `useNavigate` vs `<Link>`:**
| Use `<Link>` | Use `useNavigate` |
|---|---|
| User explicitly clicks to go somewhere | Navigate after an action (delete, submit, login) |
| Static navigation | Dynamic/conditional navigation |
| Render-time navigation | Event handler navigation |

---

### 4.7 useParams — URL Parameters

URL parameters are **dynamic segments** in the path, prefixed with `:`.

```jsx
// Route definition
<Route path="/tasks/:taskId" element={<TaskDetailPage />} />

// Component
import { useParams } from 'react-router-dom'

function TaskDetailPage() {
  const { taskId } = useParams()
  // For URL /tasks/42 → taskId === "42"  (ALWAYS a string)

  // Always parse to number when comparing to numeric IDs
  const task = tasks.find(t => t.id === Number(taskId))
}
```

**Critical rule**: `useParams` always returns **strings**.  
`taskId === 42` is always `false`. Always use `Number(taskId)` or `parseInt(taskId)`.

**Multiple params:**
```jsx
<Route path="/teams/:teamId/players/:playerId" element={<PlayerPage />} />
// useParams() → { teamId: "3", playerId: "7" }
```

---

### 4.8 useSearchParams — Query Parameters

Query parameters are the `?key=value` part of the URL. They represent **optional, bookmarkable state**.

```jsx
import { useSearchParams } from 'react-router-dom'

function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // READ: ?filter=done → 'done'  |  no param → null
  const activeFilter = searchParams.get('filter') || 'all'

  // WRITE: updates the URL, causes re-render
  function handleFilterChange(newFilter) {
    if (newFilter === 'all') {
      setSearchParams({})                    // removes all params
    } else {
      setSearchParams({ filter: newFilter }) // ?filter=done
    }
  }
}
```

**The `useSearchParams` API mirrors `useState`:**
```javascript
const [searchParams, setSearchParams] = useSearchParams()
//     ↑ read object         ↑ write function (same pattern as useState)
```

**Reading values:**
```javascript
searchParams.get('filter')        // single value or null
searchParams.getAll('tag')        // array (for ?tag=a&tag=b)
searchParams.has('filter')        // boolean
searchParams.toString()           // "filter=done"
```

---

### 4.9 useLocation — Reading the Full Location Object

```jsx
import { useLocation } from 'react-router-dom'

function SomeComponent() {
  const location = useLocation()
  // {
  //   pathname: '/tasks/5',
  //   search: '?filter=done',
  //   hash: '',
  //   state: { from: '/settings' },
  //   key: 'ax7zq1'
  // }
}
```

**Common use cases:**
1. Reading `location.state` — data passed via `navigate` or `<Navigate state={...}>`
2. Logging/analytics — knowing which page the user came from
3. Passing redirect destinations in auth flows

---

## 5. URL Parameters vs Query Parameters — When to Use Each

This is a critical design decision. Wrong choice leads to bad UX and unfixable URLs.

| Aspect | URL Parameter (`:id`) | Query Parameter (`?filter=`) |
|---|---|---|
| **Syntax** | `/tasks/:taskId` → `/tasks/5` | `/tasks?filter=done` |
| **Required?** | Yes — part of the path | No — optional |
| **Represents** | A specific resource identity | Optional filtering/sorting/paging |
| **Without it** | Route doesn't match | Route still matches |
| **Example** | `/users/42`, `/products/iphone` | `?sort=asc&page=2&filter=done` |
| **Use when** | Identifying a unique resource | Filtering, sorting, searching |

**Rule of thumb:**
- "Which thing am I looking at?" → URL parameter (`:id`)
- "How am I viewing it?" → Query parameter (`?sort=`, `?filter=`)

---

## 6. Protected Routes — The Auth Guard Pattern

```jsx
// components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom'

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}  // remember where they were going
        replace                      // don't add protected route to history
      />
    )
  }

  return children
}

// Usage in App.jsx
<Route path="/admin" element={
  <ProtectedRoute>
    <AdminPage />
  </ProtectedRoute>
} />
```

**How login can redirect back after auth:**
```jsx
function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  function handleLogin() {
    // authenticate user...
    navigate(from, { replace: true })  // send them where they wanted to go
  }
}
```

**⚠️ Critical Security Note:**
ProtectedRoute is **UX protection only**, NOT security.  
A user can bypass it by:
- Setting `localStorage.setItem('isAuthenticated', 'true')` in DevTools
- Disabling JavaScript

**Real security lives in your backend API.** Every API call must be authenticated server-side.  
ProtectedRoute simply prevents unauthorized users from seeing pages — the API must still validate tokens.

---

## 7. State Architecture Decision — Where Does State Live?

This phase introduced a critical insight: state can live in 4 different places.

```
┌─────────────────────────────────────────────────────────┐
│  Where should this state live?                          │
├──────────────────────┬──────────────────────────────────┤
│  Local State         │  Only one component needs it     │
│  (useState)          │  e.g. modal open/close, input    │
├──────────────────────┼──────────────────────────────────┤
│  Context             │  Many unrelated components need  │
│  (useContext)        │  it. e.g. tasks, theme, auth     │
├──────────────────────┼──────────────────────────────────┤
│  URL State           │  Should be bookmarkable/shareable│
│  (useSearchParams)   │  e.g. filters, sort, search term │
├──────────────────────┼──────────────────────────────────┤
│  URL Parameter       │  Identifies a specific resource  │
│  (useParams)         │  e.g. /tasks/:taskId             │
└──────────────────────┴──────────────────────────────────┘
```

**Phase 7 → Phase 8 architectural change:**
- Phase 7: Active filter lived in `FilterContext` (React state)
- Phase 8: Active filter moved to URL query params (`?filter=done`)
- Result: Filter is now bookmarkable, shareable, refresh-safe, history-aware

---

## 8. Project Structure — What Changed in Phase 8

```
src/
├── main.jsx                    ← BrowserRouter added here (wraps everything)
├── App.jsx                     ← Now purely a route configuration file
│
├── pages/                      ← NEW FOLDER — route-level components
│   ├── TasksPage.jsx           ← /tasks — uses useSearchParams for filter
│   ├── TaskDetailPage.jsx      ← /tasks/:taskId — uses useParams, useNavigate
│   ├── SettingsPage.jsx        ← /settings
│   └── NotFoundPage.jsx        ← * catch-all 404
│
└── components/
    ├── DashboardLayout.jsx     ← NEW — persistent shell with <Outlet />
    ├── Sidebar.jsx             ← NEW — NavLink with isActive pattern
    ├── ProtectedRoute.jsx      ← NEW — auth guard pattern
    └── TaskListSection.jsx     ← CHANGED — filter now comes as prop from URL
```

**The `pages/` vs `components/` distinction:**
- `pages/`: Components rendered directly by a `<Route>` — one per URL
- `components/`: Reusable pieces used inside pages — no direct Route binding

---

## 9. Full Code Walk-Through

### main.jsx — Provider Order
```jsx
<StrictMode>
  <BrowserRouter>           {/* 1. Routing context — must be outermost */}
    <ThemeProvider>         {/* 2. Theme context */}
      <TaskProvider>        {/* 3. Task data context */}
        <App />
      </TaskProvider>
    </ThemeProvider>
  </BrowserRouter>
</StrictMode>
```
`BrowserRouter` must be the outermost wrapper because `ThemeProvider` and `TaskProvider`  
may internally use navigation hooks in future — and because `App.jsx` uses `Routes`.

### App.jsx — Route Tree
```jsx
<Routes>
  {/* 1. Redirect root to /tasks */}
  <Route path="/" element={<Navigate to="/tasks" replace />} />

  {/* 2. Layout route — DashboardLayout wraps all dashboard pages */}
  <Route element={<DashboardLayout />}>
    <Route path="/tasks"          element={<TasksPage />} />
    <Route path="/tasks/:taskId"  element={<TaskDetailPage />} />
    <Route path="/settings"       element={<SettingsPage />} />
  </Route>

  {/* 3. 404 catch-all — MUST be last */}
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

### TasksPage.jsx — URL as State
```jsx
function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('filter') || 'all'

  function handleFilterChange(newFilter) {
    if (newFilter === 'all') {
      setSearchParams({})                      // clean URL: /tasks
    } else {
      setSearchParams({ filter: newFilter })   // /tasks?filter=done
    }
  }

  return (
    <TaskListSection
      activeFilter={activeFilter}
      onFilterChange={handleFilterChange}
    />
  )
}
```

### TaskDetailPage.jsx — useParams + useNavigate
```jsx
function TaskDetailPage() {
  const { taskId } = useParams()    // "5" — always a string
  const navigate = useNavigate()

  const task = tasks.find(t => t.id === Number(taskId))  // parse to number!

  if (!task) return <div>Task not found <Link to="/tasks">Back</Link></div>

  function handleDelete() {
    deleteTask(task.id)
    navigate('/tasks', { replace: true })  // redirect after action
  }
}
```

### TaskRow — Link wrapping a card
```jsx
// Each task card IS a link — clicking it navigates to the detail page
<Link to={`/tasks/${id}`} className={`task-card task-card-${status}`}>
  <div className="task-card-header">
    <h3>{title}</h3>
    <div className="task-card-actions">
      {/* e.preventDefault() + e.stopPropagation() prevent the Link from firing */}
      <button onClick={handleStatusClick}><StatusBadge status={status} /></button>
      <button onClick={handleDelete}>✕</button>
    </div>
  </div>
</Link>
```

**The `e.preventDefault()` + `e.stopPropagation()` pattern** is critical here:  
Clicking the delete/status button must NOT trigger the Link navigation.  
`preventDefault` cancels the link's default behaviour.  
`stopPropagation` stops the click from bubbling up to the Link.

---

## 10. Best Practices

1. **Place `BrowserRouter` at the very root** — above all other providers
2. **Put `pages/` and `components/` in separate folders** — one is route-bound, one is reusable
3. **Use `replace` on redirect routes** — `<Navigate replace>` and `navigate('/path', { replace: true })`
4. **Always parse useParams strings** — `Number(taskId)`, never `taskId === 42`
5. **Use `<Link>` for navigation, `useNavigate` for post-action redirects**
6. **Place catch-all `path="*"` last** — route matching is top-to-bottom, specificity-based
7. **Keep URL state in the URL** — filters, sort, page number → `useSearchParams`
8. **Pass `state={{ from: location }}` in auth redirects** — enables redirect-back-after-login
9. **Use `NavLink` only in navigation menus** — don't use it for general links
10. **Never put `<Routes>` inside `<Routes>`** — use nested `<Route>` instead

---

## 11. Common Mistakes

### Mistake 1: Forgetting to parse useParams
```jsx
// ❌ WRONG — taskId is a string, task.id is a number → always undefined
const task = tasks.find(t => t.id === taskId)

// ✅ CORRECT
const task = tasks.find(t => t.id === Number(taskId))
```

### Mistake 2: Using `<a href>` instead of `<Link>`
```jsx
// ❌ WRONG — full page reload, loses all React state
<a href="/tasks">Tasks</a>

// ✅ CORRECT — client-side navigation, preserves state
<Link to="/tasks">Tasks</Link>
```

### Mistake 3: BrowserRouter not at the root
```jsx
// ❌ WRONG — useNavigate/useParams used outside BrowserRouter context
function App() {
  return (
    <TaskProvider>
      <BrowserRouter>    {/* Too late — TaskProvider can't use routing */}
        <Routes>...</Routes>
      </BrowserRouter>
    </TaskProvider>
  )
}
```

### Mistake 4: Missing `replace` on redirect routes
```jsx
// ❌ Without replace: clicking back from /tasks goes to / then redirects again
<Route path="/" element={<Navigate to="/tasks" />} />

// ✅ With replace: / is skipped in history entirely
<Route path="/" element={<Navigate to="/tasks" replace />} />
```

### Mistake 5: Catch-all route placed first
```jsx
// ❌ WRONG — * matches everything, /tasks never reached
<Route path="*"     element={<NotFoundPage />} />
<Route path="/tasks" element={<TasksPage />} />

// ✅ CORRECT — specific routes first, catch-all last
<Route path="/tasks" element={<TasksPage />} />
<Route path="*"     element={<NotFoundPage />} />
```

### Mistake 6: Using `useNavigate` inside event handlers before auth
```jsx
// ❌ Calling navigate during render
function Component() {
  const navigate = useNavigate()
  navigate('/tasks')  // WRONG — this runs every render, not as a side effect
}

// ✅ Correct — navigate inside handlers or useEffect
function handleSubmit() {
  navigate('/tasks')  // after form submit
}
```

---

## 12. Performance Considerations

### Nested Routes = Zero Layout Re-Mounts
The biggest performance win of nested routes: `DashboardLayout`, `Header`, and `Sidebar`  
are **never unmounted** when navigating between `/tasks`, `/tasks/5`, and `/settings`.  
Without nesting, they would destroy and recreate on every navigation.

### Code Splitting with Lazy Loading (Preview of Phase 13)
In a large app, you can split route components into separate JS bundles:
```jsx
import { lazy, Suspense } from 'react'
const TasksPage     = lazy(() => import('./pages/TasksPage'))
const SettingsPage  = lazy(() => import('./pages/SettingsPage'))

// Then wrap in Suspense — Phase 13 covers this in depth
<Suspense fallback={<div>Loading...</div>}>
  <Routes>...</Routes>
</Suspense>
```
Each page loads only when first visited — not all upfront.

### React.memo on TaskRow
`TaskRow` is wrapped in `memo` — it only re-renders when its own props change.  
Without `memo`, every task re-renders whenever ANY task changes.

---

## 13. React Router v6/v7 vs v5 — Key Differences

| Feature | v5 (old) | v6/v7 (current) |
|---|---|---|
| Route container | `<Switch>` | `<Routes>` |
| Exact matching | `exact` prop required | Exact by default |
| Nested routes | Complex, nested `<Switch>` | Clean nested `<Route>` + `<Outlet>` |
| Redirect | `<Redirect>` component | `<Navigate>` component |
| `useHistory` | `useHistory()` → `.push()` | `useNavigate()` → `navigate()` |
| Route matching | First-match | Best-match (specificity) |
| Layout routes | Workarounds needed | Built-in (pathless route) |

All code in this project uses **React Router DOM v7** (the current standard).

---

## 14. Common Interview Questions

**Q1: What is client-side routing? How does React Router implement it?**  
A: Client-side routing intercepts navigation events, updates the URL using the History API (`pushState`/`replaceState`) without a server request, and re-renders matching React components. React Router wraps this in `BrowserRouter` which provides a React context with the current location. `<Routes>` reads this context, matches the current pathname against `<Route>` definitions, and renders the matching component.

**Q2: What is `<Outlet />` and why is it needed?**  
A: `<Outlet>` is the render slot for child routes in a nested route structure. When `DashboardLayout` has an `<Outlet>`, React Router renders the matched child route's component there. It's the URL-controlled equivalent of React's `{children}` prop. Without it, nested route components have nowhere to render.

**Q3: What's the difference between `Link` and `NavLink`?**  
A: Both render `<a>` tags that navigate without a full reload. `NavLink` additionally receives `{ isActive, isPending }` in its `className` and `style` function props, allowing conditional styling based on whether the current URL matches the link's destination. Use `Link` for general navigation, `NavLink` for navigation menus.

**Q4: What's the difference between URL params and query params? When to use each?**  
A: URL params (`:id`) are part of the path — they identify a required resource (`/tasks/5`). Query params (`?filter=done`) are optional — they describe how to view a resource (filtering, sorting). URL params make the route match or not match. Query params don't affect route matching.

**Q5: What does `replace` do in `<Navigate replace>` or `navigate('/path', { replace: true })`?**  
A: Instead of pushing a new entry onto the history stack, it replaces the current entry. This prevents the replaced URL from appearing in browser history. Essential for redirect routes (`/` → `/tasks`) so the back button doesn't return to `/` and immediately redirect again.

**Q6: Why is ProtectedRoute a UX guard, not real security?**  
A: ProtectedRoute checks client-side state (localStorage flag, context value). A user can manipulate localStorage via DevTools, effectively bypassing the check. Real security requires every API request to include an authentication token that the **server validates**. The server must reject unauthenticated requests regardless of what the React UI shows.

**Q7: What happens when the user refreshes on `/tasks/5` in a Vite dev server?**  
A: The browser sends `GET /tasks/5` to the dev server. Vite (and production servers) must be configured to return `index.html` for all routes (a "historyApiFallback" or catch-all). React Router then reads `/tasks/5` from the URL and renders the correct component. Without this server config, the browser gets a 404.

**Q8: How does `useSearchParams` differ from `useState`?**  
A: Both provide `[value, setter]`. `useState` stores state in memory — it's lost on refresh, not bookmarkable. `useSearchParams` stores state in the URL query string — it survives refresh, is bookmarkable, shareable, and history-aware. The trade-off: URL state is serialized to strings, more verbose to read/write.

---

## 15. Tricky Interview Questions

**Q1: A `<Route>` with no `path` prop — what does it do? When would you use it?**  
A: A pathless route is a **layout route** — it always matches and renders its `element`. Its children are the actual path-bearing routes. Use it to wrap a group of routes with a shared layout (`<DashboardLayout>`) without affecting their URL structure. The layout renders for ALL child paths without adding a path prefix.

**Q2: Why does `useParams` always return strings even if the URL segment looks like a number?**  
A: URLs are text. The History API stores pathnames as strings. React Router parses string segments — it has no type information about what `:taskId` should be. Converting types is the developer's responsibility (`Number()`, `parseInt()`, date parsing, etc.). Forgetting this causes subtle `===` comparison bugs (`"5" !== 5`).

**Q3: What's the difference between navigating with `replace: true` vs `replace: false`?**  
A: With `replace: false` (default), a new history entry is pushed — back button returns to the previous page. With `replace: true`, the current history entry is replaced — back button goes to the page BEFORE the replaced one. Use `replace: true` after actions (login redirect, post-delete redirect) so the action page isn't in history, and for redirect routes (`/ → /tasks`).

**Q4: Can you use `useNavigate` outside a component? What about inside a regular function?**  
A: No. `useNavigate` is a hook — it can only be called at the top level of a React component or custom hook, and the component must be inside the `BrowserRouter` tree. It cannot be used in plain functions, event handlers outside components, or async callbacks (you can store the `navigate` function in a variable and call it later, but the hook call must be at the top level).

**Q5: If two routes could match the same URL, which wins in React Router v6+?**  
A: React Router v6+ uses a **specificity/ranking algorithm**, not first-match. Static segments beat dynamic ones: `/tasks/settings` beats `/tasks/:taskId` for the URL `/tasks/settings`. More specific routes win. This is unlike v5 where you needed `exact` or careful ordering.

**Q6: How would you preserve the scroll position when navigating back?**  
A: React Router doesn't restore scroll position by default. Solutions: (1) `<ScrollRestoration>` component from React Router (for Remix/modern setup), (2) save `window.scrollY` to `location.state` before navigating and restore it in a `useEffect` on the target page, (3) use a `useLayoutEffect` with `window.scrollTo(0, savedPosition)`. This is a real-world concern for infinite scroll / long list pages.

---

## 16. Small Coding Exercises

**Exercise 1:** Create a route `/profile/:username` that renders a profile page showing the username from the URL. If no user is found in a mock array, show "User not found".

**Exercise 2:** Add a `?sort=asc|desc` query parameter to the tasks list. Clicking a Sort button toggles between asc/desc. The URL should update and the sort should survive a page refresh.

**Exercise 3:** Add a `/login` page. Make `/settings` a protected route. When unauthenticated users visit `/settings`, redirect to `/login` with `state={{ from: location }}`. After "logging in" (setting localStorage), redirect back to `/settings`.

**Exercise 4:** Add a breadcrumb component that reads the current URL and renders "Tasks / Task #5" for `/tasks/5` and "Settings" for `/settings`. Use `useLocation` and `useParams`.

**Exercise 5:** Add a second query param to the tasks URL: `?filter=done&priority=high`. Update `useSearchParams` usage to handle both params simultaneously without losing one when updating the other.

---

## 17. Revision Cheat Sheet

```
SETUP
  npm install react-router-dom
  Wrap root with <BrowserRouter> in main.jsx

CORE COMPONENTS
  <Routes>               Container — scans children for matches
  <Route path element>   Defines what renders at a path
  <Route element>        Layout route — no path, always renders
  <Link to>              Navigate without reload
  <NavLink to>           Link + isActive for styling
  <Navigate to replace>  Declarative redirect
  <Outlet />             Slot for child route component

CORE HOOKS
  useNavigate()          → navigate(path, options)
  useParams()            → { paramName: "string" }
  useSearchParams()      → [searchParams, setSearchParams]
  useLocation()          → { pathname, search, hash, state, key }

NAVIGATE OPTIONS
  navigate('/path')                    push
  navigate('/path', { replace: true }) replace
  navigate(-1)                         go back
  navigate('/path', { state: {...} })  with state

ROUTE MATCHING ORDER
  More specific beats less specific
  Static beats dynamic
  * (catch-all) matches last — place it last

URL PARAM vs QUERY PARAM
  /tasks/:id   → required, identifies resource, useParams()
  /tasks?f=x   → optional, filters/sorts, useSearchParams()

NESTED ROUTES
  Parent Route element={<Layout />}
    → renders Header + Sidebar + <Outlet />
  Child Routes render inside <Outlet />
  Layout stays mounted between child navigations

PROTECTED ROUTE PATTERN
  if (!auth) return <Navigate to="/login" state={{ from: location }} replace />
  return children
  ⚠️ UX only — backend must validate every API request

KEY GOTCHAS
  useParams → always strings → Number(id)
  <Navigate> needs replace → avoid history loops
  Catch-all * → must be LAST
  BrowserRouter → must be at ROOT
  navigate() → only in handlers/effects, not render
```

---

## 18. Key Takeaways

1. **React Router intercepts navigation, uses the History API, re-renders matching components — no server request.**
2. **`<BrowserRouter>` provides routing context — exactly one, at the root, above all other code.**
3. **Nested routes + `<Outlet>` enable shared layouts — Header/Sidebar stay mounted, only the page swaps.**
4. **`<NavLink>` knows if it's active — use it in menus/sidebars for automatic active state styling.**
5. **`useParams()` always returns strings — always parse to the correct type before comparing.**
6. **`useSearchParams()` is `useState` synced to the URL — use it for bookmarkable, shareable state (filters, sort, page).**
7. **`useNavigate()` is for programmatic navigation — after actions (submit, delete, login).**
8. **`<Navigate replace>` prevents redirect routes from polluting browser history.**
9. **ProtectedRoute is UX only — real security lives in the backend API.**
10. **State lives in 4 places: local state, context, URL params, URL query params — choose wisely.**
