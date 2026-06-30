# Phase 13 — Error Boundaries, Code Splitting, Lazy Loading, Suspense, useTransition

> **Status:** ✅ Complete  
> **Built:** `ErrorBoundary.jsx`, `React.lazy` in `App.jsx`, `useTransition` in `TasksPage.jsx`  
> **Build result:** Main bundle 381KB → 278KB. Separate page chunks downloaded on demand.

---

## 1. Error Boundaries

### The Problem
When a component throws an error during rendering, React unmounts the entire component tree — the user sees a blank white screen with no explanation. There's no way to recover without a page reload.

### The Solution
An **Error Boundary** catches errors in its child tree and renders a fallback UI instead of crashing. It's a safety net for your component tree.

### Why It Must Be a Class Component
Error boundaries require two lifecycle methods that have no hooks equivalent:
- `static getDerivedStateFromError(error)` — called during the render phase
- `componentDidCatch(error, info)` — called after the commit phase

React has not (and may never) expose these as hooks. **This is one of the only remaining reasons to write a class component in modern React.** Know this for interviews — it comes up constantly.

### The Two Key Lifecycle Methods

```javascript
class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  // 1. Called DURING render phase when a child throws.
  //    Must be STATIC and PURE — no side effects (we're in render phase).
  //    Returns the state object that switches UI to fallback.
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  // 2. Called AFTER commit phase (after DOM update with fallback).
  //    Side effects allowed — this is where you log to error services.
  //    info.componentStack: full stack trace of which components crashed.
  componentDidCatch(error, info) {
    Sentry.captureException(error, { extra: info })
    // or: console.error(error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorUI />
    }
    return this.props.children
  }
}
```

### What Error Boundaries Catch vs Don't Catch

| Scenario | Caught? |
|---|---|
| Error thrown during rendering | ✅ Yes |
| Error in a child's lifecycle method | ✅ Yes |
| Error in a child's constructor | ✅ Yes |
| Error in an event handler (`onClick`) | ❌ No — use try/catch |
| Async error (setTimeout, fetch) | ❌ No — use try/catch |
| Error in the boundary itself | ❌ No — propagates up |
| Server-side rendering errors | ❌ No |

**Why not event handlers?** Errors in event handlers don't happen during rendering — React has already committed the DOM. React can't intercept them at the boundary level. Use `try/catch` inside the handler and set error state manually.

### Placement Strategy

```
❌ One global boundary at the root — entire app replaced by error UI
✅ Granular boundaries — only the broken section is replaced:

  <ErrorBoundary fallback={<ErrorWidget />}>   ← catches widget errors
    <Widget />
  </ErrorBoundary>

  <ErrorBoundary fallback={<p>Sidebar failed</p>}>
    <Sidebar />
  </ErrorBoundary>
```

**Production pattern:** Wrap each major section independently so one crash doesn't take down the whole page.

### The Reset / Retry Pattern

```javascript
// In ErrorBoundary:
handleReset = () => {
  this.setState({ hasError: false, error: null })
}

// In the fallback UI:
<button onClick={this.handleReset}>Try again</button>

// When reset() is called → state clears → children re-render → fresh attempt
```

**React 19 approach:** React 19 added `<ErrorBoundary onReset={fn} resetKeys={[dep]}>` via the `react-error-boundary` library (which also provides a functional wrapper around the class).

### Our Implementation
[`src/components/ErrorBoundary.jsx`](../task-dashboard/src/components/ErrorBoundary.jsx) wraps the entire `<Routes>` tree in [`App.jsx`](../task-dashboard/src/App.jsx). Any render crash in any page or component shows a "Something went wrong" card with a "Try again" button.

---

## 2. Code Splitting + `React.lazy`

### The Problem
By default, Vite (and any bundler) puts all your JavaScript into one file. The user downloads the entire app — including pages they may never visit — before anything renders.

```
Before code splitting:
  index.js = TasksPage + SettingsPage + LoginPage + TaskDetailPage + all components
  User on /tasks downloads SettingsPage code they may never use
```

### The Solution — Dynamic `import()`

