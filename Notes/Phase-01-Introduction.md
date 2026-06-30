# Phase 01 — Introduction to React
### React Fundamentals: Why React Exists, How It Works Internally, and Your First Component

---

> 📌 **How to use this document**
> Read it top to bottom the first time. For revision, jump directly to the
> **Revision Cheat Sheet** at the bottom. Use the **Interview Questions**
> section before any technical interview.

---

## Table of Contents

1. [Topic Overview](#1-topic-overview)
2. [Why React Exists — The Problem It Solves](#2-why-react-exists--the-problem-it-solves)
3. [SPA vs MPA](#3-spa-vs-mpa)
4. [React Architecture](#4-react-architecture)
5. [Internal Working — Virtual DOM, Reconciliation, Fiber](#5-internal-working--virtual-dom-reconciliation-fiber)
6. [Setting Up a React Project with Vite](#6-setting-up-a-react-project-with-vite)
7. [Project Structure Deep Dive](#7-project-structure-deep-dive)
8. [JSX — JavaScript XML](#8-jsx--javascript-xml)
9. [Components — The Building Blocks](#9-components--the-building-blocks)
10. [Important Terminology](#10-important-terminology)
11. [Key APIs and Methods](#11-key-apis-and-methods)
12. [Best Practices](#12-best-practices)
13. [Common Mistakes](#13-common-mistakes)
14. [Performance Considerations](#14-performance-considerations)
15. [Advantages of React](#15-advantages-of-react)
16. [Limitations of React](#16-limitations-of-react)
17. [Comparison with Similar Concepts / Frameworks](#17-comparison-with-similar-concepts--frameworks)
18. [Project Implementation Summary](#18-project-implementation-summary)
19. [Frequently Asked Interview Questions](#19-frequently-asked-interview-questions)
20. [Tricky Interview Questions](#20-tricky-interview-questions)
21. [Revision Cheat Sheet](#21-revision-cheat-sheet)
22. [Key Takeaways](#22-key-takeaways)
23. [Understanding Checklist](#23-understanding-checklist)

---

## 1. Topic Overview

React is an **open-source JavaScript library** for building user interfaces,
created by Jordan Walke at Facebook and open-sourced in **2013**.

React's core philosophy is built on three pillars:

| Pillar | Meaning |
|---|---|
| **Declarative** | You describe *what* the UI should look like for a given state. React handles *how* to update the DOM. |
| **Component-Based** | UIs are built by composing small, reusable, isolated pieces called components. |
| **Learn Once, Write Anywhere** | The same React knowledge applies to web (react-dom), mobile (react-native), desktop, VR, and more. |

> React is a **library**, not a framework. It handles only the View layer (UI
> rendering). You combine it with other tools (React Router, Redux, etc.) to
> build complete applications. Angular, by contrast, is a full framework.

---

## 2. Why React Exists — The Problem It Solves

### The World Before React

In traditional web development, the developer is responsible for manually
keeping the UI in sync with the data (application state). This is done using
vanilla JavaScript or libraries like jQuery:

```javascript
// Traditional approach — manually updating the DOM
function updateCartUI(cartCount, totalPrice) {
  document.getElementById('cart-badge').textContent = cartCount;
  document.getElementById('total-price').textContent = '$' + totalPrice;
  document.querySelector('.checkout-btn').disabled = cartCount === 0;
  // ...10 more manual DOM updates for one action
}
```

### Problems with Manual DOM Manipulation

1. **Synchronization Hell**: As apps grow, keeping dozens of DOM elements in
   sync with changing data becomes error-prone. Miss one update → inconsistent UI.

2. **Imperative Code is Hard to Read**: Imperative code says "do this, then
   do that, then do this." It describes *how* to update, not *what the result
   should be*. Hard to reason about at scale.

3. **No Reusability**: HTML + JS code for a "user card" UI cannot be easily
   reused. You'd copy-paste and manually track multiple copies.

4. **Testing is Difficult**: When UI and DOM manipulation logic are intertwined,
   unit testing is painful.

5. **Team Scalability**: Without a structured component model, large teams
   create inconsistent UI patterns.

### React's Solution: Declarative + Component-Based UI

```
❌ Imperative (Traditional):
"Find the cart badge, set its text to 3. Find the total, set it to $45.
 Find the button, enable it."

✅ Declarative (React):
"When cart = [item1, item2, item3], the UI looks like THIS."
 React figures out the minimum DOM updates needed automatically.
```

**Real-World Analogy**: Think of a spreadsheet. When you change a cell value,
all formulas that depend on it update automatically. You don't manually
recalculate. React works the same way for UI.

---

## 3. SPA vs MPA

### Multi-Page Application (MPA)

Every user action that requires new content sends a request to the server,
which responds with a complete, new HTML page. The browser discards the
current page and renders the new one.

```
[User clicks "Products"]
        ↓
[Browser → GET /products → Server]
        ↓
[Server renders full HTML page with products data]
        ↓
[Browser destroys current page, paints new page]
        ↓
[Visible flash/reload]
```

**Examples**: Traditional e-commerce sites, WordPress blogs, old bank portals.

### Single-Page Application (SPA)

The browser loads **one HTML file once**. All subsequent navigation is handled
by JavaScript — it swaps out components without contacting the server for HTML.
API calls fetch only **data (JSON)**, not entire pages.

```
[User clicks "Products"]
        ↓
[React Router intercepts — NO server request for HTML]
        ↓
[React swaps the content area component]
        ↓
[URL updates to /products]
        ↓
[Instant, smooth transition — no flash]
```

**Examples**: Gmail, Figma, Twitter/X, Notion, GitHub's issue tracker.

### SPA vs MPA — Full Comparison Table

| Feature | SPA | MPA |
|---|---|---|
| Initial Load Time | **Slower** — downloads entire JS bundle | **Faster** — server sends only the needed HTML |
| Subsequent Navigation | **Very fast** — no page reload | **Slower** — full server roundtrip |
| User Experience | App-like, smooth, no flickers | Page-like, visible reloads |
| SEO | **Harder** — needs SSR or SSG for crawlability | **Easier** — HTML is pre-rendered |
| Development Complexity | Higher — needs routing, state management | Lower — each page is mostly independent |
| Server Load | Lower — server only sends JSON data | Higher — server renders full HTML every request |
| Browser History | Managed by JS (React Router) | Natural — each page is a real URL |
| Best For | Dashboards, tools, social apps, internal tools | Blogs, content sites, marketing pages |
| Caching | JS bundle cached aggressively | Individual pages cached separately |
| Security | Must handle JWT/tokens carefully in JS | Cookies + sessions managed server-side |

> 💡 **Modern Hybrid Approach**: Next.js gives you the best of both worlds —
> React components with Server-Side Rendering (SSR) for SEO and fast initial
> load, plus SPA-like navigation after the first load.

---

## 4. React Architecture

### The Three Layers of React

```
┌─────────────────────────────────────────────┐
│              Your Application Code           │
│         (Components, Hooks, State)           │
├─────────────────────────────────────────────┤
│                 React Core                   │
│   (react package — component model, hooks,  │
│    reconciliation algorithm, Fiber engine)   │
├─────────────────────────────────────────────┤
│              React Renderer                  │
│  react-dom → Browser DOM                     │
│  react-native → iOS / Android Views          │
│  react-three-fiber → WebGL / Three.js        │
└─────────────────────────────────────────────┘
```

**Key insight**: The `react` package contains no DOM code at all. It only knows
about components, state, and the reconciliation algorithm. The `react-dom`
package is what actually touches the browser's DOM. This separation is why
React can target multiple platforms with the same component code.

### The React Rendering Pipeline (High Level)

```
Your JSX Code
      ↓
Babel/esbuild compiles JSX → React.createElement() calls
      ↓
React.createElement() returns plain JS objects (Virtual DOM nodes)
      ↓
React builds a Virtual DOM tree from these objects
      ↓
React diffs the new Virtual DOM against the previous Virtual DOM
      ↓  (Reconciliation / Diffing Algorithm)
React calculates the minimum set of real DOM changes
      ↓
react-dom applies only those changes to the browser's real DOM
      ↓
Browser repaints only the changed pixels
```

---

## 5. Internal Working — Virtual DOM, Reconciliation, Fiber

### 5.1 The Real DOM — Why It's Expensive

The browser's DOM (Document Object Model) is a tree of objects representing
your HTML. Updating it is expensive because every change can trigger:

- **Reflow (Layout)**: Recalculating the position and size of elements.
  Changing width, height, font-size, padding — anything that affects layout —
  causes a reflow, which can cascade to parent and sibling elements.
- **Repaint**: Redrawing pixels on screen. Color or visibility changes cause
  repaints.
- **Composite**: Combining layers. Transforms and opacity changes trigger this.

Reflow is the most expensive. A single DOM update can trigger a reflow of
hundreds of elements.

### 5.2 The Virtual DOM — React's Lightweight Mirror

The Virtual DOM is a **plain JavaScript object tree** that mirrors the
structure of the real DOM. It is cheap to create and manipulate because it
has no visual representation — it's just data.

```javascript
// A JSX element like:
<div className="card">
  <h2>Task Title</h2>
  <p>Status: Done</p>
</div>

// Becomes this Virtual DOM object (simplified):
{
  type: 'div',
  props: {
    className: 'card',
    children: [
      {
        type: 'h2',
        props: { children: 'Task Title' }
      },
      {
        type: 'p',
        props: { children: 'Status: Done' }
      }
    ]
  }
}
```

**When state changes**, React:
1. Renders a **new Virtual DOM tree** (pure function, no side effects)
2. **Diffs** it against the previous Virtual DOM tree
3. Produces a minimal **list of patches** (what actually changed)
4. **Commits** only those patches to the real DOM

This process is called **Reconciliation**.

### 5.3 Reconciliation — The Diffing Algorithm

React's diffing algorithm runs in **O(n)** time (linear) instead of the
theoretical O(n³) for comparing two trees, by making two assumptions:

#### Assumption 1: Different element types → tear down and rebuild
If the root element type changes (e.g., `<div>` → `<span>`), React destroys
the entire subtree and builds a fresh one. It never tries to migrate children
between different element types.

```jsx
// Old tree:            New tree:
<div>                   <span>          ← Different type!
  <Counter />             <Counter />   ← This Counter is DESTROYED and RECREATED
</div>                  </span>         ← Not reused — fresh start
```

#### Assumption 2: Keys help identify list items across renders
When rendering a list, React uses `key` props to match elements between renders.
Without keys, React matches by position (first with first, second with second,
etc.), which can produce incorrect results when items are reordered or inserted.

```jsx
// Without keys — React matches by position (fragile):
// Old: [Alice(0), Bob(1)]   New: [Charlie(0), Alice(1), Bob(2)]
// React thinks: position 0 changed (updates Alice → Charlie)
//               position 1 changed (updates Bob → Alice)
//               position 2 is new (creates Bob)
// Result: 3 operations instead of 1 (just inserting Charlie at top)

// With keys — React matches by identity (correct):
<li key="alice">Alice</li>
<li key="bob">Bob</li>
// New: Charlie(new), Alice(existing), Bob(existing)
// Result: 1 operation — insert Charlie at top. Alice and Bob are untouched.
```

### 5.4 React Fiber — The Reconciliation Engine

**Fiber** is React's internal architecture, introduced in **React 16** (2017).
It is a complete rewrite of the reconciliation algorithm.

#### Why Fiber Was Needed
The original reconciliation algorithm (called "Stack Reconciler") was
**synchronous and recursive**. Once it started updating a component tree,
it couldn't stop until it finished. On complex UIs, this caused:
- **Dropped frames** — animations stuttering
- **Unresponsive input** — typing delays while React was rendering
- **Jank** — visible UI freezes

#### What Fiber Introduced

A **Fiber** is a JavaScript object that represents a unit of work — one
component in the component tree. Instead of recursing through the entire tree
at once, React processes one Fiber at a time.

```javascript
// Simplified Fiber node structure:
{
  // Identity
  type: MyComponent,          // Function or class component, or HTML tag string
  key: null,                  // Key prop for reconciliation

  // Tree structure (linked list — not a tree!)
  child: FiberNode,           // First child component
  sibling: FiberNode,         // Next sibling component
  return: FiberNode,          // Parent component

  // Work
  pendingProps: {},           // New props being applied
  memoizedProps: {},          // Props from last render
  memoizedState: {},          // State from last render (hooks live here!)
  effectTag: 'UPDATE',        // What work needs to be done

  // Alternate
  alternate: FiberNode        // The previous version of this fiber (double buffering)
}
```

#### Fiber's Three Superpowers

1. **Interruptibility**: React can pause work mid-tree, handle a higher-priority
   update (e.g., user typing), then resume where it left off.

2. **Prioritization**: Updates are assigned priorities. User interactions
   (typing, clicking) = high priority. Background data updates = low priority.
   High-priority work can interrupt low-priority work.

3. **Concurrency** (React 18+): React can prepare multiple versions of the UI
   simultaneously without committing any to the DOM until ready. This enables
   features like `useTransition` and `useDeferredValue`.

#### The Two Phases of Fiber

```
Phase 1: RENDER PHASE (Interruptible — can be paused/restarted)
  ├── React traverses the Fiber tree
  ├── Calls your component functions (re-renders)
  ├── Diffs old vs new Virtual DOM
  └── Builds a list of "effects" (DOM changes needed)
         ↓
Phase 2: COMMIT PHASE (Synchronous — cannot be interrupted)
  ├── React applies all DOM changes at once
  ├── Runs useLayoutEffect callbacks
  └── Runs useEffect callbacks (scheduled asynchronously)
```

> ⚠️ **Critical Interview Point**: Because the Render Phase can be interrupted
> and restarted, React may call your component function **more than once** for
> a single update. This is why component functions must be **pure** — no side
> effects during render. This is also why `React.StrictMode` double-invokes
> render functions in development — to help you find impure renders.

#### Double Buffering in Fiber

Fiber maintains **two trees** at all times:
- **Current tree**: The tree currently displayed on screen
- **Work-in-progress tree**: The tree being built for the next render

When the work-in-progress tree is complete, React swaps it to become the
current tree in a single, atomic operation. This is similar to how video games
use double buffering to prevent screen tearing.

---

## 6. Setting Up a React Project with Vite

### Why Vite?

| Tool | Mechanism | Cold Start | HMR Speed |
|---|---|---|---|
| Create React App (Webpack) | Bundles everything before serving | 30–60 seconds on large projects | Slow |
| **Vite** | Serves files as native ES Modules — no bundling | **< 1 second** regardless of size | Instant |

**How Vite's Dev Server Works**:
- The browser natively supports ES Module imports (`import` statements)
- Vite leverages this: it serves your source files *as-is* during development
- When the browser requests `App.jsx`, Vite transpiles it on-demand and serves it
- Only the **changed module** is re-sent on edit — not the whole bundle
- For production, Vite uses **Rollup** to create an optimized bundle

### Setup Commands

```powershell
# 1. Create the project
npm create vite@latest task-dashboard -- --template react

# 2. Navigate into project folder
cd task-dashboard

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
# → Opens at http://localhost:5173
```

### Available npm Scripts

| Command | What It Does |
|---|---|
| `npm run dev` | Starts Vite dev server with HMR (Hot Module Replacement) |
| `npm run build` | Creates an optimized production bundle in `dist/` folder |
| `npm run preview` | Serves the `dist/` build locally to test before deploying |
| `npm run lint` | Runs ESLint to check for code quality issues |

---

## 7. Project Structure Deep Dive

```
task-dashboard/
│
├── public/                  ← Static assets served as raw files
│   └── vite.svg             ← Accessible at /vite.svg in browser
│
├── src/                     ← All your application source code
│   ├── assets/              ← Images/fonts imported by JS (Vite processes, hashes filenames)
│   │   └── react.svg
│   ├── App.css              ← Styles scoped to App component
│   ├── App.jsx              ← Root component — top of your component tree
│   ├── index.css            ← Global styles (applied to entire app)
│   └── main.jsx             ← Entry point — mounts React into the HTML
│
├── index.html               ← The single HTML shell for your SPA
├── package.json             ← Project metadata, dependencies, npm scripts
├── package-lock.json        ← Exact dependency versions (always commit this)
├── vite.config.js           ← Vite configuration (plugins, proxy, aliases)
└── .eslintrc.cjs            ← ESLint rules for code quality
```

### `public/` vs `src/assets/` — What's the Difference?

| | `public/` | `src/assets/` |
|---|---|---|
| Processing | Copied as-is, no transformation | Processed by Vite (optimized, hashed) |
| URL | Absolute `/image.png` | Imported in JS: `import img from './img.png'` |
| Cache Busting | Manual | Automatic (hash in filename) |
| Use For | `favicon.ico`, fonts, third-party scripts | App images, SVGs used in components |

### `index.html` — The SPA Shell

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Task Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <!--
      This is the ONLY div React needs.
      React will inject all your components inside this div.
      The rest of the page is empty HTML — React owns everything inside #root.
    -->
    <script type="module" src="/src/main.jsx"></script>
    <!--
      type="module" tells the browser this is an ES Module.
      This enables native import/export support.
      Vite relies on this for its dev server approach.
    -->
  </body>
</html>
```

### `main.jsx` — The Bridge Between React and the Browser

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Line-by-line explanation:**

| Line | Explanation |
|---|---|
| `import React` | Imports the core React library (component model, hooks engine) |
| `import ReactDOM` | Imports the DOM renderer — the bridge between React and the browser DOM |
| `import App` | Imports your root component — the top of your component tree |
| `import './index.css'` | Imports global CSS — Vite injects this into the `<head>` |
| `document.getElementById('root')` | Finds the `<div id="root">` in index.html — the mount point |
| `ReactDOM.createRoot(...)` | Creates a React Root — this is where the Fiber tree is anchored |
| `.render(...)` | Hands your component tree to React; React takes full ownership |
| `<React.StrictMode>` | Development-only wrapper; double-invokes renders to catch bugs |

### `package.json` — Understanding Dependencies

```json
{
  "dependencies": {
    "react": "^18.x.x",         // React core (component model, hooks, reconciler)
    "react-dom": "^18.x.x"      // React DOM renderer (browser-specific)
  },
  "devDependencies": {
    "@vitejs/plugin-react": "...", // Vite plugin: enables JSX transform + Fast Refresh
    "vite": "...",                 // The build tool / dev server
    "eslint": "..."                // Code quality linter
  }
}
```

**Why are `react` and `react-dom` separate packages?**
Because React's architecture separates the core reconciliation engine from the
platform-specific renderers. `react` knows nothing about the DOM. `react-dom`
knows how to translate React's instructions into DOM API calls. On mobile, you'd
use `react-native` instead of `react-dom`.

---

## 8. JSX — JavaScript XML

### What JSX Is (and Isn't)

JSX is **not HTML**. It is a **syntax extension** for JavaScript that looks
like HTML but compiles to plain JavaScript function calls. Babel or esbuild
transforms it before the browser ever sees it.

### The Compilation Chain

```jsx
// Step 1: What you write (JSX)
const element = <h1 className="title">Hello, {name}!</h1>;

// Step 2: What the compiler produces (JavaScript)
const element = React.createElement(
  'h1',
  { className: 'title' },
  'Hello, ',
  name,
  '!'
);

// Step 3: What React.createElement() returns (Virtual DOM node — plain object)
const element = {
  type: 'h1',
  props: {
    className: 'title',
    children: ['Hello, ', 'Shrikant', '!']
  },
  key: null,
  ref: null,
  $$typeof: Symbol(react.element)   // Security marker — prevents XSS injection
};
```

> 💡 The `$$typeof: Symbol(react.element)` field is a security feature.
> JSON cannot contain Symbols. This ensures that JSON data accidentally
> injected into the DOM cannot be treated as a React element.

### JSX Rules — Complete Reference

```jsx
// ✅ Rule 1: Single root element required
// Wrong:
return (
  <h1>Title</h1>
  <p>Text</p>        // ← Error: Adjacent JSX elements must be wrapped
)

// Correct Option A — wrap in a div:
return (
  <div>
    <h1>Title</h1>
    <p>Text</p>
  </div>
)

// Correct Option B — use Fragment (no extra DOM node):
return (
  <>
    <h1>Title</h1>
    <p>Text</p>
  </>
)
// <> </> is shorthand for <React.Fragment> </React.Fragment>

// ✅ Rule 2: All tags must be closed
<input type="text" />   // self-closing
<img src="..." />       // self-closing
<br />                  // self-closing
<MyComponent />         // component, self-closing

// ✅ Rule 3: JavaScript goes in curly braces {}
const user = { name: 'Shrikant', age: 25 };
return (
  <div>
    <p>Name: {user.name}</p>
    <p>Age: {user.age}</p>
    <p>In 5 years: {user.age + 5}</p>
    <p>{isAdmin ? 'Admin' : 'Guest'}</p>
  </div>
)

// ✅ Rule 4: Attributes use camelCase
<div
  className="box"          // 'class' is reserved in JS → className
  onClick={handleClick}    // 'onclick' HTML → onClick camelCase
  tabIndex={0}             // 'tabindex' HTML → tabIndex camelCase
  htmlFor="input"          // 'for' is reserved in JS (for loop) → htmlFor
/>

// ✅ Rule 5: Inline styles use objects with camelCase properties
<div style={{ backgroundColor: 'blue', fontSize: '16px' }}>
  {/* Note the double curly braces: outer {} = JSX expression, inner {} = JS object */}
</div>

// ✅ Rule 6: You can't use statements (if, for, while) directly in JSX
// Use expressions: ternary operator, logical &&, .map(), immediately invoked functions

// Wrong:
return (
  <div>
    {if (isLoggedIn) { <p>Hello</p> }}  // ← Statements not allowed
  </div>
)

// Correct:
return (
  <div>
    {isLoggedIn && <p>Hello</p>}          // Logical AND short-circuit
    {isLoggedIn ? <p>Hello</p> : null}    // Ternary
  </div>
)
```

### HTML Attributes That Change in JSX

| HTML Attribute | JSX Equivalent | Reason |
|---|---|---|
| `class` | `className` | `class` is a reserved JS keyword |
| `for` | `htmlFor` | `for` is a reserved JS keyword (for loop) |
| `onclick` | `onClick` | JSX uses camelCase for event handlers |
| `tabindex` | `tabIndex` | JSX uses camelCase |
| `readonly` | `readOnly` | JSX uses camelCase |
| `maxlength` | `maxLength` | JSX uses camelCase |
| `colspan` | `colSpan` | JSX uses camelCase |
| `style="color:red"` | `style={{ color: 'red' }}` | Style takes a JS object, not a string |

---

## 9. Components — The Building Blocks

### What is a Component?

A React **component** is a JavaScript function that:
1. Accepts an optional `props` object as argument
2. Returns JSX (or null)

That's the complete definition. Everything else (hooks, state, effects) is
built on top of this simple function.

```jsx
// Simplest possible component
function Greeting() {
  return <h1>Hello, World!</h1>;
}

// Component with props
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Using a component
<Greeting name="Shrikant" />
```

### Why Components Must Be Capitalized

JSX compilation uses capitalization to distinguish HTML tags from React components:

```jsx
// Lowercase → React treats as HTML element
// Compiles to: React.createElement('button', null, 'Click')
<button>Click</button>

// Uppercase → React treats as component (calls the function)
// Compiles to: React.createElement(Button, null, 'Click')
<Button>Click</Button>
```

If you name a component `button` (lowercase) and use it as `<button>`, React
will try to create a native HTML `<button>` element — your component function
will never be called.

### Component Rules (For Correctness)

1. **Components must be pure functions** during render:
   - Same props + same state → same JSX output, every time
   - No side effects during render (no API calls, no DOM manipulation)
   - Side effects go in `useEffect`, not directly in the component body

2. **Components must return JSX, null, or a React element**:
   - Returning `undefined` throws an error
   - Returning `null` renders nothing (valid and useful)
   - Returning `false` renders nothing (useful for conditional rendering)

3. **Never mutate props** — props are read-only

### Functional vs Class Components

React originally required class components for state and lifecycle methods.
Hooks (introduced in React 16.8) give function components the same capabilities.
Class components are **legacy** — all new React code uses function components.

```jsx
// Modern: Function Component (use this)
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// Legacy: Class Component (avoid in new code)
class Counter extends React.Component {
  state = { count: 0 };
  render() {
    return (
      <button onClick={() => this.setState({ count: this.state.count + 1 })}>
        {this.state.count}
      </button>
    );
  }
}
```

### Component Composition

The power of React comes from **composing** components — combining small
components into larger ones:

```jsx
function TaskCard({ title, status }) {
  return (
    <div className="task-card">
      <h3>{title}</h3>
      <StatusBadge status={status} />  {/* Composing StatusBadge inside TaskCard */}
    </div>
  );
}

function TaskList({ tasks }) {
  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard key={task.id} title={task.title} status={task.status} />
      ))}
    </div>
  );
}

function App() {
  return (
    <div>
      <Header />           {/* Composed */}
      <TaskList tasks={myTasks} />  {/* Composed */}
      <Footer />           {/* Composed */}
    </div>
  );
}
```

---

## 10. Important Terminology

| Term | Definition |
|---|---|
| **Virtual DOM** | A lightweight JS object representation of the UI. React's in-memory model. |
| **Reconciliation** | The algorithm React uses to diff old vs new Virtual DOM and determine minimal DOM updates. |
| **Fiber** | React's internal architecture; a linked-list based unit-of-work system enabling interruptible rendering. |
| **Component** | A JavaScript function that accepts props and returns JSX. |
| **JSX** | Syntactic sugar for `React.createElement()`. Looks like HTML, compiles to JS. |
| **Props** | Read-only inputs passed from parent to child component. |
| **State** | Mutable data managed inside a component that, when changed, triggers a re-render. |
| **Mount** | When a component is added to the DOM for the first time. |
| **Unmount** | When a component is removed from the DOM. |
| **Re-render** | When React calls a component function again due to state or prop change. |
| **SPA** | Single-Page Application — one HTML file, JS handles all navigation. |
| **MPA** | Multi-Page Application — each route is a separate server-rendered HTML page. |
| **HMR** | Hot Module Replacement — Vite replaces changed modules without full page reload. |
| **Entry Point** | `main.jsx` — where React is mounted into the HTML. |
| **Root** | The `ReactDOM.createRoot()` instance; the Fiber tree anchor. |
| **StrictMode** | Development-only mode that double-invokes renders to detect impure components. |
| **Renderer** | The package that translates React's work into platform-specific output (react-dom for browsers). |
| **Commit Phase** | The synchronous phase where React applies DOM changes. Cannot be interrupted. |
| **Render Phase** | The interruptible phase where React computes what changed. |

---

## 11. Key APIs and Methods

### `React.createElement(type, props, ...children)`
The underlying function that JSX compiles to.
- `type`: String (HTML tag) or component function
- `props`: Object of attributes/props (or `null`)
- `children`: Any number of child elements

### `ReactDOM.createRoot(container)`
Creates a React Root attached to the given DOM element.
- Returns a root object with a `.render()` method
- Introduced in React 18 to enable Concurrent Mode
- Old API was `ReactDOM.render()` — deprecated in React 18

### `ReactDOM.createRoot(container).render(element)`
Renders the given React element tree into the root.
- Pass your `<App />` component here
- React takes full control of the container's children

### `React.StrictMode`
A development-only component that activates additional checks:
- Double-invokes render functions to detect side effects
- Warns about deprecated APIs
- Has **zero effect on production builds**

---

## 12. Best Practices

1. **One component per file**: Name the file the same as the component
   (`TaskCard.jsx` for `function TaskCard()`).

2. **Keep components small**: A component should do one thing well (Single
   Responsibility Principle). If it's doing too much, extract sub-components.

3. **Components should be pure**: No side effects in render. All side effects
   belong in `useEffect`.

4. **Use Fragments to avoid unnecessary DOM nesting**: Prefer `<>...</>` over
   wrapping everything in `<div>` when the div serves no styling/semantic purpose.

5. **Use descriptive names**: `UserProfileCard` beats `Card1`. Names should
   describe what the component *is*, not what it *looks like*.

6. **Organize components by feature, not type**: As the app grows:
   ```
   ✅ Feature-based (scalable):    ❌ Type-based (doesn't scale):
   src/
   ├── features/                  src/
   │   ├── tasks/                 ├── components/
   │   │   ├── TaskCard.jsx       │   ├── TaskCard.jsx
   │   │   ├── TaskList.jsx       │   ├── TaskList.jsx
   │   │   └── TaskForm.jsx       │   ├── Header.jsx
   │   └── auth/                  ├── pages/
   │       └── LoginForm.jsx      │   └── Dashboard.jsx
   ```

7. **Export consistently**: Use `export default` for the main component of a
   file; use named exports for utilities in the same file.

---

## 13. Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Lowercase component name `<myComponent />` | JSX treats lowercase as HTML tag — your component never runs | Always capitalize: `<MyComponent />` |
| Mutating state directly `state.count = 5` | React won't detect the change, no re-render | Use `setState(newValue)` |
| Side effects in render | Render can run multiple times; side effects would repeat unexpectedly | Move to `useEffect` |
| Missing `key` in list items | React can't efficiently reconcile lists; warnings and bugs | Always provide stable, unique keys |
| Using `index` as key in dynamic lists | If list reorders, keys change → wrong elements update | Use item's unique ID |
| Returning `undefined` from a component | React throws an error | Return `null` to render nothing |
| Calling `useState` conditionally | Hooks must run in same order every render | Always call hooks at top level |

---

## 14. Performance Considerations

1. **React only updates changed DOM nodes**: Thanks to Virtual DOM diffing,
   updating one piece of state doesn't re-render the entire page — just the
   affected component tree.

2. **Fiber's prioritized rendering (React 18)**: With `useTransition`, you can
   mark non-urgent state updates as "transitions" so they don't block user
   input response.

3. **Component function is called on every re-render**: If a parent re-renders,
   all child components re-render by default. `React.memo` prevents unnecessary
   child re-renders. (Covered in a later phase.)

4. **Avoid creating objects/arrays in JSX**: Creating new objects during render
   can cause unnecessary re-renders of child components (because the reference
   changes). (Covered with `useMemo` / `useCallback` in a later phase.)

5. **The Render Phase can run multiple times**: With Concurrent Mode, React may
   render your component multiple times before committing. This is another
   reason components must be pure.

---

## 15. Advantages of React

1. **Declarative**: Easier to reason about UI state. "Given this data, the UI looks like X."
2. **Component Reusability**: Build once, use anywhere across the app.
3. **Large Ecosystem**: Massive community, rich libraries (React Router, React Query, Zustand, etc.)
4. **React DevTools**: Excellent browser extension for inspecting component trees, state, and profiling.
5. **Backed by Meta**: Active development, long-term support.
6. **Cross-Platform**: Same knowledge applies to web, mobile (React Native), and more.
7. **Concurrent Mode (React 18)**: State-of-the-art rendering with prioritization and interruptibility.
8. **Strong TypeScript Support**: First-class TypeScript integration.

---

## 16. Limitations of React

1. **Only a View library**: Requires additional libraries for routing, state management, API calls.
2. **Initial load can be slow (SPA)**: The entire JS bundle must download before the first render.
3. **SEO challenges**: SPAs need SSR (Next.js) for good search engine indexing.
4. **Boilerplate**: Setting up state management, routing, and folder structure requires decisions.
5. **Frequent updates**: React evolves quickly; patterns from 2–3 years ago may be outdated.
6. **JSX learning curve**: The mix of HTML-in-JS confuses beginners.
7. **Re-render complexity**: Managing unnecessary re-renders in large apps requires `memo`, `useMemo`, `useCallback`.

---

## 17. Comparison with Similar Concepts / Frameworks

| Feature | React | Vue | Angular | Svelte |
|---|---|---|---|---|
| Type | Library (View only) | Framework (progressive) | Full Framework | Compiler |
| Language | JSX + JS/TS | HTML Templates + JS | TypeScript + HTML | Svelte syntax |
| State | External (Zustand, Redux) | Built-in reactivity | Built-in (RxJS) | Built-in stores |
| Learning Curve | Medium | Easy | Steep | Easy |
| Bundle Size | Medium | Small | Large | Tiny |
| Community | Largest | Large | Large | Growing |
| Rendering | Virtual DOM | Virtual DOM | Real DOM | No VDOM (compiled) |
| Performance | Very good | Very good | Good | Excellent |
| SSR Solution | Next.js | Nuxt.js | Angular Universal | SvelteKit |
| Backed By | Meta | Community | Google | Community |

---

## 18. Project Implementation Summary

### Project: Task Dashboard

**What we built in Phase 1:**

A static Task Dashboard with three components:
- `Header` — displays the app title
- `TaskCard` — represents a single task
- `App` — the root component that composes Header and TaskCard

**Folder structure after Phase 1:**

```
task-dashboard/
├── src/
│   ├── components/
│   │   ├── Header.jsx       ← Reusable header component
│   │   └── TaskCard.jsx     ← Reusable task card component
│   ├── App.jsx              ← Root component composing all pieces
│   ├── App.css              ← App-level styles
│   ├── index.css            ← Global styles
│   └── main.jsx             ← Entry point
├── public/
├── index.html
└── package.json
```

**Key files and their roles:**

```jsx
// src/components/Header.jsx
function Header() {
  return (
    <header className="header">
      <h1>Task Dashboard</h1>
      <p>Manage your work efficiently</p>
    </header>
  );
}
export default Header;

// src/components/TaskCard.jsx
function TaskCard() {
  return (
    <div className="task-card">
      <h3>Set up project</h3>
      <p>Initialize the Vite React project</p>
      <span className="status">Completed</span>
    </div>
  );
}
export default TaskCard;

// src/App.jsx
import Header from './components/Header';
import TaskCard from './components/TaskCard';

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <TaskCard />
        <TaskCard />
      </main>
    </div>
  );
}
export default App;
```

**Concepts demonstrated:**
- Component creation and naming
- JSX syntax and rules
- Component composition
- File structure and imports/exports
- The component tree concept

---

## 19. Frequently Asked Interview Questions

**Q1. What is React and why was it created?**
> React is a JavaScript library for building user interfaces, created by Meta.
> It was created to solve the problem of keeping complex UIs in sync with
> changing data. It uses a declarative, component-based approach where you
> describe what the UI should look like for a given state, and React handles
> all DOM updates automatically.

**Q2. What is the Virtual DOM and why does it exist?**
> The Virtual DOM is a lightweight JavaScript object tree that mirrors the
> real DOM. It exists because real DOM updates are expensive (trigger reflow
> and repaint). React maintains the Virtual DOM and diffs it to find minimal
> changes, then applies only those changes to the real DOM.

**Q3. What is Reconciliation?**
> Reconciliation is React's algorithm for comparing the previous Virtual DOM
> tree with the new one after a state change, to determine the minimum set of
> real DOM operations needed. It uses two heuristics: different element types
> rebuild the subtree; keys help efficiently reconcile lists.

**Q4. What is the difference between SPA and MPA?**
> In a MPA, every navigation triggers a full server request and full page
> reload. In a SPA, one HTML file is loaded once; JavaScript handles all
> navigation by swapping components without page reloads. React apps are
> typically SPAs.

**Q5. What is JSX?**
> JSX is a syntax extension for JavaScript that allows writing HTML-like markup
> inside JavaScript. It is not HTML — it compiles to `React.createElement()`
> calls which return plain JavaScript objects (Virtual DOM nodes).

**Q6. Why are component names capitalized in React?**
> Because of how JSX compiles. Lowercase tags compile to `createElement('tag')`
> — treated as HTML. Capitalized tags compile to `createElement(Component)` —
> treated as a function/class to call. The capital letter is React's signal.

**Q7. What is the difference between `react` and `react-dom`?**
> `react` contains the core library — component model, hooks, reconciliation
> algorithm — with no DOM code. `react-dom` is the renderer that translates
> React's virtual output into actual browser DOM operations. The separation
> allows React to target multiple platforms.

**Q8. What does `React.StrictMode` do?**
> It's a development-only wrapper that double-invokes render functions to help
> detect impure renders and side effects. It also warns about deprecated APIs.
> It has zero effect on production builds.

**Q9. What is React Fiber?**
> Fiber is React's reimplemented reconciliation engine introduced in React 16.
> It breaks rendering work into small units (Fibers) that can be paused,
> prioritized, and resumed. This enables interruptible rendering, update
> prioritization, and Concurrent Mode features in React 18.

**Q10. Why should you avoid side effects in the render function?**
> The Render Phase is interruptible and can be invoked multiple times for a
> single update. Side effects in render would execute unexpectedly multiple
> times. Side effects should go in `useEffect`, which runs after the Commit
> Phase, exactly once per dependency change.

---

## 20. Tricky Interview Questions

**Q1. Does the Virtual DOM make React faster than vanilla JavaScript?**
> Not necessarily. For simple, targeted DOM updates, vanilla JS is often faster
> because it has no overhead. React's Virtual DOM provides a better developer
> experience and good performance at scale — it prevents accidental performance
> mistakes. The correct answer is: "React is not always faster, but it makes
> it harder to write slow code accidentally." Highly optimized vanilla JS can
> outperform React, but React's performance is consistently good with less effort.

**Q2. If JSX compiles to `React.createElement()`, why did older code always
import React at the top even when React wasn't used directly?**
> Before React 17, the Babel JSX transform compiled JSX to `React.createElement()`
> calls. Since `React` was referenced in the compiled output, it had to be in
> scope — hence the import. React 17 introduced the "new JSX transform" that
> auto-imports from `react/jsx-runtime` instead. With the new transform, you
> no longer need to import React just for JSX.

**Q3. Why does React's StrictMode double-invoke render functions in development?**
> The Render Phase in Fiber is interruptible — React can start rendering,
> pause, and restart. Components may be rendered multiple times before the
> result is committed. StrictMode simulates this by double-invoking renders,
> helping you discover components that have side effects in their render
> function (which would cause bugs in Concurrent Mode).

**Q4. What is the `$$typeof` field in a React element object?**
> It's a Symbol: `Symbol(react.element)`. It's a security measure. JSON data
> cannot contain Symbols. If a server sends malicious JSON that looks like a
> React element, React will reject it because the `$$typeof` Symbol will be
> missing. This prevents certain XSS (Cross-Site Scripting) attack vectors.

**Q5. When React re-renders a component, does it always update the DOM?**
> No. Re-rendering means React calls your component function again and builds
> a new Virtual DOM subtree. It then diffs this against the previous Virtual
> DOM. If the output is identical, React makes **zero real DOM changes**.
> Re-render ≠ DOM update. This is a crucial distinction.

---

## 21. Revision Cheat Sheet

```
REACT FUNDAMENTALS — QUICK REFERENCE
══════════════════════════════════════════════════════════

WHY REACT?
  • Declarative UI — describe what, not how
  • Component-based — reusable, composable pieces
  • Automatic DOM sync — React handles updates

SPA vs MPA
  • SPA: 1 HTML file, JS handles routing, fast nav, harder SEO
  • MPA: Server renders full page per request, simpler, visible reload
  • Next.js: Hybrid (SSR + SPA navigation)

VIRTUAL DOM & RECONCILIATION
  • VDOM: Plain JS object mirror of real DOM (cheap to create)
  • Reconciliation: Diff old VDOM vs new VDOM → minimal DOM ops
  • Different types → rebuild subtree
  • Keys → identify list items across renders

FIBER ARCHITECTURE
  • Unit of work = one Fiber (one component)
  • Render Phase: interruptible, can restart
  • Commit Phase: synchronous, atomic
  • Enables: prioritization, Concurrent Mode
  • Double buffering: current tree + work-in-progress tree

VITE
  • Dev: serves files as ES Modules (no bundling) → instant start
  • Prod: uses Rollup for optimized bundle
  • CRA (Webpack) is deprecated — always use Vite

PROJECT STRUCTURE
  • index.html: SPA shell with <div id="root">
  • main.jsx: entry point — ReactDOM.createRoot().render(<App/>)
  • src/: all application code
  • public/: static files served as-is

JSX RULES
  • Single root element (use <> </> Fragment)
  • All tags self-closed
  • Expressions in { }
  • Attributes camelCase (className, onClick, htmlFor)
  • Cannot use statements (if/for) in JSX directly

COMPONENTS
  • Function that returns JSX
  • Must start with Capital letter
  • Must be pure during render
  • Same props + state → same output

COMPONENT PIPELINE
  JSX → React.createElement() → Virtual DOM object
  → Fiber tree → Reconciliation → Commit → Real DOM

══════════════════════════════════════════════════════════
```

---

## 22. Key Takeaways

1. React was created to solve the **UI synchronization problem** — keeping the
   UI in sync with changing application data without manual DOM manipulation.

2. React's **declarative model** means you describe the desired UI state;
   React figures out the DOM operations needed to achieve it.

3. The **Virtual DOM is a JavaScript object** — cheap to create, cheap to diff.
   The real DOM is expensive. React minimizes real DOM operations through diffing.

4. **Reconciliation** is React's diffing algorithm. It uses element type changes
   and `key` props as heuristics to run in O(n) time.

5. **Fiber** is React's rendering engine. It enables interruptible, prioritized
   rendering. The Render Phase can be interrupted; the Commit Phase cannot.

6. **JSX is syntactic sugar** for `React.createElement()`. Every JSX element
   is a plain JavaScript object — not a DOM element.

7. A **component** is just a JavaScript function that returns JSX. The capital
   letter in its name is how JSX compilation distinguishes it from HTML tags.

8. **Vite** is the modern, fast choice for React projects. It uses native ES
   Modules during development for instant startup.

9. The **`react` and `react-dom` separation** allows React to target multiple
   platforms with the same core library.

10. **Never mutate state directly, never have side effects in render** — these
    two rules prevent the majority of React bugs.

---

## 23. Understanding Checklist

Before moving to Phase 2, verify you can answer all of these:

- [ ] I can explain what problem React was created to solve, without using the
      phrase "it makes things easier"
- [ ] I can explain what the Virtual DOM is and why it's faster than direct DOM
      manipulation
- [ ] I can trace the journey from JSX → `React.createElement()` → Virtual DOM
      object → real DOM
- [ ] I can explain the difference between SPA and MPA with trade-offs
- [ ] I can explain what Reconciliation is and its two key assumptions
- [ ] I can explain what Fiber is and why it was a necessary redesign
- [ ] I can list the JSX rules from memory
- [ ] I can explain why component names must be capitalized
- [ ] I can explain what `React.StrictMode` does and why
- [ ] I can explain why `react` and `react-dom` are separate packages
- [ ] I have Node.js installed and the Vite project created and running
- [ ] I can look at the generated project files and explain each file's purpose

---

*Phase 01 Notes — Complete*
*Next: Phase 02 — JSX Deep Dive and Component Props*
