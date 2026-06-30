# Phase 9 — API Integration

---

## 1. Goal of This Phase

Every React app eventually needs to talk to a server.
This phase teaches you everything between clicking a button and seeing fresh data on screen:

- Why the browser can run network requests without freezing the UI (Event Loop)
- Promises and async/await — the JavaScript foundation for all async work
- The 3-state async machine: `loading → success/error`
- `fetch` API — the native browser tool, and its critical gotcha
- `axios` — what it adds and when to prefer it
- The API service layer — why network calls never belong in components
- Environment variables — dev vs production URLs
- **React Query (TanStack Query)** — the production standard for server state
- Skeleton loading UI — better UX than spinners
- Full migration: Task Dashboard now reads/writes from a live REST API

---

## 2. The JavaScript Foundation

### 2.1 The Event Loop — Why JavaScript Doesn't Freeze

JavaScript is **single-threaded** — it runs one instruction at a time on one call stack.
A network request takes 200ms–2000ms. If JS waited (blocked) for that, the entire UI would freeze.

The solution is the **Event Loop + Web APIs**:

```
┌──────────────────────────────────────────────────────────────────┐
│  Call Stack (JS thread)     │  Browser Web APIs                  │
│                             │  (run OFF the JS thread)           │
│  main()                     │                                    │
│  fetch('/api/tasks') ───────┼──→ [network request starts here]   │
│  ↓ returns Promise          │         ↓ (200ms later)            │
│  console.log('next line')   │    response arrives                │
│  ↓                          │         ↓                          │
│  [stack empties]            │  Microtask Queue                   │
│         ↑                   │  [.then() callback waits here]     │
│         └───── Event Loop ──┼── picks up callback, pushes to     │
│                             │   call stack when it's empty       │
└──────────────────────────────────────────────────────────────────┘
```

**Key insight**: `fetch()` starts the network request and **immediately returns a Promise**.
The actual network work happens in the browser's Web API layer — off the JS thread.
When the response arrives, the `.then()` callback is placed in the Microtask Queue and runs
when the call stack is empty.

JS never blocks. The UI stays interactive the entire time.

---

### 2.2 Promises

A `Promise` is an object representing a value that will be available in the future.

```javascript
// 3 states:
// pending   — operation in progress
// fulfilled — operation succeeded, value available via .then()
// rejected  — operation failed, error available via .catch()

const promise = fetch('https://api.example.com/tasks')
// promise is PENDING right now — network request in progress

promise
  .then(response => response.json())    // fulfilled → parse body
  .then(data    => console.log(data))   // fulfilled → use data
  .catch(error  => console.error(error)) // rejected → handle error
  .finally(()   => console.log('done')) // always runs
```

Each `.then()` receives the **return value** of the previous `.then()`.
This is promise chaining — the foundation of sequential async operations.

---

### 2.3 async/await — Syntactic Sugar Over Promises

`async/await` compiles to Promises. It just reads like synchronous code.

```javascript
// Promise chain
function fetchTasks() {
  return fetch('/api/tasks')
    .then(res => res.json())
    .then(data => data)
    .catch(err => console.error(err))
}

// async/await — identical behaviour, cleaner syntax
async function fetchTasks() {
  try {
    const res  = await fetch('/api/tasks')  // wait for HTTP response headers
    const data = await res.json()           // wait for body to be fully read
    return data
  } catch (err) {
    console.error(err)
  }
}
```

**Rules:**
1. `await` can only be used inside an `async` function
2. `await` pauses the `async` function only — NOT the JS thread
3. Every `async` function returns a Promise automatically
4. `try/catch` replaces `.catch()` for error handling

---

### 2.4 The fetch API — and Its Critical Gotcha

```javascript
// Basic GET
const response = await fetch('https://api.example.com/tasks')

// The response object — metadata only, NOT the data yet
console.log(response.status)     // 200, 404, 500...
console.log(response.ok)         // true for status 200-299, false otherwise
console.log(response.statusText) // "OK", "Not Found"

// Parse the body — also async (body arrives in chunks as a stream)
const data = await response.json()    // parse as JSON
const text = await response.text()    // parse as plain text
const blob = await response.blob()    // parse as binary (images, files)

// POST / PUT / DELETE
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'New Task', status: 'todo' }),
})
```