`import()` is a **browser/ES module feature** (not React-specific). It returns a Promise that resolves to a module. Bundlers (Vite, Webpack) see `import()` and create a **separate chunk file** for that module.

```javascript
// Static import — bundled into main chunk (eager)
import TasksPage from './pages/TasksPage'

// Dynamic import — separate chunk, downloaded on demand (lazy)
import('./pages/TasksPage').then(module => {
  const TasksPage = module.default
})
```

### `React.lazy` — The React Wrapper

`React.lazy()` wraps a dynamic import so React can render the component when the Promise resolves:

```javascript
const TasksPage = React.lazy(() => import('./pages/TasksPage'))
// ↑ Returns a lazy component. Throws a Promise during render until the chunk loads.
// ↑ Suspense catches that Promise and shows the fallback.
```

**Rules:**
- The function must return a Promise resolving to a module with a **`default` export**
- Must be used with `<Suspense fallback={...}>`
- Declared at **module level** — not inside components (would re-create on every render)

### `Suspense` — The Boundary for Loading States

```jsx
<Suspense fallback={<PageLoader />}>
  <TasksPage />   {/* lazy — throws a Promise until chunk loads */}
</Suspense>
```

`Suspense` is a boundary that catches **Promises thrown during render**. React.lazy throws Promises; Suspense catches them and shows `fallback` until they resolve.

**Multiple lazy components under one Suspense:** The fallback shows until ALL promises under it resolve. If you want per-component fallbacks, nest Suspense boundaries.

### Build Output Comparison

```
Before (Phase 10 — no code splitting):
  index-Bq3gV5e9.js    381 KB    ← everything in one file

After (Phase 13 — lazy pages):
  index-Bq3gV5e9.js    278 KB    ← core app (React, router, auth, context)
  TasksPage-BjiedgBX.js  98 KB   ← downloaded when user visits /tasks
  LoginPage-BfJmAB5D.js   2 KB   ← downloaded when user visits /login
  SettingsPage.js          1.7 KB ← downloaded when user visits /settings
  TaskDetailPage.js        2.1 KB ← downloaded when user visits /tasks/:id
  NotFoundPage.js          0.5 KB ← downloaded when user visits invalid URL
```

The initial download is now **103KB smaller**. Users loading `/tasks` don't download `SettingsPage` code.

### What to Lazy-Load (and What Not To)

```
✅ Route-level pages — each page is a natural code-split boundary
✅ Heavy components loaded conditionally (modals, rich text editors, charts)
✅ Below-the-fold content (loaded on scroll)

❌ Small utility components — the Promise overhead outweighs the savings
❌ Components used on every page (Header, Sidebar) — lazy adds delay everywhere
❌ Components needed immediately on first paint
```

### Named Exports with `React.lazy`

`React.lazy` only supports default exports. For named exports, re-export:
```javascript
// pages/index.js
export { default as TasksPage } from './TasksPage'

// App.jsx
const TasksPage = lazy(() =>
  import('./pages/index').then(m => ({ default: m.TasksPage }))
)
```

---

## 3. `useTransition` — Concurrent React in Practice

### The Problem
All state updates in React are treated equally — each one blocks the main thread until complete. For expensive re-renders (filtering 1000+ items), this makes the UI feel frozen.

### The Solution
`useTransition` lets you mark some updates as **non-urgent (interruptible)**. React processes urgent updates (user input) first, then works on transitions when idle.

```javascript
const [isPending, startTransition] = useTransition()

// Wrap non-urgent updates:
startTransition(() => {
  setFilter(newValue)   // non-urgent — React can defer or interrupt
})
```

### Mental Model — Two Lanes of Work

```
Without useTransition:
  Click filter → React blocks thread → re-renders 1000 cards → UI frozen for 200ms

With useTransition:
  Click filter → React marks as low priority → keeps accepting user clicks
  → When idle: re-renders the 1000 cards → UI never freezes
  → User clicks another filter mid-way → React CANCELS first render → starts new one
  → Only the FINAL filter gets fully rendered (no wasted intermediate work)
```

### `isPending` — Visual Feedback

