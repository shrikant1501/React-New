# Phase 07 — Context API
### Eliminating Prop Drilling and Sharing State Globally

---

> 📌 **How to use this document**
> Read top to bottom the first time. §21 (Cheat Sheet) for quick revision.
> §19 and §20 for interviews — Context is asked heavily at mid-level interviews,
> especially the performance implications and the Provider pattern.

---

## Table of Contents

1. [Topic Overview](#1-topic-overview)
2. [The Prop Drilling Problem — Precisely Defined](#2-the-prop-drilling-problem--precisely-defined)
3. [How Context Works Internally](#3-how-context-works-internally)
4. [The Three Parts of Context](#4-the-three-parts-of-context)
5. [Context API — Complete Syntax](#5-context-api--complete-syntax)
6. [The Context Value Reference Problem](#6-the-context-value-reference-problem)
7. [Context Architecture Patterns](#7-context-architecture-patterns)
8. [The Custom Context Hook Pattern](#8-the-custom-context-hook-pattern)
9. [The Split Context Pattern](#9-the-split-context-pattern)
10. [Context vs Props vs External State Management](#10-context-vs-props-vs-external-state-management)
11. [The Provider Pattern — Co-locating State with Context](#11-the-provider-pattern--co-locating-state-with-context)
12. [Performance: Context and React.memo](#12-performance-context-and-reactmemo)
13. [Important Terminology](#13-important-terminology)
14. [Best Practices](#14-best-practices)
15. [Common Mistakes](#15-common-mistakes)
16. [Advantages](#16-advantages)
17. [Limitations](#17-limitations)
18. [Project Implementation Summary](#18-project-implementation-summary)
19. [Frequently Asked Interview Questions](#19-frequently-asked-interview-questions)
20. [Tricky Interview Questions](#20-tricky-interview-questions)
21. [Revision Cheat Sheet](#21-revision-cheat-sheet)
22. [Key Takeaways](#22-key-takeaways)
23. [Understanding Checklist](#23-understanding-checklist)

---

## 1. Topic Overview

The **Context API** is React's built-in mechanism for making data available to
any component in the tree — without manually passing it through every level
as props (prop drilling).

It consists of three pieces:
1. `createContext()` — creates a context object
2. `Context.Provider` — broadcasts a value to all descendants
3. `useContext(Context)` — reads the value in any descendant component

Context is the appropriate tool for **genuinely global data**: things many
components need regardless of where they are in the tree — user authentication,
theme, language, application-wide state.

---

## 2. The Prop Drilling Problem — Precisely Defined

Prop drilling is passing props through **intermediate components that don't
use them** — components that are merely conduits carrying data for a deeper
descendant.

```
Without Context:
App (owns tasks, filter, handlers)
  └── Layout         (doesn't use tasks — just passes them down)
        └── Sidebar  (doesn't use tasks — just passes them down)
              └── TaskStats  ← ONLY this component needs tasks

App must give tasks to Layout, Layout to Sidebar, Sidebar to TaskStats.
Layout and Sidebar are polluted with data they don't care about.
If the tasks data shape changes, ALL intermediate components need updating.

With Context:
App → TaskProvider (broadcasts tasks)
  └── Layout (doesn't subscribe to tasks at all)
        └── Sidebar (doesn't subscribe to tasks at all)
              └── TaskStats → useContext(TaskContext) → gets tasks directly
```

### When Drilling Is Actually Fine

```
1–2 levels: Props are the RIGHT solution — simpler, more explicit
3–4 levels: Evaluate. Props may still be clearest.
5+ levels:  Context is usually justified
Many components need the same data: Context regardless of depth
```

**Key principle**: Don't reach for Context prematurely. Prop drilling at 2
levels is cleaner than Context — it's explicit, traceable, and has no
re-render subscription overhead.

---

## 3. How Context Works Internally

### The Context Stack in Fiber

React maintains a **context stack** during the Fiber tree traversal. When
rendering a Provider, React pushes its value onto the stack. When rendering
a Consumer (or `useContext` call), React reads from the top of the stack.

```
Fiber rendering traversal:
  App → pushes nothing
    ThemeProvider → pushes theme value onto ThemeContext stack
      TaskProvider → pushes task value onto TaskContext stack
        Header → useContext(TaskContext) → reads from TaskContext stack
        TaskList → useContext(TaskContext) → reads from TaskContext stack
```

### What Triggers a Re-render

When a Provider's `value` prop changes (determined by `Object.is()`):

1. React finds ALL Fiber nodes that have subscribed to this context
   (via `useContext`) anywhere in the subtree
2. Marks them all as needing to re-render
3. **Bypasses `React.memo`** — this is the critical performance implication

```javascript
// Simplified internal mechanism:
function updateContextProvider(fiber) {
  const newValue = fiber.pendingProps.value
  const oldValue = fiber.memoizedProps.value

  if (Object.is(oldValue, newValue)) return  // no change — skip

  // Propagate update to ALL consumers in the subtree
  propagateContextChange(fiber, context, newValue)
  // This marks every useContext(context) consumer as dirty
  // React.memo cannot stop this — it only guards against prop changes
}
```

---

## 4. The Three Parts of Context

### Part 1: `createContext(defaultValue)`

```jsx
const ThemeContext = createContext('dark')
//                              ↑ default value
// Used ONLY when a component reads the context WITHOUT a Provider above it.
// In practice: when the component is rendered outside the Provider (tests, etc.)
// Set to null for contexts that always require a Provider.
```

### Part 2: `Context.Provider`

```jsx
<ThemeContext.Provider value={currentTheme}>
  {children}
  {/* ALL descendants can read currentTheme via useContext(ThemeContext) */}
</ThemeContext.Provider>
```

- Multiple Providers of the same context can be nested
- `useContext` reads from the **nearest** Provider above it
- If `value` changes → ALL consumers re-render (regardless of memo)

### Part 3: `useContext(Context)`

```jsx
function ThemeToggle() {
  const theme = useContext(ThemeContext)
  // theme = 'dark' (or whatever the nearest Provider's value is)
  return <button>{theme === 'dark' ? '☀️' : '🌙'}</button>
}
```

- Must be called inside a React component or custom hook
- Re-renders the component whenever the Provider's value changes
- Returns the `defaultValue` from `createContext` if no Provider is found above

---

## 5. Context API — Complete Syntax

```jsx
import { createContext, useContext, useState, useMemo } from 'react'

// ── Step 1: Create ────────────────────────────────────────────────────────────
const UserContext = createContext(null)
// Always export if other files need to useContext directly (but prefer custom hook)

// ── Step 2: Provide ───────────────────────────────────────────────────────────
export function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  // IMPORTANT: memoize the value to prevent unnecessary consumer re-renders
  const value = useMemo(() => ({ user, setUser }), [user])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

// ── Step 3: Consume (via custom hook — production pattern) ────────────────────
export function useUser() {
  const context = useContext(UserContext)
  if (context === null) {
    throw new Error('useUser must be used within a <UserProvider>')
  }
  return context
}

// ── Usage in any component ────────────────────────────────────────────────────
function UserAvatar() {
  const { user } = useUser()   // no prop needed from parent
  return <img src={user.avatar} alt={user.name} />
}

// ── Wire up in main.jsx ───────────────────────────────────────────────────────
// <UserProvider>
//   <App />
// </UserProvider>
```

---

## 6. The Context Value Reference Problem

The most important performance concept for Context:

```jsx
// ❌ Problem — new object on every render of the Provider's parent:
function App() {
  const [user, setUser] = useState(null)
  return (
    // This creates a NEW object on every App render
    // → ALL UserContext consumers re-render on every App render
    <UserContext.Provider value={{ user, setUser }}>
      <AppContent />
    </UserContext.Provider>
  )
}

// ✅ Fix — useMemo stabilises the value object:
function App() {
  const [user, setUser] = useState(null)
  const value = useMemo(() => ({ user, setUser }), [user])
  // Same object reference when user hasn't changed
  // Consumers re-render ONLY when user changes
  return (
    <UserContext.Provider value={value}>
      <AppContent />
    </UserContext.Provider>
  )
}

// ✅ Even better: move Provider into its own component (TaskProvider pattern)
// The Provider component only re-renders when ITS OWN state changes
// Not when any ancestor re-renders
```

---

## 7. Context Architecture Patterns

### Pattern 1: Single Monolithic Context (Avoid for large apps)

```jsx
const AppContext = createContext(null)
// Everything in one context
// Every consumer re-renders when anything changes
// Simple but doesn't scale
```

### Pattern 2: Split Contexts by Change Frequency (Recommended)

```jsx
// Slow-changing — few re-renders for consumers:
const ThemeContext = createContext(null)   // changes on user action only
const UserContext  = createContext(null)   // changes on login/logout only

// Fast-changing — limit consumers:
const TaskStateContext    = createContext(null)  // changes on every task mutation
const TaskDispatchContext = createContext(null)  // NEVER changes (stable functions)
const FilterContext       = createContext(null)  // changes on filter click
```

### Pattern 3: State + Dispatch Split (Maximum optimisation)

```jsx
// State consumers re-render when data changes
const TaskStateContext = createContext(null)

// Dispatch consumers NEVER re-render (setters + useCallback functions are stable)
const TaskDispatchContext = createContext(null)

// A component that only adds tasks:
function AddButton() {
  const { addTask } = useContext(TaskDispatchContext) // never re-renders!
  return <button onClick={() => addTask(...)}>Add</button>
}

// A component that displays tasks:
function TaskList() {
  const { tasks } = useContext(TaskStateContext) // re-renders when tasks change
  return tasks.map(t => <TaskCard task={t} />)
}
```

---

## 8. The Custom Context Hook Pattern

The production standard. Always wrap `useContext` in a custom hook:

```jsx
// context/AuthContext.jsx

const AuthContext = createContext(null)  // keep private to this file

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // ...
  return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>
}

// The ONLY public API for consuming auth context:
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    // Clear, actionable error message — better than:
    // "Cannot read properties of null (reading 'user')"
    throw new Error('useAuth must be used within an <AuthProvider>. ' +
      'Ensure <AuthProvider> wraps the component that calls useAuth().')
  }
  return context
}
```

### Benefits of the Custom Hook Pattern

1. **Encapsulation**: `AuthContext` object stays private. Consumers don't import it.
2. **Error boundary**: Throws a clear message when used outside Provider.
3. **Single import**: Consumers import `useAuth`, not the context object.
4. **Extensibility**: Add selectors, transformations, or memoisation inside
   the hook without changing any consumer.

```jsx
// Extended custom hook with selector:
export function useTaskCount() {
  const { tasks } = useContext(TaskStateContext)
  return tasks.length  // derived value — component only re-renders when LENGTH changes?
  // Actually: still re-renders when tasks changes even if length is same.
  // True selector memoisation requires useSyncExternalStore or a state manager.
}
```

---

## 9. The Split Context Pattern

Implemented in our Task Dashboard:

```jsx
// Three contexts for task-related data:

// 1. TaskStateContext — provides: { tasks, stats, visibleTasks }
//    Re-renders consumers when: tasks change or visibleTasks change

// 2. TaskDispatchContext — provides: { addTask, deleteTask, updateTaskStatus, resetTasks }
//    Re-renders consumers when: these functions change (never — useCallback + stable setters)

// 3. FilterContext — provides: { activeFilter, setActiveFilter }
//    Re-renders consumers when: activeFilter changes

// AddTaskSection only subscribes to dispatch:
function AddTaskSection() {
  const { addTask } = useTaskDispatch()
  // NEVER re-renders due to task data changes — only gets actions
  return <AddTaskForm onAddTask={addTask} />
}

// StatsSection subscribes to state:
function StatsSection() {
  const { stats } = useTasks()
  // Re-renders when stats change (when task statuses change)
  return <StatsBar {...stats} />
}

// TaskListSection subscribes to all three:
function TaskListSection() {
  const { visibleTasks } = useTasks()
  const { deleteTask, updateTaskStatus } = useTaskDispatch()
  const { activeFilter, setActiveFilter } = useFilter()
  // Re-renders when: visibleTasks OR filter changes
  // Dispatch functions are stable — don't cause re-renders
  return (...)
}
```

---

## 10. Context vs Props vs External State Management

| Scenario | Best Tool | Why |
|---|---|---|
| 1–2 component levels | **Props** | Explicit, no overhead, easier to trace |
| Cross-cutting global data (theme, auth, language) | **Context** | Genuinely shared, rarely changes |
| Complex state with many transitions | **useReducer + Context** | Predictable state machine |
| Frequently-updating shared state | **Zustand or Jotai** | Better performance than Context for frequent changes |
| Server state (API data, caching) | **React Query / SWR** | Built for async, handles cache/invalidation |
| Cross-browser-tab state | **External store** | Context doesn't persist across tabs |

### The Selector Problem with Context

Context does not support selectors — you cannot subscribe to only a PART of
the context value. If ANY part changes, ALL consumers re-render.

```jsx
// Both of these re-render when EITHER tasks OR filter changes:
const { tasks } = useTasks()    // only needs tasks
const { stats } = useTasks()    // only needs stats

// This is why Zustand/Jotai are preferred for frequently-changing shared state:
// they support granular subscriptions
const tasks = useTaskStore(state => state.tasks)   // only re-renders when tasks changes
const stats  = useTaskStore(state => state.stats)  // only re-renders when stats changes
```

---

## 11. The Provider Pattern — Co-locating State with Context

Moving state into the Provider component (instead of a parent like App)
provides two architectural benefits:

**1. Separation of concerns**
```
Before: App.jsx — 200 lines mixing layout + state + handlers
After:
  context/TaskContext.jsx — 150 lines (state + handlers + context)
  App.jsx — 30 lines (pure layout)
```

**2. Isolation from parent re-renders**
```
Before: App re-renders → all state recalculated (even if unchanged)
After:  TaskProvider only re-renders when ITS state changes
        App re-renders → TaskProvider NOT re-rendered (it's in main.jsx)
        → Context consumers only re-render when context value changes
```

---

## 12. Performance: Context and React.memo

### The Critical Rule: React.memo Does NOT Protect Against Context Changes

```jsx
// Even with React.memo, if a component uses useContext:
const TaskCard = memo(function TaskCard({ title }) {
  const { theme } = useTheme()  // ← subscribed to ThemeContext
  return <div className={theme}>{title}</div>
})

// When theme changes:
// → React.memo's prop comparison: title unchanged → would normally SKIP
// → But ThemeContext changed → React OVERRIDES memo → TaskCard RE-RENDERS
```

This is intentional behaviour — context subscriptions always take priority
over memo's prop comparison.

### Solutions

1. **Split contexts by change frequency** — minimize what each consumer subscribes to
2. **useMemo the context value** — prevent unnecessary value changes
3. **Separate state from dispatch contexts** — dispatch-only consumers never re-render
4. **Extract the context-reading logic** into a wrapper component that passes
   only needed values as props to a memoised inner component

```jsx
// Wrapper reads context, memoised inner receives only primitives:
function TaskCardWrapper({ taskId }) {
  const { tasks } = useTasks()
  const task = tasks.find(t => t.id === taskId)
  return <TaskCardInner {...task} />  // TaskCardInner is memo'd, receives primitives
}
const TaskCardInner = memo(function TaskCardInner({ title, status }) { ... })
```

---

## 13. Important Terminology

| Term | Definition |
|---|---|
| **Context** | A mechanism to share data across the component tree without prop drilling. |
| **`createContext(defaultValue)`** | Creates a Context object. `defaultValue` used only when no Provider is above the consumer. |
| **Provider** | `<Context.Provider value={...}>` — broadcasts a value to all descendants. |
| **Consumer** | Any component that calls `useContext(Context)`. Subscribes to value changes. |
| **`useContext(Context)`** | Hook that reads the nearest Provider's value and subscribes to changes. |
| **Prop drilling** | Passing props through intermediate components that don't use them. |
| **Custom context hook** | A function (e.g., `useAuth()`) wrapping `useContext`, providing error checking and encapsulation. |
| **Provider pattern** | Extracting state + Provider into its own component (`AuthProvider`, `TaskProvider`). |
| **Split context** | Dividing one large context into multiple smaller ones to limit re-render scope. |
| **State/dispatch split** | Pattern of two contexts — one for state (changes often), one for setters/handlers (never changes). |
| **Context propagation** | How React walks the Fiber tree to find and update all consumers when context value changes. |
| **defaultValue** | The fallback value for `createContext()` — returned by `useContext` when no Provider exists above. |

---

## 14. Best Practices

1. **Always use a custom hook** — never expose the raw context object:
   ```jsx
   export function useAuth() {
     const ctx = useContext(AuthContext)
     if (!ctx) throw new Error('useAuth must be used within AuthProvider')
     return ctx
   }
   ```

2. **Always `useMemo` the context value** — prevents all consumers re-rendering on every Provider parent render:
   ```jsx
   const value = useMemo(() => ({ user, logout }), [user, logout])
   ```

3. **Co-locate state with its Provider** — move `useState` into the Provider component, not a grandparent.

4. **Split contexts by change frequency** — theme/user (rarely changes) separate from tasks (often changes).

5. **Separate state from dispatch** — components that only trigger actions should never re-render due to data changes.

6. **Place Providers as low as possible** — if only half the app needs auth, only wrap that half. Don't wrap everything at the root unless it's truly global.

7. **Use `useReducer` for complex state transitions** — `useReducer` + Context is a lightweight Redux alternative for complex state:
   ```jsx
   const [state, dispatch] = useReducer(taskReducer, initialState)
   // Provide state and dispatch separately
   ```

8. **Document what each context provides** — context is implicit; a comment listing the provided values helps teammates.

---

## 15. Common Mistakes

| Mistake | What Goes Wrong | Fix |
|---|---|---|
| No `useMemo` on context value | All consumers re-render whenever Provider's parent renders | Wrap value in `useMemo` |
| Everything in one context | Unrelated changes cause all consumers to re-render | Split into multiple contexts by concern |
| `React.memo` expected to block context updates | Context changes bypass memo — stale UI assumption | Accept that memo doesn't guard context; use split contexts instead |
| Using context for 1-2 levels of data | Over-engineering — context is more complex than props | Use props for shallow trees |
| Provider too high in the tree | Every app re-render can trigger context value recreation | Move Provider closer to where it's needed |
| Accessing context outside Provider (null error) | Confusing crash without clear message | Use custom hook with null check and helpful error |
| Mutable context values (direct mutation) | Consumers don't re-render on change | Always use `setState` to update; never mutate context object |
| Forgetting `useCallback` on dispatch functions | Functions change reference → dispatch context changes → all dispatch consumers re-render | `useCallback` all handlers in Provider |

---

## 16. Advantages

1. **Eliminates prop drilling** — deeply nested components access data without polluting intermediaries
2. **Single source of truth** — data lives in one place, consumed anywhere
3. **Clean component APIs** — components that need global data don't need it passed as props
4. **Co-location** — Provider owns and manages its own state (separation of concerns)
5. **Testability** — wrap component in Provider in tests to control context values
6. **Built-in** — no external library needed for common use cases (theme, auth, language)

---

## 17. Limitations

1. **No selectors** — subscribing to part of a context value isn't possible; all or nothing
2. **Can cause over-rendering** — one context value change re-renders all consumers
3. **Bypasses React.memo** — memo doesn't protect against context updates
4. **Not for frequent updates** — context isn't optimised for high-frequency state changes (use Zustand/Jotai instead)
5. **Implicit dependencies** — components silently depend on Provider being in the tree
6. **Context hell** — deeply nested Providers become hard to read (common in large apps)

---

## 18. Project Implementation Summary

### Architecture After Phase 7

**New files:**
```
src/context/
├── TaskContext.jsx     — TaskProvider + 3 split contexts + 3 custom hooks
└── ThemeContext.jsx    — ThemeProvider + useTheme custom hook

src/components/
├── ThemeToggle.jsx     — reads ThemeContext, zero props from parent
├── TaskListSection.jsx — reads 3 contexts, zero props
├── StatsSection.jsx    — reads TaskStateContext, zero props
├── AddTaskSection.jsx  — reads TaskDispatchContext only, zero props
└── ResetSection.jsx    — reads TaskDispatchContext only, zero props
```

**Before vs After — App.jsx transformation:**
```
Phase 6 App.jsx: ~200 lines
  - useState, useMemo, useCallback
  - INITIAL_TASKS array
  - stats computation
  - visibleTasks computation
  - 5 event handler functions
  - Props passed to 6+ children

Phase 7 App.jsx: ~40 lines
  - 1 useState (lifecycle demo toggle — truly local)
  - No data, no handlers, no props to children
  - Pure layout structure
```

### The Context Subscription Map

```
Component            → Contexts Subscribed         → Re-renders When
───────────────────────────────────────────────────────────────────────
Header               → TaskStateContext             → tasks change
ThemeToggle          → ThemeContext                 → theme changes
StatsSection         → TaskStateContext             → tasks change
AddTaskSection       → TaskDispatchContext          → NEVER (stable)
ResetSection         → TaskDispatchContext          → NEVER (stable)
TaskListSection      → TaskState + Dispatch + Filter → tasks or filter change
FilterBar            → (props from TaskListSection) → filter changes
TaskCard             → (props from TaskListSection) → per-task data changes
```

### Key Code Patterns

```jsx
// 1. createContext with null default (requires custom hook check):
const TaskStateContext = createContext(null)

// 2. useMemo on context value (prevents cascade on Provider parent render):
const stateValue = useMemo(() => ({
  tasks, stats, visibleTasks
}), [tasks, stats, visibleTasks])

// 3. Provider component (state co-located):
export function TaskProvider({ children }) {
  const [tasks, setTasks] = useLocalStorage('tasks', INITIAL_TASKS)
  // ...state and handlers...
  return (
    <TaskStateContext.Provider value={stateValue}>
      <TaskDispatchContext.Provider value={dispatchValue}>
        {children}
      </TaskDispatchContext.Provider>
    </TaskStateContext.Provider>
  )
}

// 4. Custom hook with null guard:
export function useTasks() {
  const ctx = useContext(TaskStateContext)
  if (ctx === null) throw new Error('useTasks must be within <TaskProvider>')
  return ctx
}

// 5. Consumer — zero props from parent:
function StatsSection() {
  const { stats } = useTasks()
  return <StatsBar {...stats} />
}

// 6. Provider placement in main.jsx:
<ThemeProvider>
  <TaskProvider>
    <App />
  </TaskProvider>
</ThemeProvider>
```

---

## 19. Frequently Asked Interview Questions

**Q1. What is the Context API and what problem does it solve?**
> The Context API is React's built-in mechanism for sharing data across the
> component tree without passing it through every level as props (prop drilling).
> It consists of `createContext()`, a `Provider` component that broadcasts a
> value, and `useContext()` that reads it in any descendant. It's the right tool
> for genuinely global data: theme, authentication, language, or application-wide
> state used by many unrelated components.

**Q2. What is prop drilling and when should you solve it with Context?**
> Prop drilling is passing data through intermediate components that don't use it —
> they're just conduits. Context is justified when: 3+ levels of drilling occur,
> many unrelated components need the same data, or intermediate components are
> polluted with irrelevant props. For 1–2 levels, props are simpler and clearer.

**Q3. What is the `defaultValue` in `createContext(defaultValue)` used for?**
> It is the value returned by `useContext` when there is no matching Provider
> anywhere above the component in the tree. In practice this means: when the
> component is rendered outside the Provider (in isolation tests, Storybook, etc.).
> It is NOT used as the initial value for the Provider's value prop.

**Q4. Does `React.memo` protect against re-renders caused by context changes?**
> No. This is the most important Context performance implication. If a component
> calls `useContext`, it will re-render whenever the context value changes —
> regardless of whether it's wrapped in `React.memo`. Memo only guards against
> prop changes; context subscriptions bypass it entirely.

**Q5. How do you prevent Context from causing unnecessary re-renders?**
> Three strategies: (1) `useMemo` on the context value object so its reference
> only changes when the actual data changes. (2) Split one large context into
> multiple smaller contexts by change frequency. (3) Separate state context from
> dispatch context — dispatch functions are stable (via useCallback), so dispatch
> consumers never re-render due to state changes.

**Q6. What is the custom context hook pattern and why is it preferred?**
> Instead of exporting the raw context object, you export a custom hook (e.g.,
> `useAuth()`) that wraps `useContext`. Benefits: (1) Raw context stays private —
> less coupling. (2) Throws a helpful error if used outside the Provider.
> (3) Single import for consumers. (4) Logic or selectors can be added without
> changing consumer code.

**Q7. Where should Providers be placed in the component tree?**
> As close to their consumers as possible — not necessarily at the root. If only
> a dashboard section needs task data, wrap just that section. Placing all
> Providers at the root creates unnecessary global scope and potential for
> unintended consumers. The exception: truly global concerns (theme, auth) belong
> at the root.

**Q8. What is the state/dispatch context split pattern?**
> Using two separate contexts for shared state: one for the data (state), one for
> the update functions (dispatch/actions). Components that only trigger actions
> subscribe only to the dispatch context — which never changes (functions are
> stabilised with `useCallback`). This means action-only components never re-render
> due to data changes, even in components at the same level as data consumers.

---

## 20. Tricky Interview Questions

**Q1. What is "context hell" and how do you avoid it?**
> Context hell is having many nested Providers that make `main.jsx` or the root
> component deeply nested and hard to read:
> ```jsx
> <AuthProvider><ThemeProvider><TaskProvider><RouterProvider>
>   <QueryProvider><ModalProvider><ToastProvider>
>     <App />
>   </ToastProvider></ModalProvider></QueryProvider>
> </RouterProvider></TaskProvider></ThemeProvider></AuthProvider>
> ```
> Solutions: (1) Compose Providers into one `AppProviders` component.
> (2) Evaluate whether each concern truly needs global context.
> (3) Use a state management library that doesn't require Providers.

**Q2. A component subscribed to a context has `React.memo`. The context value
changes but the component's actual output would be the same. Does it re-render?**
> Yes — and this is a limitation of Context. React marks all context consumers
> as dirty when the Provider value changes, then calls their functions. However,
> React DOES perform a Virtual DOM diff after the re-render — if the output is
> identical, no real DOM changes are made. So: the component function runs (wasted
> computation) but the DOM doesn't change. This is why Context with high-frequency
> changes is inefficient — the function calls accumulate even without DOM updates.

**Q3. Can two `Provider`s of the same context type be nested? What happens?**
> Yes. The inner Provider's value takes precedence for all components in its
> subtree. Components above the inner Provider read from the outer Provider.
> This is useful for feature-scoped state (e.g., a modal's local context nested
> within the global user context).

**Q4. What happens when you call `useContext` with a context that has no Provider
anywhere in the tree?**
> React returns the `defaultValue` from `createContext(defaultValue)`. If
> `defaultValue` is `null` (as in our custom hook pattern), the null check in
> the custom hook fires and throws an error with a helpful message. Without a
> custom hook, you'd get a confusing `TypeError: Cannot read properties of null`
> when trying to destructure the null value.

**Q5. Context is sometimes described as "prop drilling in reverse." What does this mean?**
> In prop drilling, data is pushed DOWN through components that don't need it.
> With overused Context, every component implicitly PULLS FROM a global store,
> creating hidden dependencies. A component deep in the tree can silently depend
> on a Provider that might not be present. This makes components harder to reuse
> (they're coupled to the context tree), harder to test, and harder to reason about
> — similar issues to prop drilling, just in the opposite direction. The lesson:
> Context is for genuinely global concerns, not a substitute for thoughtful component design.

---

## 21. Revision Cheat Sheet

```
CONTEXT API — QUICK REFERENCE
══════════════════════════════════════════════════════════

THE THREE PARTS
  createContext(defaultValue)       → creates Context object
  <Context.Provider value={...}>    → broadcasts value to tree
  useContext(Context)               → reads value in any descendant

DEFAULT VALUE
  Used ONLY when no Provider is above the component.
  NOT the initial state of the Provider.

WHEN TO USE CONTEXT
  ✅ Truly global: theme, auth, language, app-wide state
  ✅ Data needed by many unrelated components
  ✅ 5+ levels of prop drilling
  ❌ 1–2 levels — use props (simpler, more explicit)
  ❌ Frequently changing state — use Zustand/Jotai

CUSTOM HOOK PATTERN (always use this)
  export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be within <AuthProvider>')
    return ctx
  }

PERFORMANCE RULES
  • React.memo does NOT protect against context changes
  • useMemo the context value object (prevents cascade re-renders)
  • Split contexts by change frequency
  • Separate state context from dispatch context

PROVIDER PLACEMENT
  • As low as possible — not always at root
  • Truly global (theme, auth) → root (main.jsx)
  • Feature-specific → wrap only that feature

SPLIT CONTEXT PATTERN
  TaskStateContext    → tasks data (changes often)
  TaskDispatchContext → action functions (never changes)
  → Action-only components NEVER re-render from data changes

useMemo ON VALUE
  // Without: new object every render → all consumers re-render
  // With:    same object if deps unchanged → consumers skip
  const value = useMemo(() => ({ user, logout }), [user, logout])

PROVIDER NESTING (main.jsx)
  <ThemeProvider>
    <AuthProvider>
      <TaskProvider>
        <App />
      </TaskProvider>
    </AuthProvider>
  </ThemeProvider>

══════════════════════════════════════════════════════════
```

---

## 22. Key Takeaways

1. **Context eliminates prop drilling** — any descendant can read data without
   intermediate components needing to pass it along.

2. **The three parts are indivisible**: `createContext` makes the object,
   `Provider` broadcasts, `useContext` reads. All three are always needed.

3. **`defaultValue` is for when no Provider exists** — not for initialising
   the Provider's value.

4. **`React.memo` does NOT protect against context changes** — context
   subscriptions bypass memo entirely. This is the #1 Context performance trap.

5. **Always `useMemo` the context value object** — otherwise a new object
   reference on every Provider parent render triggers all consumer re-renders.

6. **Split contexts by change frequency** — high-change data and low-change
   data should be in separate contexts to minimise re-render scope.

7. **Separate state from dispatch** — components that only need actions never
   re-render due to data changes when dispatch is its own context.

8. **The custom hook pattern is the production standard** — always wrap
   `useContext` in a function like `useAuth()`, providing error checking and encapsulation.

9. **Place Providers as low as possible** — not everything needs to be global.
   Over-global context creates implicit dependencies and testing difficulties.

10. **Context is not a performance tool** — it's a convenience tool. For
    frequently-updating shared state, use Zustand, Jotai, or similar.

---

## 23. Understanding Checklist

Before moving to Phase 8, verify you can answer all of these:

- [ ] I can explain what prop drilling is and when it becomes a real problem vs. being acceptable
- [ ] I can write the complete Context API pattern: createContext → Provider → useContext
- [ ] I know what `defaultValue` is actually used for (not the Provider's initial value)
- [ ] I can explain why `React.memo` does not protect against context changes
- [ ] I can explain the reference problem with context values and how `useMemo` fixes it
- [ ] I can explain and implement the custom context hook pattern with the null guard
- [ ] I can explain the state/dispatch split context pattern and its performance benefit
- [ ] I can explain where to place Providers and why "as low as possible" is the rule
- [ ] I can list three scenarios where Context is NOT the right tool
- [ ] I have the dashboard running with the theme toggle working (☀️/🌙 in header)
- [ ] I understand why `App.jsx` went from 200 lines to 40 lines (Provider pattern)
- [ ] I can trace the data flow: "User adds a task" → which contexts update → which components re-render

---

*Phase 07 Notes — Complete*
*Next: Phase 08 — React Router: Navigation, Routes, and URL-Driven State*