**⚠️ THE CRITICAL GOTCHA — fetch only rejects on network failure:**
```javascript
// ❌ This code has a silent bug
const res  = await fetch('/api/tasks/999')  // 404 response
const data = await res.json()               // parses the 404 error body
setTasks(data)                              // data is the error object, not tasks!
// No exception is thrown. The catch block never runs.

// ✅ Always check res.ok manually
const res = await fetch('/api/tasks')
if (!res.ok) {
  throw new Error(`HTTP ${res.status}: ${res.statusText}`)
}
const data = await res.json()
```

`fetch` rejects (throws) ONLY when:
- The network is down (no internet)
- DNS resolution fails
- The request is aborted

A 404, 500, or 401 is a **valid HTTP response** — fetch considers it a success and resolves.
You must check `response.ok` yourself.

---

## 3. The Async State Machine

Every API call in React follows the same pattern. Understanding this is the foundation.

```
IDLE ──→ LOADING ──→ SUCCESS
                └──→ ERROR
```

In React, this maps to three state variables:

```javascript
const [data,    setData]    = useState(null)
const [loading, setLoading] = useState(false)
const [error,   setError]   = useState(null)

async function fetchTasks() {
  setLoading(true)    // 1. Start loading — show spinner
  setError(null)      // 2. Clear previous errors

  try {
    const res = await fetch('/api/tasks')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    setData(data)     // 3a. Success — store data
  } catch (err) {
    setError(err.message) // 3b. Failure — store error
  } finally {
    setLoading(false) // 4. Always stop loading (success OR failure)
  }
}

// In JSX — the UI is ALWAYS in a known state
if (loading) return <Spinner />
if (error)   return <ErrorMessage message={error} />
return <TaskList tasks={data} />
```

This is called a **state machine** — the UI is always in exactly one state,
never an ambiguous combination like `loading: true` + `error: "something"`.

---

## 4. fetch vs axios

### fetch (built-in)
```
✅ Native browser API — zero install
✅ Modern, standards-based, works everywhere
❌ Doesn't throw on non-2xx (must check res.ok manually)
❌ No automatic JSON parsing (must call .json() separately)
❌ No interceptors (can't attach auth headers to every request centrally)
❌ No timeout (must implement manually with AbortController)
❌ Verbose error objects
```

### axios (~14KB npm package)
```
✅ Throws automatically on non-2xx responses (no res.ok check needed)
✅ Auto-parses JSON — response.data is the data directly
✅ Request/response interceptors — attach auth tokens to every request
✅ Built-in timeout configuration
✅ AbortController support
✅ Better error objects (error.response.status, error.response.data)
❌ Extra dependency
```

```javascript
// Same request in both:

// fetch (verbose)
const res = await fetch('/api/tasks')
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const data = await res.json()

// axios (clean)
const { data } = await axios.get('/api/tasks')
// throws automatically on non-2xx, data is already parsed
```

**When to use which:**
| `fetch` | `axios` |
|---|---|
| Learning, simple projects | Production apps with auth |
| No extra dependencies needed | Need interceptors for JWT tokens |
| You want to understand fundamentals | Team already using axios |

---

## 5. Environment Variables

Never hardcode API URLs. Dev and production point to different servers.

```bash
# .env.development  (active during: npm run dev)
VITE_API_URL=http://localhost:3001

# .env.production   (active during: npm run build)
VITE_API_URL=https://api.mytaskapp.com
```

**Vite rules:**
- Variables MUST be prefixed with `VITE_` — Vite only exposes these to client code
- Access with `import.meta.env.VITE_API_URL` (not `process.env`)
- Never put secrets (passwords, API keys) in `.env` — they end up in the JS bundle
- `.env.development` / `.env.production` are safe to commit — they contain URLs, not secrets
- `.env.local` overrides all, is never committed (for personal overrides)