```jsx
const [isPending, startTransition] = useTransition()

// Show dimming/loading indicator during the transition
<div style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
  {filteredItems.map(...)}
</div>
```

The UI doesn't jump to blank — it shows the **stale content dimmed** while the new content is being prepared. Much better UX than showing nothing.

### Our Implementation

In [`TasksPage.jsx`](../task-dashboard/src/pages/TasksPage.jsx):
```javascript
const [isPending, startTransition] = useTransition()

function handleFilterChange(newFilter) {
  startTransition(() => {
    setSearchParams({ filter: newFilter })
  })
}
```

The `isPending` flag passes down to `TaskListSection` which dims the task grid with `opacity: 0.6` during the transition.

### `useTransition` vs `useDeferredValue`

| | `useTransition` | `useDeferredValue` |
|---|---|---|
| **Controls** | The state update itself | A derived value |
| **`isPending`** | ✅ Yes — you know when transition is active | ❌ No native flag |
| **Use when** | You control the state setter | You receive a prop/value you can't wrap |
| **Example** | Wrapping `setFilter()` | Deferring a `searchTerm` prop |

```javascript
// useTransition — you own the state:
const [isPending, startTransition] = useTransition()
startTransition(() => setFilter(value))

// useDeferredValue — you receive a prop:
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query)  // lags behind 'query'
  // renders with the deferred (old) value, avoids blocking on new value
  return <ExpensiveList query={deferredQuery} />
}
```

---

## 4. Suspense Beyond Lazy Loading — Data Fetching

Suspense works for more than just lazy components. React Query supports it via `useSuspenseQuery`:

```javascript
// Instead of:
const { data, isLoading } = useQuery(...)
if (isLoading) return <Skeleton />

// With Suspense:
const { data } = useSuspenseQuery(...)   // throws Promise until data arrives
// ↑ No isLoading check needed — Suspense handles it above in the tree

// In the component tree:
<Suspense fallback={<Skeleton />}>
  <ComponentThatUsesuseSuspenseQuery />
</Suspense>
```

**The benefit:** Loading states are co-located with their boundaries, not scattered through components as `if (isLoading)` checks.

**React 19's direction:** Suspense for data fetching is the intended future of React. `use()` hook (React 19) lets you await Promises inside components, and Suspense catches them.

---

## 5. Interview Q&A

**Q: Why must Error Boundaries be class components?**  
A: Error boundaries require `static getDerivedStateFromError()` and `componentDidCatch()`. These lifecycle methods don't have a hooks equivalent — React has deliberately not exposed them as hooks because `getDerivedStateFromError` must be synchronous and pure (runs during render phase) while `componentDidCatch` must happen after commit. The distinction between render-phase and commit-phase is harder to express cleanly in hooks. This is explicitly documented by the React team as a known gap.

**Q: What does `React.lazy` actually do internally?**  
A: `React.lazy(() => import('./Page'))` creates a wrapper component that, when first rendered, calls the import function and **throws the returned Promise**. React's Suspense boundary catches that thrown Promise, renders the fallback, and subscribes to the Promise. When the Promise resolves (the chunk downloads), React re-renders the component — this time the module is cached, so no Promise is thrown, and the real component renders.

**Q: What is the difference between Error Boundary and try/catch?**  
A: `try/catch` in JavaScript is synchronous — it can only catch errors in the block it wraps. React's rendering is asynchronous and recursive — by the time a child component throws during render, you're deep inside React's rendering loop, not inside your code. Error Boundaries hook into React's rendering machinery to intercept errors that propagate through the component tree. Event handlers are synchronous code you control, so `try/catch` works fine there.

**Q: How does `useTransition` interact with React Fiber's concurrent mode?**  
A: React Fiber assigns a priority level to every update. `startTransition` marks updates as `Transition` priority — lower than `Synchronous` (user input). In concurrent mode, React can pause low-priority work, process any high-priority updates that arrive, then resume. If a new transition starts before the old one finishes, React aborts the old work entirely. This is "interruptible rendering" — the core value proposition of concurrent React.

