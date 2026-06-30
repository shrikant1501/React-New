# Phase 06 — useMemo, useCallback, and React.memo
### Performance Optimisation: Memoisation, Reference Equality, and the Re-render System

---

> 📌 **How to use this document**
> Read top to bottom the first time. §21 (Cheat Sheet) for quick revision.
> §19 and §20 for interview prep — these topics are asked frequently at
> mid-to-senior level interviews with real code scenarios.

---

## Table of Contents

1. [Topic Overview](#1-topic-overview)
2. [React's Default Re-render Behaviour](#2-reacts-default-re-render-behaviour)
3. [Reference Equality — The Root Cause](#3-reference-equality--the-root-cause)
4. [React.memo — Skipping Child Re-renders](#4-reactmemo--skipping-child-re-renders)
5. [useMemo — Memoising Values and Objects](#5-usememo--memoising-values-and-objects)
6. [useCallback — Memoising Functions](#6-usecallback--memoising-functions)
7. [How All Three Work in Fiber](#7-how-all-three-work-in-fiber)
8. [The Three-Tool System — How They Work Together](#8-the-three-tool-system--how-they-work-together)
9. [The Decision Framework — When to Optimise](#9-the-decision-framework--when-to-optimise)
10. [The Cost of Memoisation](#10-the-cost-of-memoisation)
11. [useCallback vs useMemo — The Relationship](#11-usecallback-vs-usememo--the-relationship)
12. [Profiling with React DevTools](#12-profiling-with-react-devtools)
13. [Common Anti-patterns](#13-common-anti-patterns)
14. [Important Terminology](#14-important-terminology)
15. [Best Practices](#15-best-practices)
16. [Common Mistakes](#16-common-mistakes)
17. [Performance Considerations](#17-performance-considerations)
18. [Project Implementation Summary](#18-project-implementation-summary)
19. [Frequently Asked Interview Questions](#19-frequently-asked-interview-questions)
20. [Tricky Interview Questions](#20-tricky-interview-questions)
21. [Revision Cheat Sheet](#21-revision-cheat-sheet)
22. [Key Takeaways](#22-key-takeaways)
23. [Understanding Checklist](#23-understanding-checklist)

---

## 1. Topic Overview

React re-renders components more than strictly necessary by default. For most
applications this is completely fine — React is fast and the cost is negligible.
But for large lists, expensive computations, or high-frequency updates, these
unnecessary re-renders become measurable bottlenecks.

Three tools address this:

| Tool | Purpose | What It Memoises |
|---|---|---|
| `React.memo` | Skip child re-renders | A component's rendered output |
| `useMemo` | Skip expensive recomputations | A value (object, array, computation result) |
| `useCallback` | Stabilise function references | A function reference |

**The critical insight**: These three tools are a **system**. `React.memo` alone
is almost never sufficient — it requires `useCallback` and `useMemo` to provide
the stable prop references that make memoisation actually skip renders.

---

## 2. React's Default Re-render Behaviour

React's rendering rule is simple and aggressive:

> **When a component re-renders, every child component re-renders too,
> unconditionally, regardless of whether their props changed.**

```
App state changes
  → App re-renders
    → Header re-renders      ← props unchanged (wasted)
    → StatsBar re-renders    ← props unchanged (wasted)
    → TaskCard×N re-renders  ← most props unchanged (wasted)
```

### Why This Is the Default

React chose this over "smart re-rendering by default" for two reasons:
1. **Correctness over optimisation** — always re-rendering can never be wrong;
   skipping a necessary re-render causes stale UI bugs
2. **Re-rendering is cheap** — calling a component function and comparing its
   Virtual DOM output is typically microseconds. JavaScript engines are optimised
   for this pattern.

### When It Actually Hurts

- Large lists: rendering 1000 `TaskCard` items when only 1 changed
- Expensive render functions: components that do heavy computation
- High-frequency events: resizing, scrolling, mouse movement triggering state

---

## 3. Reference Equality — The Root Cause

**This is the single most important concept in this phase.**

JavaScript compares primitives by value but objects, arrays, and functions by
reference (memory address):

```javascript
// Primitives — value comparison:
5 === 5           // true
'hello' === 'hello' // true
true === true     // true

// Objects/Arrays/Functions — REFERENCE comparison:
{} === {}          // false — two different objects in memory
[] === []          // false — two different arrays
(() => {}) === (() => {})  // false — two different functions

// Same reference — always true:
const a = { x: 1 }
const b = a          // b points to the same object
a === b              // true — same memory address
```

### Why This Creates Re-render Problems

Every time a React component function runs (every render), any inline values
are **recreated as new references**:

```jsx
function App() {
  const [tasks, setTasks] = useState([...])

  // ❌ NEW object reference on every render:
  const stats = { total: tasks.length, done: tasks.filter(...).length }

  // ❌ NEW array on every render:
  const visibleTasks = tasks.filter(t => t.status === filter)

  // ❌ NEW function on every render:
  const handleDelete = (id) => setTasks(...)
}
```

When these are passed as props, even if their *content* is identical:
- `React.memo`'s comparison: `Object.is(oldStats, newStats)` → `false` (new reference!)
- Result: child re-renders even though nothing logically changed
- Memoisation is completely defeated

---

## 4. React.memo — Skipping Child Re-renders

`React.memo` is a **Higher-Order Component** that wraps another component.
Before React re-renders the wrapped component, it performs a **shallow prop
comparison** against the previous props. If all props are equal (via `Object.is`),
React reuses the previous rendered output and skips the function call entirely.

```jsx
// Without memo — always re-renders when parent does:
function TaskCard({ title, status, onDelete }) { ... }

// With memo — only re-renders when props actually change:
const TaskCard = memo(function TaskCard({ title, status, onDelete }) { ... })

// Can also wrap at export:
export default memo(TaskCard)

// Named import from React:
import { memo } from 'react'
```

### What "Shallow Comparison" Means

React uses `Object.is()` on each top-level prop key:

```javascript
// Memo comparison for { title: "Learn React", status: "done", onDelete: fn1 }
// vs new props   { title: "Learn React", status: "done", onDelete: fn2 }:

Object.is("Learn React", "Learn React")  // true ✓
Object.is("done", "done")                // true ✓
Object.is(fn1, fn2)                      // FALSE — different function references
// → ONE prop changed → React.memo re-renders the component
```

### Custom Comparison Function

`React.memo` accepts a second argument — a custom comparison function:

```jsx
const TaskCard = memo(
  function TaskCard({ task, onDelete }) { ... },
  (prevProps, nextProps) => {
    // Return true to SKIP re-render, false to RE-RENDER
    // Custom: only re-render if task data changed (ignore onDelete identity)
    return prevProps.task.id     === nextProps.task.id &&
           prevProps.task.title  === nextProps.task.title &&
           prevProps.task.status === nextProps.task.status
  }
)
```

**Warning**: Custom comparators are easy to get wrong. Returning `true` when
you should return `false` produces stale, incorrect UI. Use sparingly.

### The Memo Prerequisites Checklist

Before adding `React.memo`, verify:
- [ ] Component renders visibly expensive output (or renders frequently)
- [ ] Props are stable references OR you will stabilise them with `useCallback`/`useMemo`
- [ ] Component is **pure** — same props → always same output

---

## 5. useMemo — Memoising Values and Objects

`useMemo` memoises the **return value** of a function. The function only
re-runs when its dependency array changes.

```jsx
// Syntax:
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b])

// The function runs: on mount AND when a or b changes
// The function is SKIPPED: on any render where neither a nor b changed
// The previous return value is returned instead
```

### Two Distinct Use Cases

**Use Case 1: Avoiding expensive recomputation**

```jsx
// Without useMemo — sorts 10,000 tasks on every render:
const sortedTasks = tasks.sort((a, b) => a.priority - b.priority)

// With useMemo — only sorts when tasks change:
const sortedTasks = useMemo(() =>
  [...tasks].sort((a, b) => a.priority - b.priority),
  [tasks]
)
```

**Use Case 2: Stabilising object references for React.memo**

```jsx
// Without useMemo — new object on every render → defeats StatsBar's memo:
const stats = { total: tasks.length, done: tasks.filter(...).length }

// With useMemo — same object reference when tasks unchanged:
const stats = useMemo(() => ({
  total:      tasks.length,
  done:       tasks.filter(t => t.status === 'done').length,
  inProgress: tasks.filter(t => t.status === 'in-progress').length,
  todo:       tasks.filter(t => t.status === 'todo').length,
}), [tasks])
// Now Object.is(oldStats, newStats) is TRUE when tasks unchanged → memo WORKS
```

### When useMemo Is NOT Needed

```jsx
// ✅ Primitives — no reference issue:
const count = tasks.length          // number → stable comparison
const title = `${count} tasks`      // string → stable comparison
// No useMemo needed for these

// ✅ Cheap computations — not worth the overhead:
const isVisible = count > 0         // simple boolean — don't useMemo
const displayName = name.trim()     // simple string op — don't useMemo

// ✅ Values only used locally (not passed as props):
const firstTask = tasks[0]          // if only used in this render, no memo needed
```

---

## 6. useCallback — Memoising Functions

`useCallback` memoises a **function reference**. It returns the same function
object across renders unless its dependencies change.

```jsx
// Without useCallback — new function on every render:
const handleDelete = (id) => setTasks(prev => prev.filter(t => t.id !== id))

// With useCallback — same function reference when deps unchanged:
const handleDelete = useCallback(
  (id) => setTasks(prev => prev.filter(t => t.id !== id)),
  [setTasks]   // setTasks is a stable setter — this effect runs once
)
```

### Why useCallback Exists

```jsx
// Problem chain without useCallback:
// 1. App renders
// 2. handleDelete = new function (new reference)
// 3. <TaskCard onDelete={handleDelete} /> — receives new reference
// 4. React.memo(TaskCard) checks: Object.is(oldDelete, newDelete) → FALSE
// 5. TaskCard re-renders — MEMO IS DEFEATED

// Solution chain with useCallback:
// 1. App renders
// 2. handleDelete = useCallback(fn, [setTasks]) — same reference if setTasks unchanged
// 3. <TaskCard onDelete={handleDelete} /> — receives SAME reference
// 4. React.memo(TaskCard) checks: Object.is(oldDelete, newDelete) → TRUE
// 5. TaskCard SKIPS render — MEMO WORKS ✓
```

### The Setter Stability Guarantee

React guarantees `useState` setters never change their reference:
```jsx
const [tasks, setTasks] = useState([])
// setTasks is ALWAYS the same function reference — across ALL renders
// Safe to use as a useCallback dependency, or omit with [] deps
```

This is why `useCallback` handlers that use only setter functions can safely
use `[]` or `[setTasks]` as deps — either works, `[setTasks]` is more explicit.

### useCallback Is NOT for All Functions

```jsx
// ❌ Unnecessary — this function is only used inside the component render:
const formatTitle = useCallback((title) => title.toUpperCase(), [])
// Nobody receives this as a prop — memo comparison irrelevant

// ✅ Needed — passed as prop to a memo'd child:
const handleDelete = useCallback((id) => setTasks(...), [setTasks])
<MemoizedChild onDelete={handleDelete} />
```

---

## 7. How All Three Work in Fiber

All three tools use the same Fiber `memoizedState` linked list mechanism:

```javascript
// useMemo and useCallback both store:
{
  memoizedState: {
    // For useMemo:
    value: <last computed value>,
    deps: [<last dep values>],

    // For useCallback (useMemo specialised for functions):
    value: <last function reference>,
    deps: [<last dep values>],
  }
}

// React.memo stores on the Fiber itself:
FiberNode {
  type: MemoComponent,      // wraps the actual component
  pendingProps: {},          // new props
  memoizedProps: {},         // previous props
  // React compares pendingProps vs memoizedProps before calling the component
}
```

### The Comparison Algorithm

```
On every render of a parent:
  For each child wrapped in React.memo:
    1. React has the new props (pendingProps)
    2. React has the old props (memoizedProps from last render)
    3. For each prop key: Object.is(old[key], new[key])
    4. If ALL true → BAIL OUT: reuse previous fiber subtree, no re-render
    5. If ANY false → PROCEED: call the component function, diff, commit
```

---

## 8. The Three-Tool System — How They Work Together

The three tools are **not independent** — they form a system where each enables
the others:

```
React.memo           requires           stable prop references
                                              │
                                              ├── primitives (already stable)
                                              │
                                              ├── useCallback (for functions)
                                              │
                                              └── useMemo (for objects/arrays)
```

### The Full Optimisation Pattern

```jsx
// Step 1: Identify expensive child — TaskCard renders 6+ times unnecessarily
// Step 2: Wrap with React.memo
const TaskCard = memo(function TaskCard({ title, onDelete }) { ... })

// Step 3: Identify unstable props being passed to it
// onDelete is a function → recreated on every App render → defeats memo

// Step 4: Stabilise with useCallback
const handleDelete = useCallback((id) => {
  setTasks(prev => prev.filter(t => t.id !== id))
}, [setTasks])

// Step 5: Pass the stable reference
<TaskCard title={task.title} onDelete={handleDelete} />
// Now: Object.is(oldOnDelete, newOnDelete) → true → TaskCard SKIPPED ✓
```

---

## 9. The Decision Framework — When to Optimise

**The golden rule: Measure first. Optimise second.**

```
Is there a MEASURABLE performance problem?
  NO  → Stop. Don't add complexity.
  YES → Continue.

Is the component rendering FREQUENTLY?
  NO  → Probably not worth optimising.
  YES → Continue.

Is the component EXPENSIVE to render?
  (many DOM nodes, heavy computation, large list)
  NO  → Probably not worth optimising.
  YES → React.memo is a candidate.

Are the props STABLE or can they be made stable?
  NO  → React.memo won't help without useCallback/useMemo.
  YES → Apply the full three-tool system.
```

### When Each Tool Is Justified

| Tool | Justified When |
|---|---|
| `React.memo` | Component re-renders often due to parent updates, AND props are stable |
| `useMemo` | Computation is measurably expensive (> 1ms), OR value is an object/array passed to memo'd child |
| `useCallback` | Function is passed as prop to a `React.memo` component |

---

## 10. The Cost of Memoisation

Memoisation is not free. Every usage adds overhead:

```
Every render, React must:
  useMemo:     compare deps array, decide to run factory or return cached
  useCallback: compare deps array, decide to return old or new function
  React.memo:  compare ALL props shallowly

If your component renders in 0.05ms and the memo overhead is 0.03ms,
you've improved performance by only 0.02ms — essentially nothing,
but you've added cognitive complexity to your code.
```

### The Rule of Thumb

```
Only memoise when you can answer YES to this question:
"Have I measured (via React DevTools Profiler) that this component is
causing performance issues in my actual application?"

If you haven't measured, you're guessing — and premature optimisation
often introduces bugs and always introduces complexity.
```

---

## 11. useCallback vs useMemo — The Relationship

```javascript
// useCallback is literally useMemo for functions:
useCallback(fn, deps)
// is exactly equivalent to:
useMemo(() => fn, deps)

// Both return:
//   - The cached value (function or other value) if deps unchanged
//   - A fresh value (from factory/function) if deps changed
```

The only reason `useCallback` exists as a separate hook is readability:
`useCallback(fn, deps)` is clearer than `useMemo(() => fn, deps)`.

---

## 12. Profiling with React DevTools

Before optimising, measure. The React DevTools Profiler is the correct tool.

### How to Use It

1. Install React DevTools browser extension
2. Open DevTools → **Profiler** tab
3. Click **Record** (circle button)
4. Interact with your app (click, type, navigate)
5. Click **Stop**
6. Examine the flame graph:
   - Width = how long each component took to render
   - Grey = component was skipped (memoised successfully)
   - Coloured = component rendered (wider = slower)

### What to Look For

```
🔴 Wide bar = expensive render
🔴 Many renders of the same component = unnecessary re-renders
⬜ Grey bar = memo working correctly
```

### The Profiler API (in code)

```jsx
import { Profiler } from 'react'

<Profiler id="TaskList" onRender={(id, phase, actualDuration) => {
  console.log(`${id} [${phase}] rendered in ${actualDuration.toFixed(2)}ms`)
}}>
  <TaskList tasks={tasks} />
</Profiler>
```

---

## 13. Common Anti-patterns

### Anti-pattern 1: useMemo on Everything

```jsx
// ❌ Over-memoisation — adds complexity, negligible benefit:
const title = useMemo(() => task.title.toUpperCase(), [task.title])
const isVisible = useMemo(() => count > 0, [count])
const className = useMemo(() => `task task-${status}`, [status])

// ✅ These are trivial computations — no memo needed:
const title = task.title.toUpperCase()
const isVisible = count > 0
const className = `task task-${status}`
```

### Anti-pattern 2: React.memo Without Stable Props

```jsx
// ❌ Memo with no useCallback — memo is completely defeated:
const MemoCard = memo(Card)

function App() {
  const handleClick = () => doSomething()   // new function every render
  return <MemoCard onClick={handleClick} />  // memo always sees "new" onClick
  // Result: MemoCard re-renders on every App render anyway
  // You've added complexity for ZERO benefit
}

// ✅ Stabilise the prop:
const handleClick = useCallback(() => doSomething(), [])
return <MemoCard onClick={handleClick} />   // memo CAN now skip ✓
```

### Anti-pattern 3: useCallback in a Non-memoised Component

```jsx
// ❌ useCallback not helping anyone:
function SimpleForm() {
  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    // ...
  }, [])
  // handleSubmit is only used in this component — no child receives it as a prop
  // useCallback provides ZERO benefit here — just wasted overhead
}
```

### Anti-pattern 4: Object/Array in useMemo Dependencies

```jsx
// ❌ Object in deps array — useMemo runs on every render anyway:
const result = useMemo(() => processData(options), [options])
// If options = { sort: 'asc' } is recreated each render → never stable
// useMemo runs every render — as if you hadn't used it

// ✅ Use primitives in deps:
const result = useMemo(() => processData({ sort }), [sort])
```

---

## 14. Important Terminology

| Term | Definition |
|---|---|
| **React.memo** | HOC that wraps a component and performs shallow prop comparison before re-rendering. |
| **useMemo** | Hook that memoises a computed value. Returns cached value until deps change. |
| **useCallback** | Hook that memoises a function reference. Returns same function until deps change. |
| **Shallow comparison** | Comparing each top-level property using `Object.is()`. Not deep — nested objects are compared by reference. |
| **Reference equality** | Two objects/arrays/functions are equal only if they point to the same memory address. |
| **Memoisation** | Caching the result of a function call so it's only recomputed when inputs change. |
| **Render bailout** | When React skips calling a component function and reuses the previous output. |
| **Higher-Order Component (HOC)** | A function that takes a component and returns a new enhanced component. `React.memo` is an HOC. |
| **Stable reference** | A value/function whose memory address doesn't change between renders. |
| **Premature optimisation** | Optimising before measuring, adding complexity for unmeasured gains. |
| **Render count** | Number of times a component function has been called. Useful for measuring optimisation effectiveness. |
| **Object.is()** | JavaScript's strict equality algorithm, used by React for hook dep and memo prop comparisons. Same as `===` except: `Object.is(NaN, NaN)` → `true`, `Object.is(+0, -0)` → `false`. |

---

## 15. Best Practices

1. **Measure before you optimise** — use React DevTools Profiler to find actual bottlenecks.

2. **Apply the three tools as a system** — `React.memo` without `useCallback` is usually pointless.

3. **useState setters don't need useCallback** — they're already stable:
   ```jsx
   // ✅ Pass directly — already stable:
   <FilterBar onFilterChange={setActiveFilter} />
   // ❌ Unnecessary wrapping:
   const handleChange = useCallback((v) => setActiveFilter(v), [setActiveFilter])
   ```

4. **Use functional updates to keep deps empty:**
   ```jsx
   // ✅ [] deps — no stale closure because we don't use 'tasks':
   const handleDelete = useCallback((id) => {
     setTasks(prev => prev.filter(t => t.id !== id))
   }, [setTasks])
   ```

5. **Keep useMemo deps as primitives** — objects in deps recreate every render:
   ```jsx
   useMemo(() => compute(task.id, task.status), [task.id, task.status])  // ✅
   useMemo(() => compute(task), [task])  // ⚠️ if task is recreated each render
   ```

6. **Co-locate optimisation with the component** — document WHY you memoised:
   ```jsx
   // React.memo: this component renders in a list of 100+ items.
   // useCallback dep: [] is safe because we use functional update pattern.
   ```

7. **Remove memoisation you can't prove is helping** — it adds maintenance burden.

---

## 16. Common Mistakes

| Mistake | What Goes Wrong | Fix |
|---|---|---|
| `React.memo` without `useCallback` on function props | Memo always sees "changed" function → re-renders every time | Add `useCallback` for all function props to memo'd components |
| Empty `[]` deps in `useCallback` when closing over state | Stale closure — handler uses old state value | Use functional update `setState(prev => ...)` |
| `useMemo` for trivial computations | Overhead exceeds benefit | Only use for expensive computations or reference stabilisation |
| Objects in `useMemo` dependency array | Object is new every render → memo re-runs every render | Use primitive values as deps |
| Missing deps in `useCallback`/`useMemo` | Stale closure bugs | Include all values from component scope used inside |
| Memoising everything "just in case" | Complex code, harder to read, possible bugs | Measure first, then target specific bottlenecks |
| Assuming `React.memo` skips ALL renders | It only skips if ALL props pass `Object.is` check | Verify with render counter or Profiler |

---

## 17. Performance Considerations

### The Rendering Cascade

```
Without optimisation (filter changes):
  App re-renders
    Header (4 DOM nodes)
    StatsBar (8 DOM nodes)
    AddTaskForm (6 DOM nodes)
    FilterBar (4 buttons)
    TaskCard×8 (each 8 DOM nodes = 64 DOM nodes)
  Total: ~86 component renders

With optimisation (filter changes):
  App re-renders
    Header → SKIPPED (memo)
    StatsBar → SKIPPED (memo + useMemo stats)
    AddTaskForm → SKIPPED (memo + useCallback handleAddTask)
    FilterBar → RE-RENDERS (filter changed — correct)
    TaskCard×8 → SKIPPED (memo + useCallback handlers)
  Total: ~2 component renders (App + FilterBar)
```

### When Optimisation Matters Most

- **Large lists** (50+ items) where individual items rarely change
- **Expensive renders** (chart components, complex calculations)
- **High-frequency state updates** (animations, drag-and-drop, real-time data)
- **Context consumers** (many components reading from one Context — Phase 7)

---

## 18. Project Implementation Summary

### What We Built in Phase 6

**New file:**
- `src/hooks/useRenderCount.js` — dev tool: counts component renders via `useRef`

**Updated files:**
- `src/components/TaskCard.jsx` — wrapped in `memo`, added render counter
- `src/components/StatsBar.jsx` — wrapped in `memo`
- `src/components/FilterBar.jsx` — wrapped in `memo`
- `src/App.jsx` — `useMemo` for stats + visibleTasks, `useCallback` for all handlers

### The Proof: Observable Optimisation

With render counters visible on each `TaskCard`:

```
Before (without memo/useCallback):
  User clicks filter button "Done"
  → ALL TaskCard render counters increment (e.g., 2→3, 2→3, 2→3...)
  → Every card re-rendered even though task data didn't change

After (with memo + useCallback):
  User clicks filter button "Done"
  → TaskCard counters DO NOT increment
  → Only FilterBar re-rendered (its activeFilter prop changed)
  → TaskCards SKIPPED — React.memo confirmed working

User clicks status badge on one task:
  → Only THAT TaskCard's counter increments
  → Other TaskCards SKIPPED — their props didn't change
```

### Key Code Patterns

```jsx
// 1. React.memo — wrap the component:
const TaskCard = memo(function TaskCard({ ... }) { ... })

// 2. useMemo — stable object reference + skip recomputation:
const stats = useMemo(() => ({
  total: tasks.length,
  done:  tasks.filter(t => t.status === 'done').length,
}), [tasks])   // recomputes ONLY when tasks changes

// 3. useMemo — skip expensive filter:
const visibleTasks = useMemo(() =>
  filter === 'all' ? tasks : tasks.filter(t => t.status === filter),
  [tasks, filter]
)

// 4. useCallback — stable function reference for memo'd children:
const handleDelete = useCallback((id) => {
  setTasks(prev => prev.filter(t => t.id !== id))
}, [setTasks])

// 5. useState setter passed directly (already stable — no useCallback needed):
<FilterBar onFilterChange={setActiveFilter} />

// 6. useRenderCount — visual proof in development:
const renderCount = useRenderCount()
{import.meta.env.DEV && <span>renders: {renderCount}</span>}
```

---

## 19. Frequently Asked Interview Questions

**Q1. What is `React.memo` and when should you use it?**
> `React.memo` is a Higher-Order Component that wraps a component and performs
> a shallow prop comparison before re-rendering. If all props are shallowly equal
> (via `Object.is`) to the previous render, React skips the re-render and reuses
> the previous output. Use it when a component: re-renders frequently due to
> parent updates, produces the same output for the same props, and receives
> stable prop references (primitives, or memoised functions/objects).

**Q2. What is `useMemo` and what are its two use cases?**
> `useMemo(factory, deps)` memoises the return value of `factory`. It only
> re-runs `factory` when `deps` change, returning the cached value otherwise.
> Two use cases: (1) Avoiding expensive recomputation — e.g., sorting 10,000 items
> only when the underlying array changes. (2) Stabilising object/array references
> for `React.memo` — without `useMemo`, a new object literal is created on every
> render, defeating memo's shallow comparison.

**Q3. What is `useCallback` and why does it exist?**
> `useCallback(fn, deps)` returns a memoised function reference that only changes
> when `deps` change. It exists specifically as a companion to `React.memo`. When
> a function is passed as a prop to a memoised component, that function must have
> a stable reference — otherwise `React.memo`'s comparison always sees "changed"
> and re-renders anyway. `useCallback` provides this stable reference.

**Q4. What is reference equality and why does it matter for React performance?**
> In JavaScript, objects, arrays, and functions are compared by memory address,
> not content. Two structurally identical objects (`{} === {}`) are not equal
> because they are at different memory addresses. In React, `useMemo` and
> `useCallback` deps, and `React.memo` prop comparisons all use `Object.is()`.
> Inline objects/functions in JSX create new references every render, making
> memoisation comparisons always fail.

**Q5. Is `useCallback(fn, deps)` the same as `useMemo(() => fn, deps)`?**
> Yes, exactly. `useCallback` is `useMemo` specialised for the case where the
> memoised value is a function. The only difference is readability —
> `useCallback(fn, deps)` is clearer than `useMemo(() => fn, deps)`.

**Q6. Do you always need `useCallback` when passing functions to memoised components?**
> Not for `useState` setter functions — React guarantees they are stable
> references across all renders. You can pass `setFilter` or `setTasks` directly
> to a `memo`-wrapped child without `useCallback`. You only need `useCallback`
> for functions you define yourself inside the component.

**Q7. What is "premature optimisation" and why is it dangerous in React?**
> Premature optimisation is adding performance tooling before measuring that a
> performance problem exists. In React, it's dangerous because: (1) `useMemo` and
> `useCallback` have a runtime cost (comparison on every render) that may exceed
> the cost of the work being avoided. (2) They add code complexity. (3) Incorrect
> dependency arrays introduce stale closure bugs. Always profile first with
> React DevTools Profiler, then optimise the specific bottleneck.

**Q8. Why does wrapping a component in `React.memo` sometimes not prevent re-renders?**
> Because one or more props are not stable references. If the parent passes an
> inline object (`stats={{}}`), inline array, or function (`onClick={() => ...}`),
> these are new references on every render. `Object.is()` comparison fails for
> every one of them. The solution: stabilise functions with `useCallback`,
> stabilise objects/arrays with `useMemo`.

---

## 20. Tricky Interview Questions

**Q1. You have `React.memo(Child)`. The parent re-renders because its local state
changed (not related to Child's props). Will Child re-render?**
> No — this is exactly what `React.memo` prevents. As long as all props passed
> to Child are shallowly equal to the previous render, `React.memo` skips the
> re-render entirely. However, if any prop is a function or object without
> `useCallback`/`useMemo`, it will be a new reference every render, making
> `React.memo` useless for that case.

**Q2. Can `useMemo` cause a bug?**
> Yes. If the deps array is incomplete (missing a value that the factory uses),
> the cached value won't update when that value changes — a stale memoised
> value. Example:
> ```jsx
> const doubled = useMemo(() => count * 2, [])  // missing 'count' dep
> // doubled is always the initial value — never updates
> ```
> This is the same stale closure problem as in `useEffect`.

**Q3. A component wrapped in `React.memo` has internal state. Does it still
re-render when its internal state changes?**
> Yes. `React.memo` only prevents re-renders caused by **external prop changes**.
> If the component's own `useState` setter is called, React always re-renders
> the component regardless of memo. Memo is purely about props, not internal state.

**Q4. What is the output of this code:**
```jsx
const memoedValue = useMemo(() => {
  console.log('computing')
  return tasks.length * 2
}, [tasks.length])
```
> There's a subtle issue: `tasks.length` in the deps array is a primitive
> (number), so comparison works correctly. This is actually fine — the computation
> only re-runs when `tasks.length` changes. However, this style (extracting a
> primitive from an object as a dep) is a valid and good pattern to make deps
> stable. `'computing'` logs only when the length changes.

**Q5. You have 1000 TaskCards and you add `React.memo` to all of them. Performance
is still bad. What might be wrong?**
> Several possibilities: (1) A function prop without `useCallback` causes memo
> to always fail — all 1000 re-render anyway. (2) A context value is changing
> and all 1000 are context consumers — memo doesn't help with context changes.
> (3) The bottleneck isn't rendering but something else (DOM layout, network).
> (4) The state update itself is creating new object references in the task array,
> causing all tasks to look "changed" even if only one was modified.

---

## 21. Revision Cheat Sheet

```
PERFORMANCE OPTIMISATION — QUICK REFERENCE
══════════════════════════════════════════════════════════

THE ROOT CAUSE: REFERENCE EQUALITY
  {} === {}       → false (new object = new reference)
  [] === []       → false
  fn === fn2      → false (different function objects)
  5 === 5         → true (primitives compare by value)
  "a" === "a"     → true

THE THREE TOOLS
  React.memo(Component)          — skip re-render if props shallowly equal
  useMemo(() => value, [deps])   — cache computed value
  useCallback(fn, [deps])        — cache function reference
                                   (= useMemo(() => fn, deps))

WHEN EACH HELPS
  React.memo:   child renders often + receives stable props
  useMemo:      expensive computation OR object passed to memo'd child
  useCallback:  function passed as prop to memo'd child

THEY WORK AS A SYSTEM:
  memo alone → useless if props aren't stable
  useCallback → only helps if child is memo'd
  useMemo (for refs) → only helps if child is memo'd

STABLE REFERENCES (no useCallback needed):
  useState setters — ALWAYS stable (React guarantee)
  module-level constants — defined outside component

WHEN NOT TO OPTIMISE:
  ❌ No measurable performance problem
  ❌ Component renders quickly (< 1ms)
  ❌ Props change almost every render anyway
  ❌ Cheap computation (string concat, simple math)

RULE: MEASURE FIRST with React DevTools Profiler.
      Only optimise concrete bottlenecks.

MEMO COMPARISON: Object.is() per prop
  Same reference → true → SKIP
  Different reference → false → RE-RENDER
  Exception: custom comparator (second arg to memo)

useState SETTER STABILITY:
  setTasks is ALWAYS the same reference — pass directly, no useCallback

══════════════════════════════════════════════════════════
```

---

## 22. Key Takeaways

1. **React re-renders all children by default** — this is intentional, safe,
   and usually fast enough. Optimise only when you measure a problem.

2. **Reference equality is the root cause** of all memoisation complexity.
   Objects, arrays, and functions created inline are new references every render.

3. **React.memo performs shallow prop comparison** using `Object.is()`. If any
   prop is a new reference, the component re-renders despite memo.

4. **`React.memo` alone is almost never enough** — function props defeat it
   without `useCallback`, and object props defeat it without `useMemo`.

5. **`useCallback` and `useMemo` both use the same dep comparison mechanism** —
   `Object.is()` per dependency. Stale deps → stale cached values.

6. **`useCallback(fn, deps)` === `useMemo(() => fn, deps)`** — one API, two names.

7. **`useState` setters are always stable** — no `useCallback` wrapping needed
   before passing them as props.

8. **Functional updates eliminate the need for state in deps** — `setState(prev =>...)`
   removes the closure-over-state issue, enabling safe `[]` deps.

9. **`useMemo` solves two problems**: expensive computation AND object reference
   stability for `React.memo` to work.

10. **Premature optimisation adds complexity and can introduce bugs** (stale deps,
    stale memoised values). Profile first, optimise specific bottlenecks only.

---

## 23. Understanding Checklist

Before moving to Phase 7, verify you can answer all of these:

- [ ] I can explain why React re-renders all children by default and why this is usually fine
- [ ] I can explain reference equality and why `{} === {}` is false
- [ ] I can explain what `React.memo` does and its exact comparison mechanism
- [ ] I can explain why `React.memo` alone often doesn't help (function props)
- [ ] I can explain what `useMemo` does and name its two distinct use cases
- [ ] I can explain what `useCallback` does and why it exists alongside `React.memo`
- [ ] I can prove that `useCallback(fn, deps) === useMemo(() => fn, deps)`
- [ ] I know that `useState` setters are stable and don't need `useCallback`
- [ ] I can explain the "three-tool system" and how the tools depend on each other
- [ ] I can describe the cost of memoisation and why over-memoisation is harmful
- [ ] I have run the dashboard and verified the render counter behaviour:
      - Filter change → TaskCard counters DON'T increment (memo working)
      - Status change on one task → ONLY that TaskCard's counter increments
- [ ] I know the correct order: measure → identify bottleneck → apply targeted fix

---

*Phase 06 Notes — Complete*
*Next: Phase 07 — Context API: Eliminating Prop Drilling*