```javascript
// Usage
const BASE_URL = import.meta.env.VITE_API_URL
// → "http://localhost:3001"       during development
// → "https://api.mytaskapp.com"  in production build
```

---

## 6. The API Service Layer

**Never call fetch() directly inside components.**

Create a dedicated service file — all network calls in one place:

```javascript
// src/services/taskApi.js

const BASE_URL = import.meta.env.VITE_API_URL

// Shared helper — handles res.ok check and 204 No Content edge case
async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  if (res.status === 204) return null   // DELETE often returns 204 with no body
  return res.json()
}

export const taskApi = {
  getAll:  ()               => request('/tasks'),
  getById: (id)             => request(`/tasks/${id}`),
  create:  (task)           => request('/tasks',      { method: 'POST',  body: JSON.stringify(task) }),
  update:  (id, changes)    => request(`/tasks/${id}`,{ method: 'PUT',   body: JSON.stringify(changes) }),
  patch:   (id, changes)    => request(`/tasks/${id}`,{ method: 'PATCH', body: JSON.stringify(changes) }),
  remove:  (id)             => request(`/tasks/${id}`,{ method: 'DELETE' }),
}
```

**Why this pattern:**
1. Components import `taskApi.getAll()` — readable, intent-clear
2. Auth headers added here in Phase 10 — one place, all requests get them
3. Tests mock `taskApi` — never touch fetch directly in test files
4. Swap fetch for axios later — components don't change at all
5. The `request()` helper encodes best practices (res.ok check) once

---

## 7. React Query (TanStack Query) — The Production Standard

Manual fetch + useState covers the basics. But in real apps you immediately need:
- **Caching** — don't re-fetch data you already have
- **Background refetch** — refresh stale data silently while showing old data
- **Deduplication** — if 10 components all call `getAll()`, make ONE network request
- **Retry** — automatically retry failed requests
- **Cache invalidation** — after a mutation, tell React Query the cache is outdated
- **Loading/error per query** — not one global loading state

React Query handles all of this automatically.

### Setup
```javascript
// main.jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // data is "fresh" for 2 minutes
      retry: 1,                    // retry once on failure
      refetchOnWindowFocus: true,  // refetch when user returns to tab
    }
  }
})

// Wrap app with QueryClientProvider
<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />   // dev-only panel
</QueryClientProvider>
```

### useQuery — Reading Data (GET)
```javascript
const {
  data: tasks = [],    // the fetched data (undefined until first fetch → default to [])
  isLoading,           // true ONLY on first fetch with no cached data
  isFetching,          // true whenever a fetch is in progress (including background)
  isError,
  error,
  refetch,             // manually trigger a refetch
} = useQuery({
  queryKey: ['tasks'],         // cache key — any serializable value
  queryFn:  taskApi.getAll,   // the async function to call
})
```

**Query keys are critical:**
```javascript
useQuery({ queryKey: ['tasks'],    queryFn: taskApi.getAll })     // all tasks
useQuery({ queryKey: ['tasks', 5], queryFn: () => taskApi.getById(5) }) // task 5
// Different keys = different cache entries
// Same key in multiple components = ONE fetch, shared cache
```

**`isLoading` vs `isFetching`:**
- `isLoading`: `true` only on the very first fetch (cache is empty)
- `isFetching`: `true` whenever any fetch is in progress (initial OR background)
- Use `isLoading` for skeleton UI (first load only)
- Use `isFetching` for subtle "refreshing" indicators

### useMutation — Writing Data (POST/PUT/PATCH/DELETE)
```javascript
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: taskApi.create,        // the async function to call
  onSuccess: () => {
    // Tell React Query the tasks cache is stale → triggers automatic refetch
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  },
  onError: (error) => {
    console.error('Failed to create task:', error.message)
  },
})

// Execute the mutation
mutation.mutate({ title: 'New Task', status: 'todo' })

// States
mutation.isPending   // true while POST is in flight
mutation.isError     // true if POST failed
mutation.isSuccess   // true after successful POST
```

