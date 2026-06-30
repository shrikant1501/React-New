# Phase 03 — State and useState
### Making the UI Interactive: React's Memory System

---

> 📌 **How to use this document**
> Read top to bottom the first time. For quick revision jump to §22 (Cheat Sheet).
> For interview prep, go to §20 and §21.

---

## Table of Contents

1. [Topic Overview](#1-topic-overview)
2. [Why State Exists — The Problem It Solves](#2-why-state-exists--the-problem-it-solves)
3. [Internal Working — How useState Works Inside React](#3-internal-working--how-usestate-works-inside-react)
4. [JavaScript Foundation — Closures](#4-javascript-foundation--closures)
5. [The Rules of Hooks — Why They Exist](#5-the-rules-of-hooks--why-they-exist)
6. [useState Syntax — Complete Reference](#6-usestate-syntax--complete-reference)
7. [State Updates Are Asynchronous and Batched](#7-state-updates-are-asynchronous-and-batched)
8. [The Functional Update Pattern](#8-the-functional-update-pattern)
9. [Immutability — The Cardinal Rule for Objects and Arrays](#9-immutability--the-cardinal-rule-for-objects-and-arrays)
10. [Derived State — What NOT to Put in useState](#10-derived-state--what-not-to-put-in-usestate)
11. [Lifting State Up](#11-lifting-state-up)
12. [Local State vs Shared State](#12-local-state-vs-shared-state)
13. [Event Handling in React](#13-event-handling-in-react)
14. [Controlled Components (Forms)](#14-controlled-components-forms)
15. [Important Terminology](#15-important-terminology)
16. [Best Practices](#16-best-practices)
17. [Common Mistakes](#17-common-mistakes)
18. [Performance Considerations](#18-performance-considerations)
19. [Project Implementation Summary](#19-project-implementation-summary)
20. [Frequently Asked Interview Questions](#20-frequently-asked-interview-questions)
21. [Tricky Interview Questions](#21-tricky-interview-questions)
22. [Revision Cheat Sheet](#22-revision-cheat-sheet)
23. [Key Takeaways](#23-key-takeaways)
24. [Understanding Checklist](#24-understanding-checklist)

---

## 1. Topic Overview

**State** is a component's memory — data that:
1. Is owned and managed by the component itself
2. Can change over time (in response to user interaction, API calls, timers, etc.)
3. When changed, **automatically causes the component to re-render** with the new data

`useState` is a React **Hook** — a special function that lets you add state to
a functional component. It is the most fundamental and most-used hook in React.

```jsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  //     ↑         ↑              ↑
  //  current    setter       initial value
  //   value    function     (used only on first render)

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  )
}
```

---

## 2. Why State Exists — The Problem It Solves

### Attempt 1: Why a Regular Variable Doesn't Work

The natural first instinct is to use a regular JavaScript variable:

```jsx
function Counter() {
  let count = 0                     // regular variable

  function handleClick() {
    count = count + 1
    console.log(count)              // correctly logs 1, 2, 3...
  }

  return <button onClick={handleClick}>{count}</button>
  // PROBLEM: screen always shows 0 — it never updates visually
}
```

**Problem 1 — React doesn't know to re-render:**
Changing a plain variable never triggers a re-render. React only re-renders when
it is explicitly told to via a state setter function.

**Problem 2 — Variables reset on every render:**
A React component function runs from scratch on every render. If it did re-render,
`let count = 0` would reset the variable to 0 on each call. There would be no
persistence between renders.

### How State Solves Both Problems

1. **Calling the setter (`setCount`) schedules a re-render** — React is notified
2. **State is stored in the Fiber node** — outside your function — so it
   **persists between renders** and is not reset when the function runs again

```
Component function (runs fresh on every render)
        ↑ reads
Fiber Node (persists across renders)
  memoizedState: { value: 5 }   ← state lives here, safe from resets
```

---

## 3. Internal Working — How useState Works Inside React

### Where State Lives: The Fiber Node

State does not live inside your component function. It lives in the
**Fiber node** — React's internal object representing your component:

```javascript
// Simplified Fiber node structure
FiberNode {
  type: Counter,
  memoizedState: {          // ← ALL hooks store their data here
    value: 5,               //   first useState value
    next: {
      value: 'all',         //   second useState value
      next: {
        value: false,       //   third useState value
        next: null
      }
    }
  }
}
```

This is a **linked list** — each node represents one hook call in order.

### The Two Phases of useState

**Phase 1: Mount (first render)**
```javascript
// Pseudocode of what React does internally:
function useState(initialValue) {
  // No existing state node for this position → create one
  const stateNode = { value: initialValue, next: null }
  appendToLinkedList(currentFiber.memoizedState, stateNode)

  const setter = (newValue) => {
    stateNode.value = newValue
    scheduleRerender(currentFiber)
  }

  return [initialValue, setter]
}
```

**Phase 2: Update (subsequent renders)**
```javascript
function useState(initialValue) {
  // State node already exists at this position → read existing value
  const stateNode = readFromLinkedList(currentFiber.memoizedState)
  // initialValue is completely IGNORED on updates

  const setter = (newValue) => { ... }  // same setter, same closure

  return [stateNode.value, setter]  // return CURRENT value, not initial
}
```

### The Critical Insight: Initial Value Is Used Only Once

```jsx
function App() {
  const [count, setCount] = useState(heavyCalculation())
  //                                 ↑ This runs on EVERY render!
  //                                   But the result is only used on the first.
  //                                   It's wasteful.
}

// ✅ Lazy initialisation — pass a function, React calls it only on mount:
function App() {
  const [count, setCount] = useState(() => heavyCalculation())
  //                                 ↑ Called ONCE. Result stored in Fiber.
  //                                   On subsequent renders, ignored entirely.
}
```

---

## 4. JavaScript Foundation — Closures

The `useState` setter function works because of **JavaScript closures** —
one of the most important JavaScript concepts.

### What Is a Closure?

A closure is a function that **remembers the variables from the scope where it
was created**, even after that scope has finished executing.

```javascript
function makeCounter() {
  let count = 0                // 'count' lives in makeCounter's scope

  function increment() {
    count = count + 1          // 'increment' closes over 'count'
    console.log(count)
  }

  return increment
}

const counter = makeCounter()  // makeCounter finishes executing
counter()                      // logs 1 — count is remembered!
counter()                      // logs 2 — still remembered!
```

### How Closures Power useState

```javascript
// Each component's setter closes over its Fiber node reference:
function createStateSetter(fiberNode, hookIndex) {
  return function setter(newValue) {
    // This function closes over 'fiberNode' and 'hookIndex'
    // Even when called long after useState() returned,
    // it still has access to these references.
    fiberNode.memoizedState[hookIndex] = newValue
    scheduleRerender(fiberNode)
  }
}
```

When you call `setCount(5)` from a button click handler, the setter:
1. Uses the closed-over `fiberNode` reference to find the right component
2. Updates the state at the right position in the linked list
3. Schedules a re-render of that component

Without closures, `useState` could not work. This is why understanding
closures is essential for understanding React hooks.

---

## 5. The Rules of Hooks — Why They Exist

React identifies each hook call **by its position** in the execution order.
This is why two strict rules must always be followed:

### Rule 1: Only Call Hooks at the Top Level

```jsx
// ✅ Correct — always called, always in the same order:
function Component() {
  const [a, setA] = useState(0)       // always position 0
  const [b, setB] = useState('')      // always position 1
  const [c, setC] = useState(false)   // always position 2
}

// ❌ Wrong — hook conditionally called:
function Component({ showExtra }) {
  const [a, setA] = useState(0)         // position 0 ✓

  if (showExtra) {
    const [b, setB] = useState('')      // position 1 only sometimes!
  }

  const [c, setC] = useState(false)
  // When showExtra=true:  c reads position 2 (correct)
  // When showExtra=false: c reads position 1 (wrong — reads b's data!)
}
```

### Rule 2: Only Call Hooks Inside React Functions

Hooks require an active Fiber context — a React component or custom hook.
Calling them in regular functions, event listeners, or async callbacks
outside React's render cycle will fail.

```jsx
// ✅ Inside component:
function TaskCard() { const [x] = useState() }

// ✅ Inside custom hook:
function useMyHook() { const [x] = useState() }

// ❌ Inside regular function — no Fiber context:
function helper() { const [x] = useState() }   // Error!

// ❌ Inside class — not a function component:
class MyClass { method() { const [x] = useState() } }  // Error!
```

---

## 6. useState Syntax — Complete Reference

```jsx
// Basic syntax:
const [value, setValue] = useState(initialValue)

// The destructuring gives us two things:
//   value    — the current state (read-only inside this render)
//   setValue — the setter function (call to trigger state update + re-render)

// ── Initial values ───────────────────────────────────────────────────────────

const [count,    setCount]    = useState(0)           // number
const [name,     setName]     = useState('')           // string
const [isOpen,   setIsOpen]   = useState(false)        // boolean
const [tasks,    setTasks]    = useState([])           // array
const [user,     setUser]     = useState(null)         // null (not loaded yet)
const [settings, setSettings] = useState({            // object
  theme: 'dark',
  language: 'en'
})

// ── Lazy initialisation (expensive computation — only runs once) ─────────────

const [data, setData] = useState(() => {
  const stored = localStorage.getItem('tasks')
  return stored ? JSON.parse(stored) : []
})

// ── Setting state ────────────────────────────────────────────────────────────

// Direct value:
setCount(5)
setName('Shrikant')
setIsOpen(true)

// Functional update (when new value depends on previous):
setCount(prev => prev + 1)
setTasks(prev => [...prev, newTask])
setTasks(prev => prev.filter(t => t.id !== id))

// ── Reading state ────────────────────────────────────────────────────────────

// 'count', 'name', etc. are the current values — read them directly in JSX:
return <p>Count: {count}</p>
```

---

## 7. State Updates Are Asynchronous and Batched

### Asynchronous — State Doesn't Update Immediately

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    console.log(count)    // logs 0 — NOT 1!
    // Why? setCount schedules a re-render for LATER.
    // The current render's 'count' variable is still 0.
    // The new value will be available in the NEXT render.
  }
}
```

> 🔑 **Key mental model**: Think of each render as a **snapshot**. When the
> component renders, `count` is a fixed value for that entire render — like
> a photograph. Calling `setCount` doesn't change the photo; it schedules
> a new photo to be taken. The new photo (next render) will show the updated value.

### Batching — Multiple setState Calls Are Merged

React 18 batches ALL state updates automatically — even those in async callbacks:

```jsx
function handleClick() {
  setCount(c => c + 1)    // \
  setName('Shrikant')     //  } React batches these into ONE re-render
  setIsOpen(true)         // /
  // Without batching: 3 re-renders
  // With batching (React 18): 1 re-render
}
```

**Why batching?** Performance. Batching avoids redundant re-renders when
multiple state updates are logically part of one action.

---

## 8. The Functional Update Pattern

When new state depends on previous state, always use the functional update form:

```jsx
// ❌ Dangerous — stale closure:
setCount(count + 1)
setCount(count + 1)
setCount(count + 1)
// All three read 'count' = 0 from the current render's snapshot
// Result: count → 1 (not 3!)

// ✅ Safe — functional update uses the latest queued value:
setCount(prev => prev + 1)  // prev = 0, enqueues: count → 1
setCount(prev => prev + 1)  // prev = 1, enqueues: count → 2
setCount(prev => prev + 1)  // prev = 2, enqueues: count → 3
// Result: count → 3 (correct!)
```

### When to ALWAYS Use Functional Updates

1. When the new value depends on the previous value
2. When the update happens inside `setTimeout`, `setInterval`, or async functions
3. When multiple updates happen in the same event handler

```jsx
// COMMON PATTERN — toggle:
setIsOpen(prev => !prev)   // ✅ always safe

// COMMON PATTERN — add to array:
setTasks(prev => [...prev, newTask])  // ✅

// COMMON PATTERN — remove from array:
setTasks(prev => prev.filter(t => t.id !== id))  // ✅

// COMMON PATTERN — update one item:
setTasks(prev => prev.map(t =>
  t.id === id ? { ...t, status: newStatus } : t
))  // ✅
```

---

## 9. Immutability — The Cardinal Rule for Objects and Arrays

React uses **shallow reference comparison** (`===`) to detect state changes.
Mutating existing objects/arrays does not change their reference → React sees
no change → no re-render.

```
Old reference: tasks → [obj1, obj2, obj3]  (memory address: 0x1234)
Mutated:       tasks.push(obj4)
New reference: tasks → [obj1, obj2, obj3, obj4] (SAME memory address: 0x1234)
                                                  React: "Nothing changed" ← BUG
```

### The Immutable Patterns (memorise these)

```jsx
// ── Arrays ───────────────────────────────────────────────────────────────────

// Add item:
setTasks(prev => [...prev, newItem])
setTasks(prev => [newItem, ...prev])   // add to front

// Remove item:
setTasks(prev => prev.filter(t => t.id !== id))

// Update one item:
setTasks(prev => prev.map(t =>
  t.id === id ? { ...t, status: 'done' } : t
))

// Replace entire array:
setTasks([...newTasksArray])  // or just setTasks(newTasksArray) if it's already new

// ── Objects ──────────────────────────────────────────────────────────────────

// Update one property:
setUser(prev => ({ ...prev, name: 'New Name' }))
//               ↑ spread existing, then override specific key

// Update nested property:
setSettings(prev => ({
  ...prev,
  notifications: {
    ...prev.notifications,   // spread nested object too
    email: true
  }
}))

// ── What NOT to do ───────────────────────────────────────────────────────────

// ❌ Mutating array:
tasks.push(newTask)             // same reference → no re-render
tasks.splice(0, 1)             // same reference → no re-render
tasks[0].status = 'done'       // mutates nested object → no re-render

// ❌ Mutating object:
user.name = 'New Name'         // same reference → no re-render
```

---

## 10. Derived State — What NOT to Put in useState

**Derived state** is any value that can be computed from existing state.
It should **never** be put in a separate `useState`.

```jsx
// ❌ WRONG — redundant state:
const [tasks, setTasks] = useState([])
const [taskCount, setTaskCount] = useState(0)  // ← This is derived from tasks!

// Every time you add/remove a task, you must update BOTH:
function addTask(task) {
  setTasks(prev => [...prev, task])
  setTaskCount(prev => prev + 1)    // easy to forget → bugs!
}

// ✅ CORRECT — derive during render:
const [tasks, setTasks] = useState([])
const taskCount = tasks.length    // computed from state — always in sync
// No synchronisation needed — automatically correct after every render.
```

### The Test: Is This Value Derivable?

Ask these questions:
- Can this value be computed from props or existing state?
- Would this value always be in sync with existing state?

If YES to either → don't put it in `useState`.

```jsx
// Common derived values in our project:
const stats = {
  total:      tasks.length,                              // derived
  done:       tasks.filter(t => t.status === 'done').length,  // derived
  inProgress: tasks.filter(t => t.status === 'in-progress').length, // derived
}

const visibleTasks = activeFilter === 'all'
  ? tasks
  : tasks.filter(t => t.status === activeFilter)        // derived
```

All of these are computed fresh on every render. They are always correct because
they are always based on the latest state. If they were in `useState`, you'd need
to remember to update them every time `tasks` changes.

---

## 11. Lifting State Up

When two or more components need to share or react to the same state, the state
must be **lifted** to their closest common ancestor.

### Pattern

```
Before lifting (state trapped in child — can't be shared):
App
├── FilterBar (has filter state — can't share it with TaskList)
└── TaskList  (needs filter state — can't access it)

After lifting (state in common ancestor — shared via props):
App (filter state lives here)
├── FilterBar  (receives activeFilter + onFilterChange as props)
└── TaskList   (receives activeFilter as prop to filter its list)
```

### Step-by-Step Process

1. **Identify** which components need the same state
2. **Find** their closest common ancestor
3. **Move** the `useState` to that ancestor
4. **Pass** the state value down as a prop to consumers
5. **Pass** the setter (or a callback wrapping it) down as a prop to updaters

```jsx
// After lifting — App owns the filter:
function App() {
  const [activeFilter, setActiveFilter] = useState('all')  // ← lifted here

  return (
    <>
      <FilterBar
        activeFilter={activeFilter}        // pass state down
        onFilterChange={setActiveFilter}   // pass setter down
      />
      <TaskList
        tasks={tasks}
        activeFilter={activeFilter}        // pass state down
      />
    </>
  )
}
```

### When Is Lifting the Wrong Solution?

When the "common ancestor" is very far up the tree and lifting causes prop
drilling through many unrelated components. In those cases, use **Context API**
(Phase 6) or a state manager (Phase 9).

---

## 12. Local State vs Shared State

A key design decision every React developer must make:

| Type | Definition | Where It Lives | Example |
|---|---|---|---|
| **Local State** | Used by one component only | Inside that component | Form input values, tooltip open/close, dropdown expanded |
| **Shared State** | Used by multiple components | Lifted to common ancestor | Task list, active filter, current user |
| **Global State** | Used throughout the app | Context / state manager | Auth status, theme, language |

**Rule of thumb**: Start local. Lift only when another component actually needs it.
Over-lifting state causes unnecessary re-renders throughout the tree.

```jsx
// ✅ Local state — belongs in AddTaskForm:
function AddTaskForm({ onAddTask }) {
  const [title, setTitle] = useState('')        // only used here
  const [description, setDescription] = useState('')  // only used here
  // Once submitted, the result goes UP via onAddTask callback
}

// ✅ Shared state — belongs in App:
function App() {
  const [tasks, setTasks] = useState([])        // used by StatsBar, TaskList, etc.
  const [activeFilter, setActiveFilter] = useState('all')  // used by FilterBar + TaskList
}
```

---

## 13. Event Handling in React

React uses **synthetic events** — a cross-browser wrapper around native browser events.

```jsx
// HTML (string handler — don't use):
<button onclick="handleClick()">Click</button>

// React (function reference — use this):
<button onClick={handleClick}>Click</button>
//       ↑ camelCase      ↑ function reference, not a call

// Inline arrow function (fine for simple handlers):
<button onClick={() => setCount(count + 1)}>Click</button>

// With event object:
<input onChange={e => setName(e.target.value)} />
//              ↑ e is the SyntheticEvent

// Preventing default browser behaviour (essential for forms):
function handleSubmit(e) {
  e.preventDefault()   // stop page reload
  // ... handle form data
}
<form onSubmit={handleSubmit}>
```

### Common React Event Handlers

| Event | Handler | Fires When |
|---|---|---|
| Click | `onClick` | Element is clicked |
| Change | `onChange` | Input value changes |
| Submit | `onSubmit` | Form is submitted |
| Key press | `onKeyDown` / `onKeyUp` | Key pressed/released |
| Focus | `onFocus` / `onBlur` | Element gains/loses focus |
| Mouse | `onMouseEnter` / `onMouseLeave` | Mouse enters/leaves element |

### Event Delegation — React's Optimisation

React does not attach event listeners to individual DOM elements. It attaches
**one listener per event type at the root**. When any element fires a click,
the single root listener receives it and dispatches to the correct handler.

This is why React's event model is efficient — no matter how many buttons you
have, there is only one `click` listener in the DOM.

---

## 14. Controlled Components (Forms)

A **controlled component** is a form input whose value is driven by React state.

```
Uncontrolled (DOM owns the value):
  User types → DOM updates input internally → React doesn't know

Controlled (React owns the value):
  User types → onChange fires → setTitle(e.target.value)
             → React re-renders → input value={title} reflects new state
```

```jsx
// Controlled input — state drives the display value:
function AddTaskForm() {
  const [title, setTitle] = useState('')

  return (
    <input
      value={title}                      // React controls the displayed value
      onChange={e => setTitle(e.target.value)}  // React updates on every keystroke
    />
  )
}
```

**Why controlled inputs?**
- React is always the single source of truth for the value
- You can validate, transform, or limit input in real time
- You can programmatically reset or set the value
- Easy to test — just check the state value

We cover forms in depth in Phase 5 (Forms and Controlled Components) and
Phase 11 (React Hook Form).

---

## 15. Important Terminology

| Term | Definition |
|---|---|
| **State** | A component's internal, mutable data that persists across renders and triggers re-renders when changed. |
| **useState** | A React hook that adds state to a function component. Returns `[value, setter]`. |
| **Hook** | A function that starts with `use` and can only be called inside React function components or custom hooks. |
| **Setter function** | The second element returned by `useState`. Calling it updates state and schedules a re-render. |
| **Re-render** | React calling the component function again to produce new JSX after state or props change. |
| **Snapshot** | Each render captures a frozen view of state values. Setters don't change the current snapshot; they create a new one. |
| **Batching** | React merging multiple setState calls into a single re-render for performance. |
| **Functional update** | Passing a function to the setter: `setState(prev => newValue)`. Guarantees access to the latest state. |
| **Immutability** | Never mutating state objects/arrays directly. Always creating new references. |
| **Lifting state up** | Moving state to the closest common ancestor so it can be shared by multiple children via props. |
| **Derived state** | A value computed from existing state. Should NOT be a separate useState. |
| **Controlled component** | A form input whose value is controlled by React state via `value` + `onChange`. |
| **Local state** | State relevant to only one component — declared inside that component. |
| **Shared state** | State used by multiple components — lifted to their common ancestor. |
| **Lazy initialisation** | Passing a function to `useState(() => value)` so the initial value is computed only once. |

---

## 16. Best Practices

1. **Use functional updates when new state depends on previous state:**
   ```jsx
   setTasks(prev => [...prev, newTask])   // ✅ always safe
   ```

2. **Never mutate state — always return a new reference:**
   ```jsx
   setTasks(prev => prev.map(t => t.id === id ? {...t, status} : t))  // ✅
   ```

3. **Don't create derived state — compute it during render:**
   ```jsx
   const doneCount = tasks.filter(t => t.status === 'done').length  // ✅
   ```

4. **Group related state into an object:**
   ```jsx
   // Instead of three separate useState calls for a form:
   const [form, setForm] = useState({ title: '', desc: '', priority: 'medium' })
   setForm(prev => ({ ...prev, title: 'New Title' }))  // update one field
   ```

5. **Lift state to the lowest possible ancestor** — not higher than needed.

6. **Use lazy initialisation for expensive initial values:**
   ```jsx
   const [data, setData] = useState(() => JSON.parse(localStorage.getItem('data') || '[]'))
   ```

7. **Keep state minimal** — store only what you can't derive. The less state,
   the fewer synchronisation bugs.

8. **Name state variables clearly:**
   ```jsx
   const [isMenuOpen, setIsMenuOpen] = useState(false)  // ✅ clear
   const [x, setX] = useState(false)                     // ❌ unclear
   ```

---

## 17. Common Mistakes

| Mistake | What Goes Wrong | Correct Pattern |
|---|---|---|
| Reading state immediately after setting it | State hasn't updated yet — still shows old value | Use the new value in the same handler, or use functional update |
| Mutating state array/object directly | Same reference — React detects no change — no re-render | Create new array/object with spread or map/filter |
| Using state for derived values | State gets out of sync, causes bugs | Compute during render |
| Not using functional update when depending on previous state | Stale closure — gets wrong value | `setState(prev => ...)` |
| Calling `useState` inside a condition or loop | Breaks hook order — linked list corrupted | Always at top level |
| Storing the entire props object in state | Breaks sync when props change | Derive from props, or use useEffect to sync (carefully) |
| Forgetting `e.preventDefault()` in form submit | Page reloads, losing all state | Always call in form's onSubmit handler |
| Creating state for every tiny value | Over-complicated component, performance issues | Group related state, derive what you can |

---

## 18. Performance Considerations

### Re-render Cascade

When `App`'s state changes, `App` re-renders, which re-renders ALL its
children — even those that don't use the changed state.

```
setTasks([...])  →  App re-renders
                     ↓ all children re-render:
                     Header, StatsBar, AddTaskForm, FilterBar, TaskCard×6
```

For our app this is fine. For large apps:
- **`React.memo`**: Wraps a component; skips re-render if props are shallowly equal (Phase 9)
- **`useCallback`**: Stabilises callback function references so `React.memo` works (Phase 7)
- **`useMemo`**: Memoises expensive derived calculations (Phase 7)

### State Colocation

Keep state as close to where it's used as possible:

```jsx
// ❌ Storing AddTaskForm's input values in App:
// Every keystroke re-renders App + ALL children (Header, TaskCard×6, etc.)

// ✅ Storing AddTaskForm's input values locally in AddTaskForm:
// Every keystroke only re-renders AddTaskForm — isolated, efficient
```

This is one of the most impactful React performance techniques.

---

## 19. Project Implementation Summary

### What We Built in Phase 3

**New files created:**
- `src/components/StatsBar.jsx` — displays live task counts (presentational)
- `src/components/FilterBar.jsx` — filter buttons with lifted state
- `src/components/AddTaskForm.jsx` — controlled form with local state

**Files updated:**
- `src/components/TaskCard.jsx` — delete button, status cycle, callback props
- `src/App.jsx` — owns tasks state + filter state, handlers, derived values

### The Interaction Flow Implemented

```
User adds a task:
  AddTaskForm (local state: title, desc, priority)
    → onSubmit → handleAddTask(newTaskData) in App
    → setTasks(prev => [...prev, newTask])
    → App re-renders → StatsBar counts update → new TaskCard appears

User clicks status badge:
  TaskCard → handleStatusClick → onStatusChange(id, nextStatus)
    → handleStatusChange in App
    → setTasks(prev => prev.map(t => t.id === id ? {...t, status} : t))
    → App re-renders → that TaskCard shows new badge → StatsBar counts update

User clicks delete:
  TaskCard → handleDelete → onDelete(id)
    → handleDeleteTask in App
    → setTasks(prev => prev.filter(t => t.id !== id))
    → App re-renders → that TaskCard gone → StatsBar count decreases

User clicks filter:
  FilterBar → onFilterChange(value) → setActiveFilter(value) in App
    → App re-renders → visibleTasks recomputed → only matching cards shown
```

### Key Code Patterns from the Project

```jsx
// 1. State declaration
const [tasks, setTasks] = useState(INITIAL_TASKS)
const [activeFilter, setActiveFilter] = useState('all')

// 2. Derived state (NOT useState)
const stats = {
  total: tasks.length,
  done: tasks.filter(t => t.status === 'done').length,
}
const visibleTasks = activeFilter === 'all'
  ? tasks
  : tasks.filter(t => t.status === activeFilter)

// 3. Functional update — add
setTasks(prev => [...prev, newTask])

// 4. Functional update — delete
setTasks(prev => prev.filter(t => t.id !== id))

// 5. Functional update — update one item
setTasks(prev => prev.map(t =>
  t.id === id ? { ...t, status: newStatus } : t
))

// 6. Passing setter directly as callback prop
<FilterBar onFilterChange={setActiveFilter} />

// 7. Controlled input
<input value={title} onChange={e => setTitle(e.target.value)} />

// 8. Conditional rendering (empty state)
{tasks.length === 0 ? <EmptyState /> : tasks.map(t => <TaskCard {...t} />)}
```

---

## 20. Frequently Asked Interview Questions

**Q1. What is state in React?**
> State is a component's internal memory — data owned by the component that
> can change over time. When state changes via the setter function, React
> schedules a re-render, producing a new snapshot of the UI. State persists
> between renders, unlike local variables which reset on every function call.

**Q2. What is the difference between props and state?**
> Props are external data passed from a parent — read-only inside the component.
> State is internal data managed by the component — mutable via the setter
> function. Props change when the parent re-renders with new values. State
> changes when the setter is called. Both trigger re-renders.

**Q3. Why can't you use a regular variable instead of state?**
> Two reasons: (1) Updating a variable doesn't tell React to re-render — the
> screen never updates. (2) Component functions run from scratch on every render,
> so any local variable would reset to its initial value on each render. State
> solves both: the setter triggers re-renders, and the value is stored in the
> Fiber node outside the function.

**Q4. What does the setter function return from useState?**
> Nothing — it returns `undefined`. Its purpose is to update the state value
> stored in the Fiber node and schedule a re-render. The new state value is
> NOT available immediately after calling the setter — it's available in the
> next render.

**Q5. What is the functional update pattern and when should you use it?**
> Instead of `setState(newValue)`, you write `setState(prev => newValue)`.
> React passes the latest queued state as `prev`. Use it whenever the new
> value depends on the previous value, especially in async callbacks or when
> multiple updates happen in the same event handler.

**Q6. Why must you never mutate state directly?**
> React uses shallow reference comparison (`===`) to detect changes. Mutating
> an object or array doesn't change its reference — React sees the old and
> new reference as identical and skips the re-render. Always create a new
> reference using spread, map, or filter.

**Q7. What is "lifting state up"?**
> Moving state from a child component to the closest common ancestor of all
> components that need it. The ancestor passes the state value down as props
> and the setter (or a callback wrapping it) down as a callback prop. This
> enables sibling components to share state without direct communication.

**Q8. What is derived state and why shouldn't you duplicate it?**
> Derived state is any value computable from existing state or props. Storing
> it in a separate useState creates synchronisation burden — you must remember
> to update both pieces of state together. Bugs appear when one updates and
> the other doesn't. Always compute derived values during render instead.

**Q9. What is batching in React 18?**
> React 18 automatically batches all state updates — even in async callbacks,
> setTimeout, and promises — into a single re-render. Before React 18, only
> updates in React event handlers were batched. Batching reduces unnecessary
> re-renders when multiple state updates are part of one logical action.

**Q10. What is lazy initialisation in useState?**
> Passing a function instead of a value: `useState(() => expensiveComputation())`.
> React calls the function only on the first render to get the initial value.
> Without lazy init, `expensiveComputation()` would run on every render (wasted work),
> but its result would only be used on the first.

---

## 21. Tricky Interview Questions

**Q1. You call `setCount(count + 1)` three times in a row. What is the final count?**
> Count increases by 1 (not 3). Each call reads `count` from the current
> render's snapshot — a fixed value. All three calls are effectively
> `setCount(0 + 1)`. React batches them and applies the last value: 1.
> The fix: `setCount(prev => prev + 1)` three times — this correctly produces 3.

**Q2. Consider this code — what does the alert show?**
```jsx
function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    setTimeout(() => alert(count), 3000)
  }
  return <button onClick={handleClick}>Click</button>
}
```
> The alert shows `0` — the value of `count` at the time `handleClick` ran.
> The `setTimeout` callback closes over the snapshot of `count` from that render.
> Even though 3 seconds pass and the component may have re-rendered, the
> closure holds the old value. This is the "stale closure" problem.
> To see the latest value in async code, use a ref (`useRef`) — covered in Phase 7.

**Q3. If you call `setState` with the exact same value as current state, does React re-render?**
> No — React uses `Object.is()` comparison. If the new value is identical to
> the current value, React bails out and does NOT schedule a re-render.
> For primitives (same number, same string), no re-render.
> For objects/arrays, the comparison is by reference — even if contents are
> identical, a new reference triggers a re-render.

**Q4. Can you call `useState` in a callback function inside a component?**
```jsx
function App() {
  const [tasks, setTasks] = useState([])

  tasks.forEach(task => {
    const [isSelected, setIsSelected] = useState(false)  // ← Is this legal?
  })
}
```
> No — this violates the Rules of Hooks. The number of hook calls varies based
> on the array length. React tracks hooks by position, so a variable number
> of calls corrupts the linked list. Each task's selection state should either
> be stored in the task object itself or managed by the TaskCard component.

**Q5. What is the difference between `useState` and `useReducer`?**
> Both manage state, but for different complexity levels.
> `useState` is ideal for simple, independent values.
> `useReducer` is better when: state transitions follow specific patterns,
> next state depends on previous in complex ways, or multiple related state
> values always change together. `useReducer(reducer, initialState)` returns
> `[state, dispatch]` — you dispatch action objects and the reducer function
> computes the new state. It is essentially `useState` implemented with a
> reducer pattern (like Redux).

---

## 22. Revision Cheat Sheet

```
STATE AND useState — QUICK REFERENCE
══════════════════════════════════════════════════════════

WHAT IS STATE?
  • Component's internal memory
  • Persists between renders (stored in Fiber node)
  • Changing it triggers a re-render
  • Regular variables can't do either of these things

SYNTAX
  const [value, setValue] = useState(initialValue)
  • initialValue: used ONLY on first render
  • value: current state (read-only in this render snapshot)
  • setValue: call to update + schedule re-render

SETTING STATE
  setValue(newValue)               // direct value
  setValue(prev => prev + 1)       // functional update (preferred when depending on prev)

RULES OF HOOKS
  1. Only call at top level (not in if/for/callbacks)
  2. Only call inside React functions (component or custom hook)
  Both rules exist because React tracks hooks by ORDER in a linked list.

STATE UPDATES
  • Are ASYNCHRONOUS — new value not available until next render
  • Are BATCHED in React 18 — multiple calls → one re-render
  • Use functional update to avoid stale closures

IMMUTABILITY (arrays/objects)
  ✅ Add:    setState(prev => [...prev, item])
  ✅ Remove: setState(prev => prev.filter(t => t.id !== id))
  ✅ Update: setState(prev => prev.map(t => t.id === id ? {...t, key: val} : t))
  ❌ NEVER:  state.push() / state.key = value — same reference → no re-render

DERIVED STATE
  • If computable from state/props → do NOT put in useState
  • Compute during render → always in sync, no bug risk
  const total = tasks.length   // ✅ derived

LIFTING STATE UP
  • When 2+ components need same state → move to common ancestor
  • Pass value down as prop, pass setter down as callback prop

LOCAL vs SHARED
  • Local: form fields, tooltip, dropdown → stays in component
  • Shared: task list, active filter → lift to common ancestor
  • Global: auth, theme → Context API or state manager

PROPS vs STATE
  • Props:  from parent, read-only, external control
  • State:  internal, mutable via setter, self-managed

══════════════════════════════════════════════════════════
```

---

## 23. Key Takeaways

1. **State is a component's persistent memory** — stored in the Fiber node,
   outside the function, so it survives between render calls.

2. **`useState` returns two things**: the current value (snapshot) and a setter
   function (closure over the Fiber node).

3. **Closures are what make hooks work** — the setter function captures a
   reference to the Fiber node and uses it to update state later.

4. **The Rules of Hooks exist because** React tracks hooks by their position
   in a linked list — conditional or looping hooks break the list order.

5. **State updates are asynchronous** — the new value is in the next render,
   not available immediately after calling the setter.

6. **Use functional updates** (`setState(prev => ...)`) whenever new state
   depends on previous state — avoids stale closure bugs.

7. **Immutability is non-negotiable for objects and arrays** — React uses
   reference comparison. Mutation is invisible to React.

8. **Never store derived values in state** — compute them during render.
   They are always correct and require zero synchronisation.

9. **Lift state to the lowest common ancestor** — no higher. Over-lifting
   causes unnecessary re-renders and prop drilling.

10. **Local form state belongs in the form component** — not in the parent.
    Send the result up via a callback prop when submitted.

---

## 24. Understanding Checklist

Before moving to Phase 4, verify you can confidently answer all of these:

- [ ] I can explain why a regular variable doesn't work as state (two reasons)
- [ ] I can explain where state is actually stored (Fiber node linked list)
- [ ] I can explain why the Rules of Hooks exist (linked list position tracking)
- [ ] I can write `useState` with a primitive, array, and object initial value
- [ ] I can explain the difference between `setState(value)` and `setState(prev => value)`
- [ ] I can explain why state updates appear "asynchronous" (snapshot model)
- [ ] I can perform all immutable array operations: add, remove, update item
- [ ] I can identify when a value is derived state and should NOT be useState
- [ ] I can explain "lifting state up" and perform it in code
- [ ] I can explain the difference between local and shared state
- [ ] I can write a controlled input (value + onChange)
- [ ] I have the dashboard running with: add task, delete task, status cycling, and filter all working
- [ ] I can trace the full interaction: "user clicks status badge → what happens in each file?"

---

*Phase 03 Notes — Complete*
*Next: Phase 04 — Component Lifecycle and useEffect*
