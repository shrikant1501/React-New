# Phase 04 — Component Lifecycle and useEffect
### Side Effects, Persistence, and Custom Hooks

---

> 📌 **How to use this document**
> Read top to bottom the first time. For quick revision jump to §22 (Cheat Sheet).
> For interview prep, focus on §20 and §21 — this topic has the richest set of
> tricky interview questions of any React concept.

---

## Table of Contents

1. [Topic Overview](#1-topic-overview)
2. [The Component Lifecycle — Three Phases](#2-the-component-lifecycle--three-phases)
3. [What Are Side Effects](#3-what-are-side-effects)
4. [Why Side Effects Cannot Go in Render](#4-why-side-effects-cannot-go-in-render)
5. [useEffect — Syntax and Internal Working](#5-useeffect--syntax-and-internal-working)
6. [The Dependency Array — Complete Reference](#6-the-dependency-array--complete-reference)
7. [The Cleanup Function](#7-the-cleanup-function)
8. [StrictMode and Double Invocation](#8-strictmode-and-double-invocation)
9. [Custom Hooks — Extracting and Reusing Effect Logic](#9-custom-hooks--extracting-and-reusing-effect-logic)
10. [localStorage Persistence Pattern](#10-localstorage-persistence-pattern)
11. [Common useEffect Patterns](#11-common-useeffect-patterns)
12. [The Stale Closure Problem](#12-the-stale-closure-problem)
13. [useEffect vs useLayoutEffect](#13-useeffect-vs-uselayouteffect)
14. [Important Terminology](#14-important-terminology)
15. [Best Practices](#15-best-practices)
16. [Common Mistakes](#16-common-mistakes)
17. [Performance Considerations](#17-performance-considerations)
18. [Advantages](#18-advantages)
19. [Project Implementation Summary](#19-project-implementation-summary)
20. [Frequently Asked Interview Questions](#20-frequently-asked-interview-questions)
21. [Tricky Interview Questions](#21-tricky-interview-questions)
22. [Revision Cheat Sheet](#22-revision-cheat-sheet)
23. [Key Takeaways](#23-key-takeaways)
24. [Understanding Checklist](#24-understanding-checklist)

---

## 1. Topic Overview

`useEffect` is React's mechanism for handling **side effects** in function
components. A side effect is any operation that reaches outside React's
rendering system — reading/writing storage, network requests, DOM manipulation,
timers, subscriptions.

`useEffect` hooks into the **component lifecycle** — the three stages every
React component goes through: mount, update, and unmount. It lets you run code
at the right lifecycle moment without disrupting the render.

```jsx
useEffect(() => {
  // side effect code (runs after render)
  return () => {
    // cleanup code (runs before next effect / on unmount)
  }
}, [dependencies])
```

---

## 2. The Component Lifecycle — Three Phases

Every React component experiences three lifecycle phases:

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: MOUNT                                             │
│  Component appears in the DOM for the first time.          │
│  → JSX rendered for the first time                         │
│  → DOM nodes created                                       │
│  → useEffect with [] runs once                             │
│  → useEffect with no deps array runs once                  │
├─────────────────────────────────────────────────────────────┤
│  PHASE 2: UPDATE (can happen many times)                   │
│  Props changed (parent re-rendered) OR state changed.      │
│  → Component function called again                         │
│  → React diffs old vs new Virtual DOM                      │
│  → Minimal DOM patches applied                             │
│  → useEffect with matching deps re-runs                    │
├─────────────────────────────────────────────────────────────┤
│  PHASE 3: UNMOUNT                                          │
│  Component removed from the DOM.                           │
│  → DOM nodes deleted                                       │
│  → All useEffect cleanup functions run                     │
└─────────────────────────────────────────────────────────────┘
```

### What Causes Each Phase

| Phase | Triggered By |
|---|---|
| Mount | Component included in parent's JSX for the first time |
| Update | `setState` called, parent re-renders with new props, context changes |
| Unmount | Component excluded from parent's JSX (conditional rendering), parent unmounts |

### Class Component Lifecycle Methods → useEffect Mapping

```
componentDidMount    → useEffect(() => { ... }, [])
componentDidUpdate   → useEffect(() => { ... }, [dep1, dep2])
componentWillUnmount → useEffect(() => { return () => cleanup() }, [])
```

This mapping is important for interviews — you will often be asked to compare
class and function component lifecycle handling.

---

## 3. What Are Side Effects

A **pure function** takes inputs and returns an output with no other observable
effects on the world. React components should be pure during render.

A **side effect** is anything a function does besides computing its return value:

```
Side effects in React context:
  ✦ Reading from / writing to localStorage or sessionStorage
  ✦ Making HTTP requests (fetch, axios)
  ✦ Setting up timers (setInterval, setTimeout)
  ✦ Subscribing to WebSocket or event streams
  ✦ Manually manipulating the DOM (document.title, focus, scroll)
  ✦ Adding event listeners (window.addEventListener)
  ✦ Logging to an analytics service
  ✦ Integrating with third-party non-React libraries (charts, maps)
```

None of these belong in the render function — they all belong in `useEffect`.

---

## 4. Why Side Effects Cannot Go in Render

### Reason 1: Render runs more than you think

React may call your component function multiple times before committing to the
DOM (Concurrent Mode), and `React.StrictMode` deliberately calls it twice in
development. Side effects in render execute unexpectedly often.

### Reason 2: Render must be pure for reconciliation

React's reconciliation algorithm assumes components are pure — same input, same
output. Side effects in render break this assumption and can produce inconsistent
trees during diffing.

### Reason 3: No cleanup mechanism

Side effects often need cleanup (cancel timers, remove listeners). Render has
no return-value mechanism for cleanup. `useEffect` has the cleanup function.

### Reason 4: Infinite loop risk

```jsx
// ❌ This causes an infinite loop:
function Component() {
  const [data, setData] = useState(null)
  fetch('/api/data').then(r => r.json()).then(d => setData(d))
  // → setData triggers re-render
  // → re-render calls fetch again
  // → fetch calls setData again
  // → infinite loop!
  return <div>{data}</div>
}

// ✅ useEffect with [] prevents the loop — runs once on mount:
function Component() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(d => setData(d))
  }, [])
  return <div>{data}</div>
}
```

---

## 5. useEffect — Syntax and Internal Working

### Syntax

```jsx
useEffect(effectFunction, dependencyArray)
```

### Internal Working

**Where useEffect stores its data**: Like `useState`, `useEffect` stores its
data in the Fiber node's `memoizedState` linked list. Each `useEffect` call
occupies one node in the list, storing:
- The previous dependency array
- The cleanup function from the last run

```javascript
// Simplified internal representation:
FiberNode.memoizedState = {
  // ... useState nodes ...
  {
    tag: 'effect',
    deps: [previousDep1, previousDep2],   // last run's deps
    destroy: previousCleanupFunction,     // last run's cleanup
    create: effectFunction,               // the function to run
    next: ...
  }
}
```

**How React decides when to run an effect:**

```
After render + commit:
  1. React iterates through all useEffect nodes in the Fiber
  2. For each effect:
     a. If no deps array → run every time
     b. If deps array is empty [] → run only on first render (mount)
     c. If deps array has values → compare with stored previous deps
        using Object.is(). If any differ → run the effect.
  3. Before running → call the previous cleanup (if any)
  4. Run the effect → store the returned cleanup function
```

### The Execution Order with Multiple Effects

```jsx
function Component() {
  useEffect(() => { console.log('Effect A') }, [a])
  useEffect(() => { console.log('Effect B') }, [b])
  useEffect(() => { console.log('Effect C') }, [])
}
```

Effects run **in the order they are declared**, after paint. Cleanups also run
in declaration order before the next effect cycle.

---

## 6. The Dependency Array — Complete Reference

```jsx
// ── No dependency array ──────────────────────────────────────────────────────
useEffect(() => {
  // Runs after EVERY render — mount and every update
  // Almost never what you want — performance issue
  document.title = 'Updated'
})

// ── Empty dependency array [] ────────────────────────────────────────────────
useEffect(() => {
  // Runs ONCE — after the first render (mount) only
  // Perfect for: initial data fetch, one-time subscriptions, reading localStorage
  fetch('/api/initial-data').then(...)
}, [])

// ── With dependencies ─────────────────────────────────────────────────────────
useEffect(() => {
  // Runs after mount AND after any render where userId changed
  fetch(`/api/user/${userId}`).then(...)
}, [userId])

// ── Multiple dependencies ─────────────────────────────────────────────────────
useEffect(() => {
  // Runs when EITHER tasks OR filter changes
  saveToServer(tasks, filter)
}, [tasks, filter])

// ── Function dependency — the trap ────────────────────────────────────────────
useEffect(() => {
  fetchData(formatQuery(filter))   // uses formatQuery
}, [filter, formatQuery])
// ⚠️ If formatQuery is defined inside the component, it's a NEW function on
// every render → Object.is(oldFn, newFn) is ALWAYS false → effect runs every render!
// Solution: define formatQuery outside the component, or use useCallback (Phase 7)
```

### The Exhaustive Dependencies Rule

The React team's `eslint-plugin-react-hooks` enforces that every value used
inside `useEffect` that comes from the component's scope must be in the
dependency array. This catches stale closure bugs.

```jsx
// ❌ Missing dependency — linter will warn:
useEffect(() => {
  document.title = `${count} todos`
  // 'count' is used but not in deps → stale closure on updates
}, [])

// ✅ Correct:
useEffect(() => {
  document.title = `${count} todos`
}, [count])
```

---

## 7. The Cleanup Function

The cleanup function is the optional return value of the effect function.
React calls it:
1. **Before the next run** of the same effect (when deps change)
2. **When the component unmounts**

```jsx
// Pattern 1: Cleanup on unmount only ([] deps)
useEffect(() => {
  const handler = () => console.log('scroll')
  window.addEventListener('scroll', handler)

  return () => window.removeEventListener('scroll', handler)
  // Runs once when component unmounts — removes the listener
}, [])

// Pattern 2: Cleanup before re-run (with deps)
useEffect(() => {
  const subscription = subscribe(userId)

  return () => subscription.unsubscribe()
  // Runs when userId changes: unsubscribe old, then subscribe new
}, [userId])

// Pattern 3: Abort controller — cancel fetch on unmount or re-run
useEffect(() => {
  const controller = new AbortController()

  fetch(`/api/user/${userId}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => setUser(data))
    .catch(err => {
      if (err.name !== 'AbortError') setError(err.message)
      // AbortError is expected — don't treat it as a real error
    })

  return () => controller.abort()
}, [userId])
```

### The Cleanup Lifecycle Timeline

```
MOUNT:
  render → paint → effect runs → cleanup stored

DEPENDENCY CHANGES (userId: 1 → 2):
  render → paint → OLD cleanup runs (unsubscribe userId=1)
                 → NEW effect runs (subscribe userId=2)
                 → NEW cleanup stored

UNMOUNT:
  DOM removed → CURRENT cleanup runs (unsubscribe userId=2)
```

---

## 8. StrictMode and Double Invocation

In development, `React.StrictMode` intentionally mounts, unmounts, and remounts
every component to expose cleanup bugs:

```
Development with StrictMode:
  Mount → Effect → Cleanup → Effect (second mount simulation)

Production:
  Mount → Effect
```

This means in development, `useEffect` with `[]` appears to run twice. This is
**intentional and correct**. If your code breaks on the second run, your
cleanup function is missing or insufficient.

```jsx
// ❌ Breaks on second mount — no cleanup:
useEffect(() => {
  const ws = new WebSocket(url)
  setSocket(ws)
  // No cleanup — second mount creates a second WebSocket, first one leaks
}, [])

// ✅ Safe — cleanup closes the socket:
useEffect(() => {
  const ws = new WebSocket(url)
  setSocket(ws)

  return () => ws.close()
  // Second mount: first socket closed, new one opened — no leak
}, [])
```

---

## 9. Custom Hooks — Extracting and Reusing Effect Logic

A **custom hook** is a JavaScript function whose name starts with `use` that
calls one or more React hooks inside it.

### Why Custom Hooks

```
Problem: Same useEffect + useState logic needed in multiple components
         (e.g., localStorage sync in 3 different pages)

Bad solution: Copy-paste the logic into each component
              → 3 places to maintain → divergence over time → bugs

Good solution: Extract into a custom hook
               → 1 place to maintain → consistent behaviour everywhere
```

### Rules for Custom Hooks

1. Name must start with `use` (enforces Rules of Hooks linting)
2. Must call at least one React hook internally
3. Can accept parameters and return any value(s)
4. Follow the same Rules of Hooks as regular hooks

### Custom Hook vs Regular Function

```jsx
// Regular function — no hooks inside:
function formatDate(date) {
  return new Date(date).toLocaleDateString()
}
// Can be called anywhere — in render, in effects, in event handlers

// Custom hook — contains hooks:
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(...)  // ← contains hook
  useEffect(...)                           // ← contains hook
  return [value, setValue]
}
// Can ONLY be called at the top level of a component or another custom hook
```

### The Three Custom Hooks We Built

```
hooks/
├── useLocalStorage.js    — useState + useEffect for storage persistence
├── useDocumentTitle.js   — useEffect for browser tab title
└── useTaskStats.js       — pure computation (no hooks needed, shown for contrast)
```

---

## 10. localStorage Persistence Pattern

The standard two-step pattern for persisting React state:

```jsx
// Step 1: Lazy initialisation — read from storage on mount ONLY
const [value, setValue] = useState(() => {
  try {
    const item = localStorage.getItem(key)
    return item !== null ? JSON.parse(item) : initialValue
  } catch {
    return initialValue   // storage might be unavailable (private mode)
  }
})

// Step 2: Write effect — mirror state to storage on every change
useEffect(() => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Silently fail — storage full or unavailable
  }
}, [key, value])
```

### Why JSON.stringify / JSON.parse?

`localStorage` only stores strings. Objects and arrays must be serialised:

```javascript
// Storing:
localStorage.setItem('tasks', JSON.stringify([{id:1, title:'Learn React'}]))
// → stores: '[{"id":1,"title":"Learn React"}]'

// Reading:
JSON.parse(localStorage.getItem('tasks'))
// → returns: [{id:1, title:'Learn React'}]

// Without JSON:
localStorage.setItem('tasks', [{id:1}])
// → stores: '[object Object]' — useless!
localStorage.getItem('tasks')
// → returns: '[object Object]' — not parseable
```

---

## 11. Common useEffect Patterns

### Fetching Data on Mount

```jsx
useEffect(() => {
  let cancelled = false   // flag to prevent state update after unmount

  async function fetchTasks() {
    try {
      setLoading(true)
      const res = await fetch('/api/tasks')
      const data = await res.json()
      if (!cancelled) setTasks(data)   // only update if still mounted
    } catch (err) {
      if (!cancelled) setError(err.message)
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  fetchTasks()

  return () => { cancelled = true }   // cleanup: prevent stale state updates
}, [])
```

### Re-fetching When a Dependency Changes

```jsx
useEffect(() => {
  const controller = new AbortController()

  fetch(`/api/tasks?filter=${activeFilter}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => setTasks(data))
    .catch(err => { if (err.name !== 'AbortError') setError(err) })

  return () => controller.abort()
}, [activeFilter])
// ↑ Re-fetches when activeFilter changes. Cancels in-flight request if filter
//   changes again before the previous response arrives (race condition prevention).
```

### Syncing with an External Store

```jsx
useEffect(() => {
  function handleStorageChange(e) {
    if (e.key === 'tasks') {
      setTasks(JSON.parse(e.newValue))
    }
  }
  window.addEventListener('storage', handleStorageChange)
  return () => window.removeEventListener('storage', handleStorageChange)
}, [])
// Syncs tasks when another browser tab modifies localStorage
```

### Debouncing a Search Input

```jsx
useEffect(() => {
  const timer = setTimeout(() => {
    performSearch(query)
  }, 300)   // wait 300ms after user stops typing

  return () => clearTimeout(timer)
  // Cleanup: if user types again within 300ms, cancel the previous timer
}, [query])
```

---

## 12. The Stale Closure Problem

The most common `useEffect` bug. It occurs when an effect closes over a value
from an old render and uses it in a context where the current value is expected.

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count)   // ← stale closure! Always logs 0
      setCount(count + 1)  // ← always sets to 0+1=1, never increments past 1
    }, 1000)
    return () => clearInterval(id)
  }, [])   // [] means effect runs once — closes over count=0 forever
```

**Solutions:**

```jsx
// Solution 1: Add count to deps (but this creates a new interval on every count change)
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1)
  }, 1000)
  return () => clearInterval(id)
}, [count])   // new interval every second — wasteful

// Solution 2: Functional update (best — no stale closure):
useEffect(() => {
  const id = setInterval(() => {
    setCount(prev => prev + 1)   // always uses latest value — no closure needed
  }, 1000)
  return () => clearInterval(id)
}, [])   // correct! [] is fine because functional update doesn't need 'count'

// Solution 3: useRef (for values that don't trigger re-renders — Phase 7)
```

---

## 13. useEffect vs useLayoutEffect

Both run after render, but at different timing points:

| | `useEffect` | `useLayoutEffect` |
|---|---|---|
| **When it runs** | After paint — browser has updated the screen | After DOM update but BEFORE paint — synchronously |
| **Blocks paint?** | No — async, doesn't delay visual update | Yes — blocks until effect completes |
| **Use for** | API calls, subscriptions, storage, most effects | Reading DOM measurements (element size/position) |
| **SSR** | Works normally | Generates a warning on server (no DOM) |
| **Frequency of use** | 95%+ of use cases | Rare — only when you need DOM dimensions |

```jsx
// useLayoutEffect example — measuring a DOM element before paint:
useLayoutEffect(() => {
  const height = ref.current.getBoundingClientRect().height
  setHeight(height)
  // Runs before browser paints → user never sees the un-measured state
}, [])
```

**Rule of thumb**: Always start with `useEffect`. Only switch to `useLayoutEffect`
if you see a flicker caused by the effect needing to read then modify the DOM.

---

## 14. Important Terminology

| Term | Definition |
|---|---|
| **Side effect** | Any operation that reaches outside React's rendering — storage, network, DOM, timers, subscriptions. |
| **useEffect** | Hook that runs a function after render. The designated place for side effects. |
| **Dependency array** | Second argument to useEffect. Controls when the effect re-runs. |
| **Cleanup function** | Optional return value of the effect function. Runs before the next effect and on unmount. |
| **Mount** | Component added to the DOM for the first time. |
| **Update** | Component re-rendered due to state/props change. |
| **Unmount** | Component removed from the DOM. |
| **Stale closure** | A bug where an effect (or any function) captures an old value from a previous render and uses it incorrectly. |
| **Custom hook** | A function starting with `use` that calls other hooks. Used to extract and reuse stateful logic. |
| **Lazy initialisation** | Passing a function to `useState(() => value)` so the initial value is computed only once, not on every render. |
| **Race condition** | A bug where two async operations (e.g., two fetches) can arrive in unpredictable order, causing wrong data to be displayed. |
| **AbortController** | Browser API for cancelling in-flight fetch requests. Used as effect cleanup to prevent race conditions. |
| **useLayoutEffect** | Synchronous sibling to useEffect. Runs after DOM update but before browser paint. |
| **componentDidMount** | Class component lifecycle method equivalent to `useEffect(..., [])`. |
| **componentWillUnmount** | Class component lifecycle method equivalent to the cleanup function in `useEffect`. |

---

## 15. Best Practices

1. **Every effect should have a dependency array** — no array = runs every render = almost never correct.

2. **Never lie about dependencies** — include everything your effect uses from component scope:
   ```jsx
   // ❌ Lying — uses 'count' but omits it from deps:
   useEffect(() => { setTotal(count * price) }, [price])

   // ✅ Honest:
   useEffect(() => { setTotal(count * price) }, [count, price])
   ```

3. **Always clean up subscriptions, timers, and event listeners:**
   ```jsx
   useEffect(() => {
     window.addEventListener('resize', handler)
     return () => window.removeEventListener('resize', handler)
   }, [])
   ```

4. **Use `AbortController` for fetch cleanup:**
   ```jsx
   useEffect(() => {
     const controller = new AbortController()
     fetch(url, { signal: controller.signal })...
     return () => controller.abort()
   }, [url])
   ```

5. **Use functional updates to avoid stale closures in effects with timers:**
   ```jsx
   useEffect(() => {
     const id = setInterval(() => setCount(c => c + 1), 1000)
     return () => clearInterval(id)
   }, [])
   ```

6. **Extract complex effect logic into custom hooks** — keeps components clean.

7. **Keep each effect focused on ONE concern** — use multiple `useEffect` calls:
   ```jsx
   useEffect(() => { fetchUser(userId) }, [userId])   // fetching
   useEffect(() => { document.title = name }, [name]) // DOM side effect
   // Don't combine — separate concerns are easier to debug
   ```

8. **Never use `async` directly as the effect function:**
   ```jsx
   // ❌ Wrong — async function returns a Promise, not a cleanup function:
   useEffect(async () => { await fetch(...) }, [])

   // ✅ Correct — define async function inside, call it:
   useEffect(() => {
     async function load() { const data = await fetch(...); setData(data) }
     load()
   }, [])
   ```

---

## 16. Common Mistakes

| Mistake | What Goes Wrong | Fix |
|---|---|---|
| No dependency array | Effect runs after every render — performance issue, infinite loops | Add `[]` or correct deps |
| Empty `[]` when deps are needed | Stale closure — effect uses old values forever | Add the used values to deps |
| Side effects in render | Infinite loops, double execution, no cleanup | Move to `useEffect` |
| Mutating objects in deps | Object reference never changes → effect never re-runs | Ensure new reference is created on state update |
| Missing cleanup for subscriptions | Memory leak — listeners/timers persist after unmount | Always return cleanup function |
| `async` effect function directly | Effect returns a Promise, not a cleanup function — React ignores it | Define async fn inside effect, call it |
| Fetch without abort | Race condition — slow request from old dep resolves after fast one | Use `AbortController` |
| Multiple concerns in one effect | Hard to debug, harder to control dependencies | Split into multiple effects |

---

## 17. Performance Considerations

### Effects Run After Paint — Not a Performance Problem by Default

`useEffect` is non-blocking. It runs after the browser has painted, so it
never delays the user seeing the updated UI.

### The Infinite Loop — The Classic Performance Disaster

```jsx
// ❌ Infinite loop:
const [data, setData] = useState([])
useEffect(() => {
  setData([...data, 1])   // state update → re-render → effect → state update...
}, [data])                // 'data' changes on every render → infinite loop

// ✅ Break the loop — only run once:
useEffect(() => {
  setData([1, 2, 3])      // set initial data once
}, [])
```

### Expensive Effects and Dependency Stability

If a dep array contains an object/array/function created inline, the dependency
changes on every render:

```jsx
// ❌ options is a new object every render → effect runs every render:
function Component({ userId }) {
  const options = { headers: { 'Auth': token } }   // new object every render
  useEffect(() => {
    fetch(`/api/${userId}`, options)
  }, [userId, options])   // options always "changed"
}

// ✅ Move static objects outside component:
const DEFAULT_OPTIONS = { headers: { 'Auth': token } }
function Component({ userId }) {
  useEffect(() => {
    fetch(`/api/${userId}`, DEFAULT_OPTIONS)
  }, [userId])   // stable reference — only re-runs when userId changes
}
```

---

## 18. Advantages

1. **Lifecycle control without classes** — all three lifecycle phases accessible in functional components
2. **Co-location** — related setup and cleanup live together in the same hook call
3. **Reusability** — extract into custom hooks and share across components
4. **Composability** — multiple `useEffect` calls, each focused on one concern
5. **Explicit dependencies** — the dependency array makes data relationships visible
6. **StrictMode safety** — double-invocation surfaces missing cleanup bugs during development

---

## 19. Project Implementation Summary

### What We Built in Phase 4

**New files — hooks directory:**
```
src/hooks/
├── useLocalStorage.js   — persists any state to localStorage (useState + useEffect)
├── useDocumentTitle.js  — updates browser tab title (useEffect + cleanup)
└── useTaskStats.js      — computes task counts (pure computation, no hooks)
```

**New component:**
- `src/components/LifecycleDemo.jsx` — interactive lifecycle visualiser with console logs

**Updated:**
- `src/App.jsx` — uses `useLocalStorage` instead of `useState` for tasks,
  uses `useTaskStats`, uses `useDocumentTitle`, adds lifecycle demo toggle

### The Interaction Flow of Persistence

```
User adds a task:
  handleAddTask → setTasks(prev => [...prev, newTask])
    → App re-renders
    → useLocalStorage's useEffect fires (tasks dep changed)
    → localStorage.setItem('tasks', JSON.stringify(updatedTasks))
    → data safely persisted

User refreshes page:
  useLocalStorage's useState lazy initialiser runs
    → localStorage.getItem('tasks')
    → JSON.parse(stored)
    → tasks state = persisted tasks (not INITIAL_TASKS)
    → UI shows tasks from before refresh ✓
```

### Key Code Patterns

```jsx
// 1. Lazy initialisation — read localStorage ONCE on mount
const [tasks, setTasks] = useState(() => {
  const stored = localStorage.getItem('tasks')
  return stored ? JSON.parse(stored) : INITIAL_TASKS
})

// 2. Write effect — sync to localStorage after each tasks change
useEffect(() => {
  localStorage.setItem('tasks', JSON.stringify(tasks))
}, [tasks])

// 3. Combined as useLocalStorage custom hook:
const [tasks, setTasks] = useLocalStorage('tasks', INITIAL_TASKS)

// 4. Document title effect
useEffect(() => {
  const prev = document.title
  document.title = title
  return () => { document.title = prev }   // cleanup restores title
}, [title])

// 5. Effect lifecycle sequence (from LifecycleDemo):
useEffect(() => { console.log('mount') }, [])               // [] = once
useEffect(() => { console.log('every render') })             // no deps = always
useEffect(() => { console.log('count changed') }, [count]) // dep = on change
```

---

## 20. Frequently Asked Interview Questions

**Q1. What is a side effect in React?**
> A side effect is any operation that reaches outside React's component tree —
> reading/writing localStorage, making API calls, setting timers, adding event
> listeners, or manipulating the DOM. They belong in `useEffect`, not in the
> render function, because render must be pure and may run multiple times.

**Q2. What are the three forms of useEffect?**
> (1) No deps array — runs after every render. (2) Empty array `[]` — runs once
> after mount. (3) Array with values — runs after mount and after any render
> where the deps changed. The dep array controls when the effect re-runs.

**Q3. What is the cleanup function in useEffect?**
> The optional function returned by the effect. React calls it before running
> the effect again (when deps change) and when the component unmounts. Used
> to cancel timers, remove event listeners, close WebSockets, abort fetch
> requests — anything that would cause memory leaks or stale state updates
> if left running after the component is gone.

**Q4. What is a custom hook?**
> A JavaScript function whose name starts with `use` that calls one or more
> React hooks inside it. Used to extract stateful or effect logic from a
> component so it can be reused across multiple components without changing
> the component tree (no wrapper components needed).

**Q5. How does `useEffect` map to class component lifecycle methods?**
> `useEffect(() => {}, [])` = `componentDidMount`.
> `useEffect(() => {}, [dep])` = `componentDidUpdate` (only when dep changes).
> Returning a cleanup function = `componentWillUnmount`.
> Multiple `useEffect` calls replace the single `componentDidUpdate` pattern
> where you'd check `prevProps` to decide what to do.

**Q6. Why can't you use `async` directly as the effect function?**
> An `async` function always returns a Promise. `useEffect` expects the return
> value to be either undefined or a cleanup function. A Promise is neither,
> so React ignores it — and the cleanup function is lost. Fix: define an async
> function inside the effect and call it: `useEffect(() => { async function load() {...}; load() }, [])`.

**Q7. What is the stale closure problem in useEffect?**
> When an effect closes over a value (like state or props) from the render
> when it was created, and that value later changes, the effect still holds
> the old value — a stale closure. Fix: add the value to the dependency array
> so the effect recreates with the fresh value, or use functional updates
> (`setState(prev => ...)`) to avoid needing the current value in scope.

**Q8. Why does `React.StrictMode` run effects twice in development?**
> StrictMode simulates the Concurrent Mode pattern where React might mount,
> unmount, and remount a component (for offscreen optimization). It deliberately
> runs `mount → cleanup → mount` to surface missing cleanup bugs. If the effect
> is idempotent and the cleanup is correct, running twice is safe. Production
> always runs once.

**Q9. What is the difference between `useEffect` and `useLayoutEffect`?**
> Both run after a render. `useEffect` runs asynchronously after the browser
> has painted — it never blocks the visual update. `useLayoutEffect` runs
> synchronously after DOM updates but before paint — it blocks paint until
> complete. Use `useLayoutEffect` only when you need to read DOM measurements
> before the user sees the render (e.g., measuring element size to position
> a tooltip). For everything else, use `useEffect`.

**Q10. How do you prevent a race condition in a data-fetching useEffect?**
> Use an `AbortController`: create one in the effect, pass its signal to fetch,
> and abort it in the cleanup. When the dependency changes (e.g., userId changes
> before the first fetch completes), the cleanup aborts the in-flight request.
> The second effect runs a fresh fetch. This prevents old responses from
> overwriting new data.

---

## 21. Tricky Interview Questions

**Q1. You have `useEffect(() => { setCount(count + 1) }, [count])`. What happens?**
> Infinite loop. The effect runs after mount (count=0), sets count to 1.
> count changing triggers the effect again, which sets count to 2. And so on.
> The effect depends on `count` AND modifies `count` — circular dependency.
> Fix: `setCount(prev => prev + 1)` then put `[]` as deps — no dependency on count needed.

**Q2. What does this log? Component mounts, then count increments from 0 to 1:**
```jsx
useEffect(() => {
  console.log('A')
  return () => console.log('B')
}, [count])
```
> On mount: `A` (effect runs)
> On count 0→1: `B` (cleanup of previous effect runs), then `A` (new effect runs)
> On unmount: `B` (final cleanup runs)
> Sequence: A → B → A → B

**Q3. If you add a value to the dependency array that's an object created
inline (e.g., `useEffect(..., [{ id: 1 }])`), when does the effect run?**
> Every render. `{ id: 1 }` creates a new object literal on each render.
> `Object.is(oldObj, newObj)` compares by reference — two different objects are
> never equal, even with identical contents. The dependency always "changes".
> Fix: extract the object outside the component (if static) or use `useMemo`
> (if dynamic).

**Q4. Is it safe to fetch data without cleanup? What can go wrong?**
> Not safe in components that can unmount before the fetch resolves. If the
> component unmounts while a fetch is in flight, and the fetch eventually
> resolves and calls `setState`, React will log: "Can't perform a React state
> update on an unmounted component." The fix: either use an `AbortController`
> or a `cancelled` flag that prevents `setState` from being called after unmount.

**Q5. Can a custom hook conditionally call `useState`?**
> No — custom hooks must follow the same Rules of Hooks as components. You
> cannot call `useState` (or any hook) conditionally inside a custom hook
> any more than inside a component. The hook order must be consistent across
> every call to the custom hook.

---

## 22. Revision Cheat Sheet

```
useEffect AND LIFECYCLE — QUICK REFERENCE
══════════════════════════════════════════════════════════

LIFECYCLE PHASES
  Mount   → component added to DOM (first render)
  Update  → props or state changed (re-render)
  Unmount → component removed from DOM

useEffect FORMS
  useEffect(fn)          → runs after EVERY render
  useEffect(fn, [])      → runs ONCE after mount
  useEffect(fn, [a, b])  → runs after mount + when a or b changes

CLEANUP FUNCTION
  useEffect(() => {
    // setup
    return () => { /* cleanup */ }
  }, [deps])
  → cleanup runs: before next effect AND on unmount

DEPENDENCY ARRAY RULES
  • Include ALL values from component scope that the effect uses
  • Objects/arrays/functions: must be stable references (or useMemo/useCallback)
  • Never lie about deps → stale closure bugs

SIDE EFFECTS BELONG IN useEffect
  ✅ localStorage read/write       ✅ fetch / axios
  ✅ setInterval / setTimeout      ✅ addEventListener
  ✅ document.title                ✅ WebSocket
  ❌ Never directly in render body

NEVER async DIRECTLY:
  useEffect(async () => ...)   ← wrong (returns Promise, not cleanup fn)
  useEffect(() => { async function f() {...}; f() }, [])  ← correct

CUSTOM HOOKS
  • Function starting with 'use' that calls hooks inside
  • Extracts stateful/effect logic for reuse
  • Same Rules of Hooks apply inside
  • Returns whatever the caller needs (array, object, values)

localStorage PATTERN
  // Read once (lazy init):
  const [v, setV] = useState(() => JSON.parse(localStorage.getItem(key)))
  // Write on change:
  useEffect(() => { localStorage.setItem(key, JSON.stringify(v)) }, [key, v])

STALE CLOSURE FIX
  • Add value to deps (re-creates effect when value changes)
  • Use functional update setState(prev => ...) (no closure needed)
  • Use useRef to hold latest value without causing re-run

CLASS vs FUNCTION LIFECYCLE
  componentDidMount     →  useEffect(() => {}, [])
  componentDidUpdate    →  useEffect(() => {}, [dep])
  componentWillUnmount  →  return () => cleanup in useEffect

══════════════════════════════════════════════════════════
```

---

## 23. Key Takeaways

1. **Side effects do not belong in render** — render must be pure. Side effects
   go in `useEffect`, which runs after React has committed the render to the DOM.

2. **The dependency array controls when the effect runs**, not what it does.
   No array = every render. `[]` = once on mount. `[deps]` = on change.

3. **React compares dependencies with `Object.is()`** — objects and functions
   created inline are always "new", causing effects to run every render.

4. **Always clean up** — subscriptions, timers, event listeners, and fetch
   requests need cleanup. Missing cleanup = memory leak or stale state update.

5. **StrictMode double-invocation is a feature, not a bug** — if your effect
   breaks on second run, your cleanup is wrong.

6. **The stale closure is the most common `useEffect` bug** — when an effect
   closes over a value that later changes but isn't in the deps array.

7. **Custom hooks extract effect logic for reuse** — they are the primary
   abstraction tool in React beyond components themselves.

8. **`useEffect` is asynchronous** — it runs after the browser has painted.
   Use `useLayoutEffect` only for DOM measurement before paint.

9. **Never use `async` directly as the effect function** — it returns a
   Promise where a cleanup function is expected.

10. **The `localStorage` pattern is always the same**: lazy init to read,
    effect to write — keep them together in a custom hook.

---

## 24. Understanding Checklist

Before moving to Phase 5, verify you can answer all of these:

- [ ] I can name the three lifecycle phases and what triggers each
- [ ] I can explain why side effects cannot go directly in the render function (3 reasons)
- [ ] I can write all 3 forms of `useEffect` from memory and explain when each runs
- [ ] I can explain what the cleanup function is and when React calls it
- [ ] I can trace the cleanup timeline: mount → dep change → unmount
- [ ] I understand why StrictMode runs effects twice (and why that's correct)
- [ ] I can explain what a stale closure is and show how to fix it
- [ ] I can explain why `async` cannot be used directly as the effect function
- [ ] I can write the `localStorage` persistence pattern from memory
- [ ] I can explain what a custom hook is, when to extract one, and the rules it must follow
- [ ] I can explain the difference between `useEffect` and `useLayoutEffect`
- [ ] I have the dashboard running with tasks persisting across page refreshes
- [ ] I have used the Lifecycle Visualiser (checkbox in the dashboard) and
      observed the mount → update → cleanup → unmount sequence in DevTools Console
- [ ] I can map `componentDidMount`, `componentDidUpdate`, `componentWillUnmount`
      to their `useEffect` equivalents

---

*Phase 04 Notes — Complete*
*Next: Phase 05 — useRef, Forms, Controlled vs Uncontrolled Components*