### The invalidateQueries Pattern
```
User adds a task
  ↓
mutation.mutate(taskData)
  ↓
POST /tasks → server creates task → returns new task
  ↓
onSuccess fires
  ↓
queryClient.invalidateQueries({ queryKey: ['tasks'] })
  ↓
React Query marks ['tasks'] cache as stale
  ↓
Automatically refetches GET /tasks
  ↓
New task appears in the list
```

This is the **refetch-after-mutation** pattern. The alternative is **optimistic updates**
(update the cache immediately before the server responds) — covered in advanced patterns.

### staleTime Explained
```
staleTime: 1000 * 60 * 2  (2 minutes)

Timeline:
0s   → first fetch → data is FRESH
30s  → component remounts → served from cache (no fetch)
60s  → user switches tabs, comes back → served from cache (no fetch)
2m   → staleTime expires → data is now STALE
2m1s → component remounts → served from cache BUT background refetch starts
2m2s → background refetch completes → cache updated → UI updates silently
```

User always sees data instantly (from cache). It just gets refreshed in the background.

---

## 8. json-server — The Mock REST API

json-server turns a JSON file into a full REST API:

```bash
npm install --save-dev json-server

# Add to package.json scripts:
"api": "json-server --watch db.json --port 3001"
```

```json
// db.json
{
  "tasks": [
    { "id": 1, "title": "Learn React", "status": "done", "priority": "high", "phase": 1 }
  ]
}
```

```bash
npm run api
# → REST API available at http://localhost:3001
# → GET    http://localhost:3001/tasks
# → POST   http://localhost:3001/tasks
# → PUT    http://localhost:3001/tasks/1
# → PATCH  http://localhost:3001/tasks/1
# → DELETE http://localhost:3001/tasks/1
```

**This is identical to a Spring Boot controller:**
```java
@RestController
@RequestMapping("/tasks")
public class TaskController {
    @GetMapping    public List<Task> getAll()      { ... }
    @PostMapping   public Task       create(...)   { ... }
    @PutMapping    public Task       update(...)   { ... }
    @DeleteMapping public void       delete(...)   { ... }
}
```
Swapping json-server for real Spring Boot = zero React changes.

---

## 9. Architecture — What Changed

### Before Phase 9
```
Source of truth:  React Context (in-memory)
Persistence:      localStorage (browser only)
Updates:          setTasks(newArray)
Sharing:          Impossible — each tab has its own state
Network:          None
```

### After Phase 9
```
Source of truth:  Server (db.json / Spring Boot database)
Persistence:      Database
Updates:          mutation → POST/PATCH/DELETE → invalidate cache → refetch
Sharing:          All tabs, all users see the same data
Network:          fetch via taskApi service layer
Cache:            React Query (2-minute staleTime)
```

### What TaskContext Does Now
Before: owned `tasks` array in `useState`, all CRUD operations mutated local state.
After: React Query owns the `tasks` cache. `TaskContext` is a thin wrapper that:
1. Calls `useQuery` to get tasks + loading/error state
2. Exposes mutation functions with readable names (`addTask`, `deleteTask`)
3. Computes derived values (`stats`, `visibleTasks`) once, shared by all consumers

Components didn't change their API — they still call `useTasks()` and `useTaskDispatch()`.
The migration was entirely inside `TaskContext.jsx` and the new `taskApi.js`.

---

## 10. Skeleton Loading UI

A skeleton screen shows the shape of content while it loads — better UX than a spinner.

```jsx
function SkeletonCard() {
  return (
    <div className="task-card skeleton-card" aria-hidden="true">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-subtitle" />
    </div>
  )
}

// CSS — the shimmer animation
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

.skeleton-line {
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    var(--color-surface) 50%,
    var(--color-border) 75%
  );
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite linear;
}
```

**Why `aria-hidden="true"`?**
Screen readers should not announce "skeleton loading skeleton loading..." to blind users.
`aria-hidden` hides it from the accessibility tree while it's visible in the DOM.

---

## 11. Project File Changes