**Q: When would you NOT use code splitting?**  
A: When the chunk is tiny (< 5KB) — the network round-trip for a new file costs more than the bytes saved. When the component is always needed immediately (Header, Sidebar, AuthProvider). When the user's network is fast and the bundle is already small. The goal is to reduce the critical path — what must download before the user sees anything useful.

**Q: What happens when a lazily-loaded chunk fails to download (network error)?**  
A: The `import()` Promise rejects. The thrown error propagates up to the nearest Error Boundary, which catches it and shows the fallback UI. This is why `ErrorBoundary` wraps `Suspense` in our app — not Suspense wrapping ErrorBoundary. Order matters: `ErrorBoundary > Suspense > lazy components`.

---

## 6. Tricky Interview Questions

**Q: Can you put an Error Boundary inside a functional component?**  
A: You cannot write one as a functional component. But you can use the class-based `ErrorBoundary` as a wrapper **inside** a functional component's JSX, or use the `react-error-boundary` library which provides `<ErrorBoundary>` as a functional-component-friendly wrapper (it still uses a class under the hood). The constraint is on authoring the boundary, not on where it appears in the tree.

**Q: `useTransition` vs debouncing — when do you choose each?**  
A: Debouncing delays the update entirely — the UI doesn't react until the delay passes. `useTransition` starts immediately but with lower priority — the UI updates as soon as React has capacity, without a fixed delay. Debouncing is better for reducing API calls (search-as-you-type). `useTransition` is better for expensive client-side renders where you want the UI to update immediately but allow the expensive work to be deferred.

**Q: What does `Suspense` do if there's no `fallback` prop?**  
A: In React 18+, omitting `fallback` is valid — React renders nothing (null) while suspended. In earlier versions it was required. In practice you always provide a fallback for UX reasons.

**Q: If two lazy components are under the same `Suspense`, what happens?**  
A: React waits until **all** lazy components under that Suspense have resolved before switching from fallback to content. It's atomic — no partial renders. To show components as they load individually, nest separate Suspense boundaries around each component.

---

## 7. Revision Cheat Sheet

```
Error Boundary:
  Class component — getDerivedStateFromError + componentDidCatch
  getDerivedStateFromError(error) → returns state update (render phase, pure)
  componentDidCatch(error, info) → side effects like logging (commit phase)
  Catches: render errors, lifecycle errors, constructor errors
  Does NOT catch: event handlers, async code, its own errors

React.lazy + Suspense:
  const Page = lazy(() => import('./Page'))   // default export required
  <Suspense fallback={<Spinner />}>
    <Page />
  </Suspense>
  lazy throws a Promise → Suspense catches it → shows fallback → resolves → renders

Code splitting build output:
  Each lazy() call → separate JS chunk file
  Initial bundle shrinks → faster first load
  Chunks cached by browser → subsequent navigations instant

useTransition:
  const [isPending, startTransition] = useTransition()
  startTransition(() => setState(val))  ← non-urgent, interruptible
  isPending: true while transition runs → use for dimming/spinner
  vs useDeferredValue: defer a VALUE you receive (not a setter you own)

ErrorBoundary > Suspense > lazy  ← correct nesting order
lazy only at module level, not inside components
lazy requires default exports
```

---

## 8. Key Takeaways

1. **Error Boundaries must be class components** — no hooks equivalent for `getDerivedStateFromError`
2. **`React.lazy` works by throwing Promises** — Suspense catches them and shows fallback
3. **Code splitting = separate JS chunks** — the build output proves it (check `dist/assets/`)
4. **ErrorBoundary wraps Suspense** — not the other way around; lazy chunk fetch failures need the error boundary
5. **`useTransition` makes updates interruptible** — React can abandon a render if a newer update arrives
6. **`isPending` for visual feedback** — dim stale content, don't show blank
7. **`startTransition` vs debounce** — transition = immediate but low-priority; debounce = delayed entirely
8. **Lazy-load routes, not utilities** — natural page boundaries give the best cost/benefit ratio

---

*Notes: Phase 13 — Error Boundaries, Code Splitting, Lazy Loading, Suspense, useTransition*  
*Next Phase: Phase 14 — Testing (Jest, React Testing Library, msw)*
