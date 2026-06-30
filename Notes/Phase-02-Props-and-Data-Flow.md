# Phase 02 — Props and Data Flow
### How React Components Communicate: Passing Data from Parent to Child

---

> 📌 **How to use this document**
> Read top to bottom the first time. For quick revision, jump to the
> **Revision Cheat Sheet** (§21). For interview prep, go to §19 and §20.

---

## Table of Contents

1. [Topic Overview](#1-topic-overview)
2. [Why Props Exist — The Problem They Solve](#2-why-props-exist--the-problem-they-solve)
3. [Internal Working — How React Processes Props](#3-internal-working--how-react-processes-props)
4. [JavaScript Foundation — Destructuring](#4-javascript-foundation--destructuring)
5. [Prop Syntax — Complete Reference](#5-prop-syntax--complete-reference)
6. [The children Prop — Composition Pattern](#6-the-children-prop--composition-pattern)
7. [Default Prop Values](#7-default-prop-values)
8. [Unidirectional Data Flow](#8-unidirectional-data-flow)
9. [Props vs State — The Most Important Distinction](#9-props-vs-state--the-most-important-distinction)
10. [Prop Drilling — What It Is and When It Matters](#10-prop-drilling--what-it-is-and-when-it-matters)
11. [The Spread Operator with Props](#11-the-spread-operator-with-props)
12. [Important Terminology](#12-important-terminology)
13. [Key Rules and APIs](#13-key-rules-and-apis)
14. [Best Practices](#14-best-practices)
15. [Common Mistakes](#15-common-mistakes)
16. [Performance Considerations](#16-performance-considerations)
17. [Advantages](#17-advantages)
18. [Limitations](#18-limitations)
19. [Project Implementation Summary](#19-project-implementation-summary)
20. [Frequently Asked Interview Questions](#20-frequently-asked-interview-questions)
21. [Tricky Interview Questions](#21-tricky-interview-questions)
22. [Revision Cheat Sheet](#22-revision-cheat-sheet)
23. [Key Takeaways](#23-key-takeaways)
24. [Understanding Checklist](#24-understanding-checklist)

---

## 1. Topic Overview

**Props** (short for "properties") are the mechanism React uses to pass data
**from a parent component to a child component**. They are the primary way
components communicate and are the foundation of React's
**unidirectional data flow** model.

Every React component is a JavaScript function. Props are simply the
**arguments** of that function. Understanding props means understanding
that there is no React magic here — it is pure JavaScript.

```
JavaScript function:      React component:
greet("Shrikant", 25)     <UserCard name="Shrikant" age={25} />
      ↓                              ↓
function greet(name, age) function UserCard({ name, age })
```

---

## 2. Why Props Exist — The Problem They Solve

### The Problem Without Props

In Phase 1, we built three `TaskCard` components that all showed **identical**
hardcoded data. A component that can only display one fixed thing is not
reusable — it is effectively a static HTML template:

```jsx
// Phase 1 — Not reusable:
function TaskCard() {
  return (
    <div>
      <h3>Set up Vite + React project</h3>  {/* always the same */}
      <span>Done</span>                      {/* always the same */}
    </div>
  )
}
```

To display 100 different tasks, you would need 100 different components. That
defeats the entire purpose of components.

### The Solution — Props Make Components a Template

With props, one component definition can render infinite variations:

```jsx
// Phase 2 — Truly reusable:
function TaskCard({ title, status }) {
  return (
    <div>
      <h3>{title}</h3>    {/* different for every task */}
      <span>{status}</span> {/* different for every task */}
    </div>
  )
}

// Same component, different data:
<TaskCard title="Learn React"  status="done" />
<TaskCard title="Learn Hooks"  status="in-progress" />
<TaskCard title="Learn Router" status="todo" />
```

Props transform a component from a static template into a **reusable, data-driven
blueprint**.

---

## 3. Internal Working — How React Processes Props

### Step-by-Step: What Happens When You Write `<TaskCard title="Learn React" />`

**Step 1: JSX Compilation**
```jsx
// Input (JSX):
<TaskCard title="Learn React" status="done" priority={1} />

// Output (JavaScript after compilation):
React.createElement(TaskCard, {
  title: "Learn React",
  status: "done",
  priority: 1
})
```
The JSX attributes become **properties of a plain JavaScript object**. This
object is the `props` object.

**Step 2: Fiber Node Creation**
React creates (or updates) a Fiber node for this component. The props object
is stored in two fields:
- `pendingProps`: The new props coming in
- `memoizedProps`: The props from the last render

**Step 3: Reconciliation Check**
During the reconciliation (diffing) phase, React compares `pendingProps` against
`memoizedProps` using **shallow equality** (`===` on each top-level key).
- If they are identical → React **may skip** re-rendering this component
- If any key has changed → React calls the component function with the new props

This is the foundation of `React.memo` performance optimization (Phase 9).

**Step 4: Component Function Called**
```javascript
// React calls your component like this internally:
TaskCard({ title: "Learn React", status: "done", priority: 1 })
```
The props object is passed as the first (and only) argument.

**Step 5: Return Value Used**
The JSX returned by your component becomes new Virtual DOM nodes, which
React diffs against the previous tree and commits to the real DOM.

---

## 4. JavaScript Foundation — Destructuring

Props work entirely because of JavaScript's **object destructuring** syntax.
This is not a React feature — it is an ES6 JavaScript feature.

### Basic Object Destructuring

```javascript
const task = {
  title: "Learn React",
  status: "done",
  priority: "high",
  phase: 2
}

// Without destructuring (verbose):
const title = task.title
const status = task.status
const priority = task.priority

// With destructuring (clean):
const { title, status, priority } = task
// All three variables created in one line

// Rename while destructuring:
const { title: taskTitle, status: taskStatus } = task
// taskTitle = "Learn React", taskStatus = "done"

// Default values while destructuring:
const { title, status, priority = 'medium' } = task
// If task.priority is undefined, priority = 'medium'

// Nested destructuring:
const { meta: { phase, author } } = task
```

### Destructuring in Function Parameters

```javascript
// Without destructuring:
function TaskCard(props) {
  return <h3>{props.title} — {props.status}</h3>
}

// With destructuring in parameter (preferred):
function TaskCard({ title, status }) {
  return <h3>{title} — {status}</h3>
}

// With default values:
function TaskCard({ title, status = 'todo', priority = 'medium' }) {
  return <h3>{title} — {status} — {priority}</h3>
}
```

### Why Destructuring Matters for React

1. **Readability**: Looking at `{ title, status, priority }` immediately tells
   you every prop this component uses — no need to hunt through the code.

2. **Less Repetition**: `title` instead of `props.title` everywhere.

3. **Self-documenting**: The parameter list IS the component's API contract.

---

## 5. Prop Syntax — Complete Reference

### String Props — Use Quotes

```jsx
<TaskCard title="Learn React" />
<Button variant="primary" />
<Input placeholder="Search tasks..." />
```

### All Other Types — Use Curly Braces `{}`

```jsx
<TaskCard
  phase={2}                          // number
  isCompleted={true}                 // boolean (explicit)
  isCompleted                        // boolean shorthand (same as ={true})
  tags={["react", "hooks"]}          // array
  meta={{ phase: 2, author: "S" }}   // object — note DOUBLE braces
  onDelete={handleDelete}            // function reference
  count={tasks.length}               // expression
  label={isAdmin ? "Admin" : "User"} // ternary expression
/>
```

> ⚠️ **Double braces explained**: `style={{ color: 'red' }}` has two sets of
> braces. The **outer `{}`** is the JSX expression delimiter — "here comes
> JavaScript". The **inner `{}`** is a JavaScript object literal. It is NOT
> special React syntax.

### Passing All Props of an Object — Spread Operator

```jsx
const taskProps = {
  title: "Learn React",
  status: "done",
  priority: "high"
}

// Without spread (verbose):
<TaskCard title={taskProps.title} status={taskProps.status} priority={taskProps.priority} />

// With spread (clean):
<TaskCard {...taskProps} />
// Exactly equivalent — spreads all key-value pairs as individual props
```

**When to use spread**: When you already have an object whose shape matches
the component's props. Common when mapping over arrays.

**When NOT to use spread**: When passing unknown props through — it can
accidentally pass DOM attributes that cause warnings. Be intentional.

---

## 6. The children Prop — Composition Pattern

### What Is `children`?

`children` is a **special, automatically-populated prop**. React sets it to
whatever JSX appears between the opening and closing tags of a component:

```jsx
// The parent places content between tags:
<Button>Click Me</Button>
<Button><span>🚀 Launch</span></Button>
<Section title="Tasks">
  <TaskCard ... />
  <TaskCard ... />
</Section>

// The child component renders it via {children}:
function Button({ children, onClick }) {
  return (
    <button className="btn" onClick={onClick}>
      {children}  {/* "Click Me" or <span>🚀 Launch</span> */}
    </button>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}  {/* Whatever TaskCards the parent placed here */}
    </section>
  )
}
```

### Why children Is Powerful

Without `children`, you'd have to pass content as a prop:
```jsx
// Awkward — JSX as a prop value:
<Section title="Tasks" content={<><TaskCard /><TaskCard /></>} />

// Natural — JSX as children (the standard pattern):
<Section title="Tasks">
  <TaskCard />
  <TaskCard />
</Section>
```

### What `children` Can Be

| Type | Example |
|---|---|
| String | `<Button>Click</Button>` → `children = "Click"` |
| Single element | `<Box><p>Text</p></Box>` → `children = <p>...</p>` |
| Multiple elements | `<Box><p/><span/></Box>` → `children = [<p/>, <span/>]` |
| null/undefined | `<Box />` → `children = undefined` |

### Guarding Against Missing children

```jsx
function Section({ title, children }) {
  return (
    <section>
      <h2>{title}</h2>
      {children ?? <p>No content yet.</p>}
      {/* ?? is the nullish coalescing operator — renders fallback if children is null/undefined */}
    </section>
  )
}
```

---

## 7. Default Prop Values

There are two patterns for default prop values in modern React:

### Pattern 1: ES6 Default Parameter (Recommended)

```jsx
function TaskCard({ title, status = 'todo', priority = 'medium' }) {
  // If parent doesn't pass 'status', it defaults to 'todo'
  // If parent doesn't pass 'priority', it defaults to 'medium'
}
```

This is pure JavaScript. It is the modern, recommended pattern.

### Pattern 2: `defaultProps` (Legacy — Avoid in New Code)

```jsx
// Old pattern — still works but deprecated in React 19 for function components:
function TaskCard({ title, status, priority }) { ... }

TaskCard.defaultProps = {
  status: 'todo',
  priority: 'medium'
}
```

> 📌 **Interview Note**: `defaultProps` is being deprecated for function
> components in React 19. The React team explicitly recommends ES6 default
> parameter syntax instead. Always use the destructuring default pattern in
> new code.

---

## 8. Unidirectional Data Flow

React enforces a strict rule about how data moves through the component tree:

```
                    DATA FLOWS DOWN (via props)
                    ─────────────────────────→

App (owns data)
  ↓ props          ↓ props
Header           Section
                   ↓ props        ↓ props        ↓ props
                 TaskCard       TaskCard       TaskCard
                   ↓ props        ↓ props
                 StatusBadge   PriorityIndicator


                    EVENTS FLOW UP (via callback props)
                    ←─────────────────────────

TaskCard calls:  onDelete(task.id)
  ↑ App receives the call and updates its data
```

**Why this design?**

1. **Predictability**: Data changes in one place — the parent. You always know
   where to look for the source of truth.

2. **Debuggability**: If `TaskCard` displays wrong data, you trace up to its
   parent to find who passed the wrong prop. The direction is always clear.

3. **Isolation**: A child cannot corrupt a parent's data accidentally.

4. **Testability**: You can test a component in isolation by just passing props.

**The contract**: If a child needs to trigger a data change, the parent passes
it a **callback function** as a prop. The child calls it; the parent updates
the data. The data then flows back down as new props. This cycle is the
heartbeat of React — we'll implement this fully in Phase 3 (State).

---

## 9. Props vs State — The Most Important Distinction

This is asked in virtually every React interview.

| | Props | State |
|---|---|---|
| **Definition** | Data received from a parent component | Data managed internally by the component |
| **Who controls it** | The parent component | The component itself |
| **Mutable?** | ❌ Read-only — never mutate props | ✅ Changed via `useState` setter |
| **Where it lives** | Passed in from outside | Declared inside using `useState` |
| **When it updates** | When the parent re-renders with new values | When `setState` / setter function is called |
| **Triggers re-render?** | Yes (when new values come from parent) | Yes (always when setter is called) |
| **JavaScript analogy** | Function parameters | Local variables inside a function |

### The TV Analogy

```
A smart TV (component) has:

Props  = Channel number and volume set by the remote control (external input)
         → The TV cannot change its own channel number directly
         → The remote (parent) controls this

State  = The TV's internal brightness setting (internal data)
         → The TV manages this itself
         → The remote doesn't control brightness directly
```

### Code Comparison

```jsx
// Props — controlled externally, read-only:
function TaskCard({ title, status }) {
  // title and status come from the parent.
  // This component cannot change them.
  // To change them, the parent must pass new prop values.
}

// State — controlled internally, mutable:
function TaskCard({ title }) {
  const [isExpanded, setIsExpanded] = useState(false)
  // isExpanded is owned by this component.
  // Only this component can change it (via setIsExpanded).
  // The parent doesn't know about isExpanded.
}
```

### Can a prop become state?

Yes, and this is a pattern:

```jsx
// Initial value from prop, but the component manages it from then on:
function TaskCard({ initialStatus }) {
  const [status, setStatus] = useState(initialStatus)
  // From this point, 'status' is state — the component controls it.
  // The parent sets the starting value via 'initialStatus' prop.
}
```

**Warning**: This creates a "copy" of the parent's data inside the child. If
the parent later changes `initialStatus`, the child's `status` state will
NOT update (because `useState` only uses the initial value once). Use this
pattern carefully and intentionally.

---

## 10. Prop Drilling — What It Is and When It Matters

**Prop drilling** occurs when data must be passed through multiple layers of
components just to reach a deeply nested component that needs it.

```
App (owns user data)
  ↓ passes user as prop
Dashboard
  ↓ passes user as prop (doesn't use it itself!)
Sidebar
  ↓ passes user as prop (doesn't use it itself!)
UserAvatar  ← only this component needs user data
```

`Dashboard` and `Sidebar` are just **conduits** — they carry the prop without
using it. This is prop drilling.

### When Prop Drilling Is Fine

- 1–2 levels deep: completely acceptable and the simplest solution
- When the intermediate components logically "own" the data passing through

### When Prop Drilling Becomes a Problem

- 3+ levels deep
- Many components need the same piece of data
- Intermediate components are unrelated to the data they're passing

### The Solutions (Covered in Later Phases)

| Solution | When to Use | Phase |
|---|---|---|
| Context API | App-wide data (theme, user, language) | Phase 6 |
| State Management (Zustand/Redux) | Complex, frequently-changing shared state | Phase 9 |
| Component composition | Often eliminates drilling without extra tools | This phase |

---

## 11. The Spread Operator with Props

### Spreading an Object as Props

```jsx
const task = { title: "Learn React", status: "done", priority: "high" }

// Explicit (preferred when you know the props):
<TaskCard title={task.title} status={task.status} priority={task.priority} />

// Spread (useful when mapping):
<TaskCard {...task} />
// Same as above — spreads all enumerable properties as individual props
```

### Common Pattern — Spreading in `.map()`

```jsx
{tasks.map(task => (
  <TaskCard key={task.id} {...task} />
  // key is separate (not part of ...task) — key is never passed as a prop
))}
```

### Passing Through / Forwarding Props

A pattern used in reusable UI libraries — accept unknown extra props and
forward them to the underlying element:

```jsx
function Button({ children, variant = 'primary', ...rest }) {
  // ...rest collects all other props passed to Button
  return (
    <button className={`btn btn-${variant}`} {...rest}>
      {/* {...rest} forwards onClick, disabled, type, aria-*, etc. to the real button */}
      {children}
    </button>
  )
}

// Usage — any native button attribute works:
<Button variant="danger" onClick={handleClick} disabled={isLoading} type="submit">
  Delete Task
</Button>
```

`...rest` (the rest pattern) and `{...rest}` (the spread pattern) are pure
JavaScript (ES2018). They are not React features.

---

## 12. Important Terminology

| Term | Definition |
|---|---|
| **Props** | Short for "properties". Arguments passed to a React component from its parent. |
| **Destructuring** | A JavaScript syntax to extract values from objects/arrays into named variables. |
| **Unidirectional Data Flow** | Data flows in one direction only: parent → child via props. |
| **children prop** | A special prop auto-populated by React with the JSX between a component's opening and closing tags. |
| **Prop drilling** | Passing props through multiple intermediate components just to reach a deeply nested consumer. |
| **Default prop** | A fallback value for a prop when the parent does not provide it. |
| **Spread operator** | `...obj` — expands an object's properties as individual props (or an array as individual arguments). |
| **Rest parameter** | `...rest` in a function parameter — collects remaining props into an object. |
| **Callback prop** | A function passed as a prop so the child can notify the parent of events. |
| **Composition** | Building complex UIs by combining smaller, single-purpose components. |
| **Shallow equality** | Comparing two objects by checking if each top-level key has the same reference (`===`), not deep comparison. |
| **Read-only** | Props cannot be modified by the component that receives them. |

---

## 13. Key Rules and APIs

### Rules for Props

1. **Props are read-only** — never mutate `props.someValue`
2. **Props flow downward** — from parent to child only
3. **Any JavaScript value can be a prop** — string, number, boolean, array, object, function, JSX
4. **`children` is automatic** — you don't pass it explicitly; it's whatever is between the tags
5. **`key` is not a prop** — it is a React-internal reconciliation hint; never accessible via `props.key`
6. **`ref` is not a prop** — it is also React-internal (covered in Phase 7)

### React APIs Related to Props (React 19)

| API | What It Does |
|---|---|
| No specific API | Props are just function arguments — no special React API needed |
| `React.memo(Component)` | HOC that prevents re-render if props haven't changed (Phase 9) |
| `useCallback(fn, deps)` | Memoizes a callback function so it doesn't change on every render, preventing unnecessary re-renders of child components that receive it as a prop (Phase 7) |

---

## 14. Best Practices

1. **Always destructure props in the parameter**:
   ```jsx
   // ✅ Preferred:
   function Card({ title, status, priority }) { ... }
   // ❌ Avoid:
   function Card(props) { ... props.title ... props.status ... }
   ```

2. **Use default values for optional props**:
   ```jsx
   function Button({ variant = 'primary', size = 'md', children }) { ... }
   ```

3. **Name boolean props positively** — avoid `isNotLoading` or `disableX`:
   ```jsx
   // ✅ Good:
   <Button isLoading disabled />
   // ❌ Confusing:
   <Button isNotLoading={false} notDisabled />
   ```

4. **Name callback props with `on` prefix** — mirrors HTML event naming:
   ```jsx
   <TaskCard onDelete={handleDelete} onStatusChange={handleStatusChange} />
   ```

5. **Keep prop interfaces small** — if a component takes 8+ props, consider
   splitting it or grouping related props into an object.

6. **Don't pass entire objects when you only need specific fields**:
   ```jsx
   // ✅ Pass only what's needed — explicit, clear:
   <TaskCard title={task.title} status={task.status} />
   // ⚠️ Use spread only when all fields are relevant:
   <TaskCard {...task} />
   ```

7. **Document your props** — even a comment listing prop names and types is
   valuable. TypeScript (Phase late) makes this formal.

---

## 15. Common Mistakes

| Mistake | What Goes Wrong | Correct Pattern |
|---|---|---|
| `props.title = "new"` | Mutates props — data corruption, no re-render | Never mutate. Use state or callback props. |
| Passing functions as strings `onDelete="handleDelete"` | Passes the string `"handleDelete"`, not the function | `onDelete={handleDelete}` (no quotes) |
| Not providing `key` in lists | React reconciliation warning; incorrect element reuse | Always use stable, unique `key={item.id}` |
| Using array index as key | Breaks reconciliation when list reorders or items delete | Use item's unique ID |
| `style="color: red"` | HTML syntax invalid in JSX — error | `style={{ color: 'red' }}` (JS object) |
| Forgetting double braces for objects | `meta={phase: 2}` is a syntax error | `meta={{ phase: 2 }}` |
| Accessing `props.key` | `key` is not forwarded as a prop — always `undefined` | Use a separate `id` prop if you need the ID |
| Assuming props are always defined | Component crashes when optional prop is missing | Use default values or conditional rendering |

---

## 16. Performance Considerations

### Props and Re-rendering

A parent component re-renders → **all its children re-render by default**,
regardless of whether their props changed.

```
App re-renders
  ↓
Header re-renders  (even if currentPhase didn't change)
Section re-renders
  ↓
TaskCard re-renders (all 6, even if only 1 task changed)
  ↓
StatusBadge re-renders
PriorityIndicator re-renders
```

This is React's default behaviour. For small apps it's fine — React is fast.
For large apps, solutions exist:

1. **`React.memo(TaskCard)`**: Wraps the component; React skips re-rendering
   if the props are shallowly equal to last render. (Phase 9)

2. **`useCallback`**: Prevents callback function props from being recreated on
   every render (a new function reference would break `React.memo`). (Phase 7)

3. **`useMemo`**: Memoizes computed values so they don't recalculate on every
   render. (Phase 7)

### Reference Equality Trap

```jsx
// ❌ This creates a NEW array on every render:
<TaskCard tags={["react", "js"]} />

// Even if the content is identical, ["react", "js"] === ["react", "js"] is FALSE
// because they are two different array objects in memory.
// This would break React.memo — it would re-render every time.

// ✅ Define outside the component (for static data):
const TAGS = ["react", "js"]
function App() {
  return <TaskCard tags={TAGS} />
}

// ✅ Or use useMemo (for computed data — Phase 7):
const tags = useMemo(() => computeTags(task), [task])
```

---

## 17. Advantages

1. **Explicit data flow** — you can always trace where data comes from
2. **Component reusability** — one component definition serves infinite use cases
3. **Testability** — components are pure functions; test by passing props
4. **Clear component API** — destructured parameters document what a component needs
5. **Composability** — `children` prop enables flexible, generic layout components
6. **Isolation** — components don't share mutable state; bugs stay local

---

## 18. Limitations

1. **Prop drilling** — passing props through many layers is tedious (solved by Context API)
2. **Boilerplate for large prop sets** — many props become verbose (mitigated by spread, TypeScript)
3. **No upward communication** — children cannot directly modify parent data (intentional — by design)
4. **Re-render cascade** — all children re-render when parent does (mitigated by React.memo)
5. **Type safety requires TypeScript** — plain JS doesn't enforce prop types at compile time

---

## 19. Project Implementation Summary

### What We Built in Phase 2 (Task Dashboard)

**New files created:**
- `src/components/StatusBadge.jsx` — reusable status label (uses object map pattern)
- `src/components/PriorityIndicator.jsx` — reusable priority label (uses default props)
- `src/components/Section.jsx` — layout wrapper (demonstrates `children` prop)

**Files updated:**
- `src/components/TaskCard.jsx` — now accepts 5 props; delegates to StatusBadge and PriorityIndicator
- `src/components/Header.jsx` — now accepts `currentPhase` prop with default value
- `src/App.jsx` — now owns a `TASKS` data array; maps it to `TaskCard` components

**Component tree after Phase 2:**
```
App (owns TASKS data)
├── Header (currentPhase={2})
└── main
    └── Section (title="My Tasks", count={6}, children=...)
        └── div.task-grid
            └── [for each task in TASKS]
                TaskCard (title, description, status, priority, phase)
                ├── StatusBadge (status)
                └── PriorityIndicator (level)
```

**Key patterns demonstrated:**

```jsx
// 1. Receiving and using props via destructuring
function TaskCard({ title, description, status, priority, phase }) { ... }

// 2. Default prop values
function Header({ currentPhase = 1 }) { ... }
function PriorityIndicator({ level = 'medium' }) { ... }

// 3. Dynamic className from prop
const className = `status-badge status-${status}`

// 4. Object map pattern (cleaner than if/else)
const labels = { 'todo': 'To Do', 'done': 'Done', 'in-progress': 'In Progress' }
return <span>{labels[status]}</span>

// 5. The children prop
function Section({ title, count, children }) {
  return <section><h2>{title}</h2>{children}</section>
}

// 6. Array.map() rendering list of components
{TASKS.map(task => (
  <TaskCard key={task.id} title={task.title} status={task.status} ... />
))}

// 7. Passing a callback as a prop (preview of Phase 3)
<TaskCard onDelete={handleDelete} />
```

---

## 20. Frequently Asked Interview Questions

**Q1. What are props in React?**
> Props (short for properties) are the mechanism for passing data from a parent
> component to a child component. They are plain JavaScript objects — the
> arguments of the component function. They are read-only: a child component
> must never modify its own props.

**Q2. What is unidirectional data flow in React?**
> In React, data flows in one direction only: from parent to child via props.
> A child cannot directly modify a parent's data. If a child needs to trigger
> a data change, the parent passes a callback function as a prop, and the child
> calls it. This makes data changes predictable and traceable.

**Q3. What is the difference between props and state?**
> Props are external data passed in from a parent — read-only inside the
> component. State is internal data managed by the component itself — it can
> be changed via setState. Analogy: props are like function parameters (given
> from outside); state is like local variables (owned internally).

**Q4. What is the `children` prop?**
> `children` is a special prop that React automatically sets to whatever JSX
> is placed between a component's opening and closing tags. It enables
> composition — building wrapper components that don't need to know what they
> contain.

**Q5. Can you pass a function as a prop?**
> Yes. Functions are first-class values in JavaScript and can be passed as any
> other prop. This is the primary mechanism for child-to-parent communication
> — the parent passes a callback function, the child calls it with data, and
> the parent handles the update.

**Q6. What is prop drilling?**
> Prop drilling is when data must be passed through multiple layers of
> components just to reach a deeply nested component that needs it. Intermediate
> components carry the prop without using it. It is solved by Context API
> (for global data) or component composition (to restructure the tree).

**Q7. How do you set default values for props?**
> Using ES6 default parameter syntax in destructuring:
> `function Button({ variant = 'primary' }) { ... }`
> This is the modern, recommended pattern. The legacy `defaultProps` is
> deprecated for function components in React 19.

**Q8. Why can't you access `props.key` inside a component?**
> `key` is a React-internal reconciliation hint, not a prop. React strips it
> before passing the props object to your component. If you need the same value
> accessible inside the component, pass it as a separate prop: `<Item key={id} id={id} />`.

**Q9. What is the spread operator in the context of props?**
> `<TaskCard {...task} />` spreads all enumerable properties of the `task`
> object as individual props. Equivalent to writing each key-value pair
> manually. Useful when mapping over arrays where the data shape matches the
> component's props.

**Q10. What happens if you pass a prop that the component doesn't destructure?**
> It exists on the `props` object but is silently ignored. No error. This is
> fine for passing through via `...rest`, but can accidentally pass DOM
> attributes to native elements (which generates browser warnings).

---

## 21. Tricky Interview Questions

**Q1. If a parent re-renders but passes the same prop VALUES to a child, does
the child re-render?**
> Yes, by default. React re-renders all children of a re-rendered parent
> regardless of prop values. To prevent this, wrap the child in `React.memo`.
> React.memo performs a **shallow comparison** of the previous and new props —
> if all props are shallowly equal (`===`), the child's re-render is skipped.
> This is why passing a new object or array literal as a prop always causes
> re-renders even if the contents are the same — the reference is different.

**Q2. What is the difference between passing `isLoading` and `isLoading={true}`?**
> They are identical. In JSX, a prop written without a value is equivalent to
> `={true}`. This is called the boolean shorthand. However, `isLoading={false}`
> must be written explicitly — omitting the prop entirely passes `undefined`,
> which is falsy (same effect as `false`) but technically different from `false`.

**Q3. What happens if you call `props.onDelete()` but the parent forgot to pass
`onDelete`?**
> JavaScript will throw: `TypeError: props.onDelete is not a function`.
> `props.onDelete` would be `undefined`, and calling `undefined()` throws.
> The correct defensive pattern is: `props.onDelete?.()` (optional chaining)
> or check first: `if (onDelete) onDelete()`.

**Q4. Can a component render different component types based on props?**
> Yes — this is called a "dynamic component" pattern:
> ```jsx
> function Icon({ type }) {
>   const icons = { trash: TrashIcon, edit: EditIcon, check: CheckIcon }
>   const Component = icons[type]  // capital C — treated as a component
>   return Component ? <Component /> : null
> }
> ```
> The key insight: the variable must be capitalized before use in JSX,
> or React treats it as an HTML tag string.

**Q5. If you spread `{...task}` and `task` has an `id` property, does that
become the `key`?**
> No. `key` is a special React-internal concept that cannot be set via spread.
> Even if your object has a `key` property, `{...obj}` will not set the React
> key — it will just pass `key` as a regular prop (which React then strips
> from props). You must always set `key` explicitly: `<Item key={task.id} {...task} />`.

---

## 22. Revision Cheat Sheet

```
PROPS — QUICK REFERENCE
══════════════════════════════════════════════════════════

WHAT ARE PROPS?
  • Arguments of a component function
  • Passed from parent → child via JSX attributes
  • ALWAYS read-only — never mutate them

SYNTAX
  • Strings:       <C title="React" />
  • Everything else: <C count={5} active={true} list={[]} />
  • Boolean true:  <C active />   (shorthand)
  • Object:        <C meta={{ phase: 2 }} />  (double braces!)
  • Function:      <C onDelete={handleDelete} />
  • Spread:        <C {...taskObject} />

RECEIVING PROPS
  • Destructure in parameter: function Card({ title, status }) {}
  • Default values: function Card({ status = 'todo' }) {}
  • Rest pattern:  function Card({ title, ...rest }) {}  then  {...rest}

CHILDREN PROP
  • Whatever JSX is between <C>...</C> tags
  • Renders via {children} inside the component
  • Enables composition — wrapper doesn't need to know its content

UNIDIRECTIONAL DATA FLOW
  • Data: parent → child (via props)
  • Events: child → parent (via callback props)
  • NEVER: child → parent by mutating props

PROPS vs STATE
  • Props:  external, from parent, READ-ONLY
  • State:  internal, owned by component, MUTABLE via useState

PROP DRILLING
  • Passing props through layers that don't use them
  • 1-2 levels: fine
  • 3+ levels: use Context API

KEY RULE
  • key is NOT a prop — it's React-internal
  • Never accessible as props.key (always undefined)
  • Provide it separately: <Item key={id} id={id} />

PERFORMANCE
  • All children re-render when parent does (by default)
  • React.memo prevents re-render if props are shallowly equal
  • Avoid creating new objects/arrays/functions inline as props

══════════════════════════════════════════════════════════
```

---

## 23. Key Takeaways

1. **Props are function arguments** — JSX attribute syntax is just a nicer way
   to write them. There is no React magic in props, only JavaScript.

2. **Props flow in one direction** — always from parent to child. This
   predictability is a core architectural feature, not a limitation.

3. **Props are read-only** — a component must never modify its own props. This
   is the single most important rule about props.

4. **Destructuring is the standard** — always destructure props in the function
   parameter. It documents the component's interface and eliminates verbosity.

5. **Default values use ES6 syntax** — `{ status = 'todo' }` not `defaultProps`.

6. **`children` is the composition primitive** — it makes wrapper/layout
   components flexible and decoupled from their content.

7. **`key` is not a prop** — it is a reconciliation hint. Never try to read it
   as `props.key`. Pass ID separately if needed inside the component.

8. **Props trigger re-renders indirectly** — when the parent re-renders with new
   prop values, the child re-renders. Same prop values = still re-renders by
   default (unless wrapped in `React.memo`).

9. **Prop drilling is a symptom of structure** — if drilling is painful, it
   usually means the component tree needs restructuring, or Context is needed.

10. **Callback props enable child-to-parent communication** — the parent
    passes a function down; the child calls it with data; the parent updates state.

---

## 24. Understanding Checklist

Before moving to Phase 3, verify you can answer all of these:

- [ ] I can explain what props are without using the word "props" (describe
      them as function arguments + JSX attribute syntax)
- [ ] I can trace the path from `<TaskCard title="Learn" />` → compiled JS →
      React internal call → component function receives it
- [ ] I understand why props must be read-only (unidirectional data flow)
- [ ] I can write a component using destructured props with default values
- [ ] I can explain what the `children` prop is and why it exists
- [ ] I know the difference between props and state (external vs internal,
      read-only vs mutable)
- [ ] I can explain prop drilling and name two solutions
- [ ] I know why `key` is not accessible as `props.key`
- [ ] I can explain why passing `{tags={["react"]}}` inline can hurt performance
      (new reference on every render)
- [ ] I have the dashboard running with 6 different task cards showing different
      data from the TASKS array
- [ ] I understand `.map()` in the context of rendering lists in React

---

*Phase 02 Notes — Complete*
*Next: Phase 03 — State and useState: Making the UI Interactive*