```
src/
├── main.jsx                   ← QueryClient + QueryClientProvider added
├── services/
│   └── taskApi.js             ← NEW — all fetch() calls live here
├── context/
│   └── TaskContext.jsx        ← MIGRATED — useQuery + useMutation replace useState
├── components/
│   ├── AddTaskForm.jsx        ← isSubmitting prop → "Adding…" button text
│   ├── AddTaskSection.jsx     ← passes isAdding to AddTaskForm
│   ├── StatsSection.jsx       ← handles isLoading / isError states
│   ├── ResetSection.jsx       ← confirmation + disabled during loading
│   └── TaskListSection.jsx    ← SkeletonCard + isLoading prop
├── pages/
│   └── TasksPage.jsx          ← full-page error state with helpful message
└── App.css                    ← skeleton shimmer + loading/error styles

task-dashboard/
├── db.json                    ← NEW — json-server database
├── .env.development           ← NEW — VITE_API_URL=http://localhost:3001
└── .env.production            ← NEW — VITE_API_URL=https://api.mytaskapp.com
```

---

## 12. Running the App in Phase 9

Two terminals are required:

```bash
# Terminal 1 — the mock REST API (port 3001)
npm run api

# Terminal 2 — the React dev server (port 5173)
npm run dev
```

Open `http://localhost:5173` — tasks now load from `http://localhost:3001/tasks`.
Open `http://localhost:3001/tasks` directly in the browser to see the raw JSON API.

**To see skeleton loading:**
Open DevTools → Network tab → set throttling to "Slow 3G" → refresh.

**To see error state:**
Stop the API server (`Ctrl+C` in Terminal 1) → refresh the React app.

---

## 13. Best Practices

1. **Never call fetch() in components** — use a service layer (`taskApi.js`)
2. **Always check `res.ok`** when using fetch — it doesn't throw on 4xx/5xx
3. **Always provide a default value** for `useQuery` data: `data: tasks = []`
4. **Use `isLoading` for first-load skeletons** — not `isFetching` (would flash on every background refetch)
5. **Use `invalidateQueries` after mutations** — let React Query refetch fresh data
6. **Put `QueryClient` outside the component** — never inside, or it recreates on every render
7. **Use `VITE_` prefix** for all env variables Vite needs to expose to client code
8. **Use `PATCH` for partial updates** (just the status field), `PUT` for full replacement
9. **Show helpful error messages** — tell the user what went wrong and what to do
10. **Use `isPending` on mutations** to disable buttons — prevents double-submission

---

## 14. Common Mistakes

### Mistake 1: Not checking res.ok
```javascript
// ❌ Silent failure — a 404 doesn't throw, data will be an error object
const res  = await fetch('/api/tasks/9999')
const data = await res.json()

// ✅ Always check
if (!res.ok) throw new Error(`HTTP ${res.status}`)
```

### Mistake 2: Creating QueryClient inside a component
```javascript
// ❌ New QueryClient on every render — cache is wiped constantly
function App() {
  const queryClient = new QueryClient()  // WRONG
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>
}

// ✅ Outside the component — created once
const queryClient = new QueryClient()
function App() {
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>
}
```

### Mistake 3: Missing default for useQuery data
```javascript
// ❌ data is undefined on first render — tasks.map() throws
const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: taskApi.getAll })
tasks.map(...)  // TypeError: Cannot read properties of undefined

// ✅ Default to empty array
const { data: tasks = [] } = useQuery(...)
```

### Mistake 4: Using isLoading for all loading indicators
```javascript
// ❌ isLoading is only true on first fetch — background refetches are missed
if (isLoading) return <Spinner />

// ✅ Use isFetching for "any fetch in progress" indicator
// Use isLoading only for first-load skeleton UI
```

### Mistake 5: Calling async functions in useEffect without cleanup
```javascript
// ❌ Memory leak — if component unmounts mid-fetch, setData runs on unmounted component
useEffect(() => {
  fetch('/api/tasks').then(r => r.json()).then(data => setData(data))
}, [])

// ✅ Use AbortController for cleanup
useEffect(() => {
  const controller = new AbortController()
  fetch('/api/tasks', { signal: controller.signal })
    .then(r => r.json())
    .then(data => setData(data))
    .catch(err => { if (err.name !== 'AbortError') setError(err) })
  return () => controller.abort()  // cleanup: cancel the fetch on unmount
}, [])
// Note: React Query handles this automatically — another reason to prefer it
```

---

## 15. Common Interview Questions

**Q1: What is the Event Loop and why does fetch() not block the UI?**
A: JavaScript is single-threaded — only one call stack. `fetch()` delegates the network request to the browser's Web API layer (which runs off the JS thread). It immediately returns a Promise. When the response arrives, the `.then()` callback is queued in the Microtask Queue and runs when the call stack is empty. The UI thread is never blocked.

**Q2: Why doesn't fetch throw on a 404 or 500?**
A: `fetch` only rejects when the network request itself fails (no internet, DNS failure). A 404 or 500 is a valid HTTP response — the server responded successfully. `fetch` resolves with the Response object. You must check `response.ok` (true for 200–299) and throw manually if needed.

**Q3: What is React Query and what problems does it solve over manual fetch?**
A: React Query is a server-state library. It solves: automatic caching (don't re-fetch fresh data), background refetching (silently update stale data), request deduplication (10 components calling the same query = 1 network request), automatic retries, per-query loading/error states, and cache invalidation after mutations. Manual fetch + useState requires you to implement all of this yourself.

**Q4: What is `staleTime` in React Query?**
A: `staleTime` defines how long fetched data is considered "fresh". During this window, React Query serves data from cache without making a network request. After `staleTime` expires, data is "stale" — it's still served from cache (instant UI) but a background refetch starts. Default is 0 (always stale, always refetches on component mount).

**Q5: What is the query key in React Query and why is it important?**
A: The query key is the unique cache identifier for a query. Same key = same cache entry, shared by all components. It must be unique per query (e.g., `['tasks']` vs `['tasks', 5]`). It's also used in `invalidateQueries` to mark cache entries as stale after mutations.

**Q6: What is the difference between isLoading and isFetching in React Query?**
A: `isLoading` is true only on the very first fetch when no cached data exists. `isFetching` is true whenever any network request is in progress — including background refetches. Use `isLoading` for skeleton screens (only on initial load), use `isFetching` for subtle refresh indicators (shows for every fetch).

**Q7: Why should the service layer (taskApi.js) exist as a separate file?**
A: Separation of concerns — components describe UI, services handle network. Benefits: single place to add auth headers (Phase 10), easy to mock in tests, swap fetch for axios with one file change, all fetch best practices encoded once (res.ok check), consistent error handling.

---

## 16. Tricky Interview Questions

**Q1: Can two different components call the same `useQuery` key simultaneously? What happens?**
A: Yes. React Query deduplicates them — only ONE network request is made, regardless of how many components use the same query key at the same time. All components sharing the key receive the same data from the same cache entry. This is one of React Query's most powerful features.

**Q2: What happens if you forget to call `queryClient.invalidateQueries` after a mutation?**
A: The cache remains stale — the UI shows the old data. For example, after `POST /tasks`, the task list won't update because React Query doesn't know the server data changed. The only ways to update the UI are: (1) invalidate the query to trigger a refetch, (2) manually update the cache with `queryClient.setQueryData`, or (3) use optimistic updates.

**Q3: What is the difference between `PUT` and `PATCH`?**
A: `PUT` replaces the entire resource — you must send all fields. `PATCH` does a partial update — you only send the fields you want to change. We use `PATCH` for status updates (`taskApi.patch(id, { status })`) so we don't have to send the entire task object when only the status changes.

**Q4: Why is `data: tasks = []` important in `useQuery` destructuring?**
A: On first render (before the first fetch completes), `data` is `undefined`. If you do `tasks.map(...)` or `tasks.filter(...)` on `undefined`, React throws a TypeError. The default value `= []` ensures the array methods always have an array to work with, even before the fetch resolves.

**Q5: If `staleTime` is 2 minutes and the user has the app open for 10 minutes, how many times will `GET /tasks` be called (assuming they don't navigate away)?**
A: React Query fetches on mount and on focus (if `refetchOnWindowFocus: true`). With `staleTime: 2 minutes`: data becomes stale at 2m. Each time the user returns to the tab (focus event) after 2m, a background refetch fires. If they never switch tabs, the data stays stale but no automatic refetch happens unless the component remounts. React Query does NOT poll on a timer by default — for polling, use `refetchInterval`.

---

## 17. Small Coding Exercises

**Exercise 1:** Add a "Retry" button to the error state in `TasksPage` that calls `refetch()` from `useQuery`. Use `const { refetch } = useTasks()` (you'll need to expose it from context).

**Exercise 2:** Add `isFetching` to the `Header` component — show a subtle spinning indicator when React Query is doing a background refetch. Do NOT show it during `isLoading` (only for background refreshes).

**Exercise 3:** Implement an optimistic update for status changes — immediately update the task in the cache before the PATCH response arrives, then roll back if it fails. Use `queryClient.setQueryData`.

**Exercise 4:** Add a `GET /tasks/:id` call in `TaskDetailPage` using `useQuery` with key `['tasks', taskId]`. This way the detail page has its own fresh data independent of the list.

**Exercise 5:** Replace the manual `request()` helper in `taskApi.js` with `axios`. The component code and TaskContext should require zero changes.

---

## 18. Revision Cheat Sheet

```
JAVASCRIPT FOUNDATION
  fetch() → returns Promise immediately, network runs off JS thread
  fetch() rejects on network failure ONLY — must check res.ok for 4xx/5xx
  async/await = syntactic sugar over Promises
  await pauses the async fn only — not the JS thread

ASYNC STATE MACHINE
  loading → success → show data
  loading → error   → show error
  Always: setLoading(true) → try/catch/finally → setLoading(false)

FETCH GOTCHA
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)  ← REQUIRED
  const data = await res.json()

ENV VARIABLES (Vite)
  VITE_API_URL=http://localhost:3001   in .env.development
  import.meta.env.VITE_API_URL         in code
  VITE_ prefix required — never put secrets here

SERVICE LAYER (taskApi.js)
  One file for all API calls
  Shared request() helper handles res.ok + 204 No Content
  Components never call fetch() directly

REACT QUERY
  QueryClient → created ONCE outside component
  QueryClientProvider → wraps app (in main.jsx)
  useQuery({ queryKey, queryFn }) → { data, isLoading, isFetching, isError }
  useMutation({ mutationFn, onSuccess }) → { mutate, isPending }
  queryClient.invalidateQueries({ queryKey }) → triggers refetch

KEY DISTINCTIONS
  isLoading  → first fetch only (cache empty)
  isFetching → any fetch in progress (initial + background)
  staleTime  → how long cache is "fresh" before background refetch

json-server
  npm run api → REST API at localhost:3001
  db.json → the "database"
  Identical API shape to Spring Boot REST controller

RUNNING THE APP
  Terminal 1: npm run api   (port 3001)
  Terminal 2: npm run dev   (port 5173)
```

---

## 19. Key Takeaways

1. **JavaScript doesn't block because the Event Loop offloads I/O to browser Web APIs — fetch() returns a Promise immediately.**
2. **fetch() does NOT throw on 404/500 — always check `response.ok` manually.**
3. **async/await is syntactic sugar over Promises — the underlying model is identical.**
4. **The async state machine (loading/error/success) is the foundation of all API work in React.**
5. **The service layer (`taskApi.js`) keeps components clean and makes auth, testing, and refactoring easy.**
6. **React Query solves caching, deduplication, background refetch, retries — use it in production.**
7. **`isLoading` = first fetch only. `isFetching` = any fetch. Use `isLoading` for skeletons.**
8. **`queryClient.invalidateQueries` after a mutation is how the UI stays in sync with the server.**
9. **Environment variables (`VITE_API_URL`) decouple dev and production servers — never hardcode URLs.**
10. **Skeleton UI (`aria-hidden`, shimmer animation) is better UX than a spinner — users understand what's loading.**
