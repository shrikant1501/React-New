# Phase 12 — Styling (CSS Modules, Tailwind, clsx, CSS-in-JS)

> **Status:** ✅ Complete  
> **Built:** `clsx` installed, applied to `TaskCard.jsx` and `FilterBar.jsx`  
> **Notes cover:** CSS Modules, Tailwind CSS, clsx, CSS custom properties, CSS-in-JS, component variants

---

## 1. The Styling Landscape in React

There are five major approaches to styling React components. You need to know all five conceptually and be able to discuss trade-offs:

| Approach | Example | Re-renders | Scoping | Interview Weight |
|---|---|---|---|---|
| **Plain CSS / BEM** | `App.css` + `.task-card` | No | Global (manual) | ⭐⭐⭐ Know it |
| **CSS Modules** | `TaskCard.module.css` + `styles.taskCard` | No | Automatic (build-time) | ⭐⭐⭐⭐ Common |
| **Tailwind CSS** | `className="flex gap-2 p-4"` | No | None (utility-first) | ⭐⭐⭐⭐⭐ Dominant |
| **CSS-in-JS** | `styled.div`, `css` prop | Yes (runtime) | Automatic | ⭐⭐ Declining |
| **CSS Custom Properties** | `var(--color-primary)` | No | Cascading | ⭐⭐⭐⭐ Universal |

**Our app uses:** Plain CSS + CSS custom properties (theming). That's a solid, production-valid choice. The notes below give you everything you need to discuss any approach in an interview.

---

## 2. CSS Modules — The Interview-Safe Answer

### What They Are
CSS Modules are regular CSS files where every class name is **automatically scoped** to the component that imports them. Two components can both use `.title` without conflict.

### How They Work (Build-Time Magic)
```css
/* TaskCard.module.css */
.card { background: var(--color-surface); border-radius: 10px; }
.title { font-size: 0.95rem; font-weight: 600; }
.cardDone { border-left: 3px solid green; }
```

```jsx
// TaskCard.jsx
import styles from './TaskCard.module.css'

function TaskCard({ title, status }) {
  return (
    <div className={styles.card}>         {/* → "TaskCard_card__x7kQ2" */}
      <h3 className={styles.title}>{title}</h3>
    </div>
  )
}
```

At build time, Vite transforms `.card` → `TaskCard_card__x7kQ2` (component name + class name + hash). The CSS file gets the same transformation. **No two components can ever accidentally share a class name.**

### The `composes` Feature (CSS Modules Only)
```css
/* base.module.css */
.button { padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }

/* TaskCard.module.css */
.primaryBtn {
  composes: button from './base.module.css';  /* inherit base styles */
  background: var(--color-primary);
  color: white;
}
```

### CSS Modules in Vite
Vite supports CSS Modules out of the box — zero configuration needed. Just name your file `*.module.css`.

### When to Use CSS Modules
- Component libraries where class name collision would be a real risk
- Teams that prefer keeping CSS in separate files
- When you want scoped CSS without a build-time framework dependency

### When NOT to Use CSS Modules
- When you need dynamic styles based on JavaScript values (runtime props) — use CSS custom properties or CSS-in-JS
- When the team uses Tailwind — the approaches conflict in philosophy

---

## 3. Tailwind CSS — The Industry Dominant Answer

### What It Is
Tailwind is a **utility-first CSS framework**. Instead of writing CSS classes with semantic names, you compose styles directly from single-purpose utility classes:

```jsx
// Traditional CSS approach:
<div className="task-card task-card-done">  {/* classes defined in CSS file */}

// Tailwind approach:
<div className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-green-500">
  {/* no CSS file needed — everything is inline utilities */}
```

### Core Utilities to Know
```jsx
// Layout
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-3 gap-4">

// Spacing
<div className="p-4 px-6 py-2 m-2 mt-4 mb-0">  {/* padding, margin */}

// Typography
<h1 className="text-xl font-bold text-gray-900 tracking-tight">

// Colors
<button className="bg-indigo-600 text-white hover:bg-indigo-700">

// Borders
<div className="border border-gray-200 rounded-lg border-l-4 border-l-green-500">

// Responsive (mobile-first breakpoints)
<div className="flex-col md:flex-row lg:gap-8">
//              ↑ default  ↑ ≥768px     ↑ ≥1024px

// Dark mode
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">

// State variants
<button className="opacity-100 hover:opacity-75 disabled:opacity-50 focus:ring-2">
```

### Setting Up Tailwind with Vite
```bash
npm install -D tailwindcss @tailwindcss/vite
```
```javascript
// vite.config.js
import tailwindcss from '@tailwindcss/vite'
export default { plugins: [tailwindcss()] }
```
```css
/* index.css */
@import "tailwindcss";
```

### Dynamic Classes — The Critical Gotcha
```jsx
// ❌ WRONG — Tailwind's build scanner can't see this
const color = 'indigo'
<div className={`bg-${color}-600`}>  // 'bg-indigo-600' never appears as a string

// ✅ CORRECT — full class names must appear as literal strings
const classes = { primary: 'bg-indigo-600', danger: 'bg-red-600' }
<div className={classes[variant]}>
```
Tailwind works by scanning your source files for class name strings and including only used classes in the build. Dynamic string construction defeats this scanner.

### Tailwind + clsx Together (Production Pattern)
```jsx
import clsx from 'clsx'

const variantClasses = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  danger:  'bg-red-600 hover:bg-red-700 text-white',
  ghost:   'border border-gray-300 hover:bg-gray-100',
}

function Button({ variant = 'primary', disabled, children }) {
  return (
    <button className={clsx(
      'px-4 py-2 rounded-lg font-semibold transition',  // always-on
      variantClasses[variant],                           // variant
      disabled && 'opacity-50 cursor-not-allowed',       // conditional
    )}>
      {children}
    </button>
  )
}
```

---

## 4. `clsx` — What We Built in Phase 12

### The Problem It Solves
```jsx
// Without clsx — verbose and leaves trailing spaces / empty strings:
className={`task-card task-card-${status} ${isSelected ? 'task-card-selected' : ''} ${isDragging ? 'task-card-dragging' : ''}`}
// Produces: "task-card task-card-done  " (extra spaces when conditions are false)

// With clsx — clean, readable, no empty strings:
className={clsx(
  'task-card',
  `task-card-${status}`,
  isSelected  && 'task-card-selected',
  isDragging  && 'task-card-dragging',
)}
// Produces: "task-card task-card-done" (only truthy classes included)
```

### All Four Usage Patterns
```javascript
import clsx from 'clsx'

// 1. String arguments — always included
clsx('foo', 'bar')                    // → "foo bar"

// 2. Conditional with &&  — included when truthy
clsx('btn', isActive && 'btn-active') // → "btn btn-active" OR "btn"

// 3. Object syntax — { 'class': boolean }
clsx('btn', { 'btn-active': isActive, 'btn-disabled': disabled })
// → "btn btn-active" or "btn btn-disabled" or "btn btn-active btn-disabled"

// 4. Ternary — explicit either/or
clsx('btn', isActive ? 'btn-active' : 'btn-inactive')

// 5. Arrays — flattened
clsx(['btn', isActive && 'btn-active'])

// 6. Mixed — all patterns together
clsx(
  'btn',
  variant === 'primary' ? 'btn-primary' : 'btn-secondary',
  { 'btn-loading': isLoading, 'btn-disabled': disabled },
  extraClassName,    // pass-through className prop from parent
)
```

### What We Applied in the Project

**[`TaskCard.jsx`](../task-dashboard/src/components/TaskCard.jsx) — string pattern:**
```jsx
// Before:
className={`task-card task-card-${status}`}

// After:
className={clsx('task-card', `task-card-${status}`)}
```

**[`FilterBar.jsx`](../task-dashboard/src/components/FilterBar.jsx) — object syntax:**
```jsx
// Before:
className={`filter-btn ${activeFilter === filter.value ? 'filter-btn-active' : ''}`}

// After:
className={clsx('filter-btn', { 'filter-btn-active': activeFilter === filter.value })}
```

### `clsx` vs `classnames`
Both have identical APIs. `clsx` is smaller (~200 bytes vs ~400 bytes) and tree-shakeable. Use `clsx` for new projects. They are interchangeable in interviews — either is acceptable.

---

## 5. CSS Custom Properties — Our Theming System

We already use this deeply (Phase 7 theming). Summary for revision:

```css
/* Define on :root — available everywhere */
:root {
  --color-primary: #6366f1;
  --color-bg: #0f1117;
  --radius: 10px;
}

/* Override for a theme variant */
[data-theme="light"] {
  --color-primary: #4f46e5;
  --color-bg: #f8fafc;
}

/* Use anywhere in CSS */
.button { background: var(--color-primary); }
.card   { border-radius: var(--radius); }
```

**Why CSS custom properties beat Sass/Less variables:**
- Sass/Less variables are compile-time → one value baked in at build
- CSS custom properties are runtime → can change via JavaScript:
  ```javascript
  document.documentElement.style.setProperty('--color-primary', '#ff0000')
  ```
- This is why theming, dark mode, and user-customisable themes all use CSS custom properties

**Interview question:** "How does your dark mode work?"  
**Answer:** The theme is stored as a string in React state (`'dark'` / `'light'`). A `useEffect` writes `document.documentElement.setAttribute('data-theme', theme)`. CSS selectors `[data-theme="dark"]` and `[data-theme="light"]` define different values for CSS custom properties. All component styles use `var(--color-bg)` etc. — so changing the attribute changes all colours simultaneously, with no JS-driven style changes at the component level.

---

## 6. CSS-in-JS — Know For Interviews, Don't Build New Projects With It

### What It Is
Libraries like `styled-components` and `Emotion` let you write CSS inside JavaScript:

```javascript
// styled-components
import styled from 'styled-components'

const Button = styled.button`
  background: ${props => props.variant === 'primary' ? '#6366f1' : 'transparent'};
  padding: 0.5rem 1rem;
  border-radius: 6px;
  color: white;
  cursor: pointer;

  &:hover { opacity: 0.85; }
`

// Usage:
<Button variant="primary">Click me</Button>
```

### Why It Became Popular
- True component-scoped styles (no class name leaks)
- JavaScript-driven dynamic styles (props flow directly into CSS)
- Automatic vendor prefixing
- Co-location of styles and components

### Why It's Declining
- **Runtime cost:** styled-components generates CSS class names at runtime → extra JavaScript execution and style injection on every render
- **SSR complexity:** Server-side rendering requires extracting critical CSS, adding configuration overhead
- **Tailwind dominance:** Tailwind solves scoping at build time with zero runtime cost
- **React Server Components (2023+):** CSS-in-JS libraries that use React context don't work in Server Components without workarounds

**The interview answer:**  
> "CSS-in-JS was popular circa 2018-2022 for its component scoping and dynamic styles. The industry has largely moved to Tailwind CSS for new projects due to zero runtime overhead and better RSC compatibility. I know styled-components and Emotion conceptually, but would choose Tailwind for new work."

---

## 7. The Component Variant Pattern

This is already demonstrated throughout our app but worth naming formally. It's one of the most common interview questions on styling:

### Pattern 1 — BEM-style modifier classes (what we use)
```jsx
// Base class + modifier class
<button className="btn btn-primary">Primary</button>
<button className="btn btn-danger">Danger</button>
<button className="btn btn-reset">Reset</button>
```
```css
.btn { padding: 0.55rem 1.1rem; border-radius: 6px; }  /* base */
.btn-primary { background: var(--color-primary); color: white; }  /* modifier */
.btn-danger  { background: rgba(239,68,68,0.15); color: var(--color-danger); }
```

### Pattern 2 — Lookup object (Tailwind production pattern)
```jsx
const variantStyles = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  danger:  'bg-red-50 text-red-600 border border-red-200',
  ghost:   'border border-gray-300 text-gray-700 hover:bg-gray-50',
}

function Button({ variant = 'primary', children, ...props }) {
  return (
    <button
      className={clsx(
        'px-4 py-2 rounded-lg font-semibold text-sm transition',
        variantStyles[variant],
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

### Pattern 3 — CVA (Class Variance Authority) — Modern library
```javascript
import { cva } from 'class-variance-authority'

const button = cva(
  'px-4 py-2 rounded-lg font-semibold',  // base
  {
    variants: {
      intent: {
        primary: 'bg-indigo-600 text-white',
        danger:  'bg-red-600 text-white',
        ghost:   'border border-gray-300',
      },
      size: {
        sm: 'text-sm px-3 py-1',
        lg: 'text-lg px-6 py-3',
      },
    },
    defaultVariants: { intent: 'primary', size: 'sm' },
  }
)

<button className={button({ intent: 'danger', size: 'lg' })}>Delete</button>
```
CVA is increasingly popular in component libraries (Shadcn/UI uses it). Worth knowing the concept even if you haven't used it.

---

## 8. Interview Q&A

**Q: What is the difference between CSS Modules and plain CSS?**  
A: Plain CSS has global scope — a class named `.title` in one file affects every element with `className="title"` across the app. CSS Modules auto-scope every class to the component that imports the file by transforming `.title` to `ComponentName_title__hash` at build time. You write the same CSS, but class names are guaranteed unique per component.

**Q: Why would you choose Tailwind over CSS Modules?**  
A: Tailwind eliminates the context-switching between JSX and CSS files. With Tailwind, styles are co-located with markup — you see the full appearance of a component in one file. It also has a built-in design system (spacing scale, colour palette, breakpoints) that enforces visual consistency. The trade-off is verbose classNames that can be hard to read. CSS Modules are better when you prefer separated concerns or need complex CSS features like animations.

**Q: What problem does `clsx` solve?**  
A: Conditional class names with template literals produce messy output — empty strings when conditions are false, and hard-to-read expressions with multiple ternaries. `clsx` accepts strings, objects `{ 'class': boolean }`, and falsy values it silently ignores, producing a clean joined string of only the active classes. It's especially valuable when a component has many conditional states (selected, disabled, loading, error).

**Q: Why is CSS-in-JS declining?**  
A: Three reasons. First, runtime overhead — libraries like styled-components inject styles into the DOM via JavaScript, adding execution cost on every render. Second, React Server Components (Next.js App Router) run on the server without a browser context, making runtime style injection impossible. Third, Tailwind achieves the same goals (scoping, dynamic variants) with zero runtime cost via build-time class generation.

**Q: How does dark mode work in your app?**  
A: ThemeContext stores the current theme string in React state. A `useEffect` syncs it to `document.documentElement.setAttribute('data-theme', theme)` and saves it to localStorage. In CSS, `[data-theme="dark"]` and `[data-theme="light"]` selectors redefine CSS custom properties (like `--color-bg`, `--color-primary`). All component styles use `var(--color-bg)` etc. — so swapping the attribute changes every colour at once. No inline styles, no JavaScript per component.

---

## 9. Revision Cheat Sheet

```
CSS Modules:
  File: Component.module.css
  Import: import styles from './Component.module.css'
  Usage: className={styles.card}
  Scoping: Build-time → ComponentName_card__hash
  Zero runtime cost

Tailwind:
  Utility-first → compose styles from single-purpose classes
  Dynamic: use full class strings in objects, not string interpolation
  clsx + tailwind = the production standard
  Setup (Vite): npm i -D tailwindcss @tailwindcss/vite

clsx usage patterns:
  clsx('base', 'always')                     → strings
  clsx('base', isActive && 'active')         → conditional &&
  clsx('base', { 'active': isActive })       → object syntax
  clsx('a', condition ? 'b' : 'c')           → ternary
  Falsy values (false, null, undefined) → ignored

CSS custom properties:
  Define: --color-primary: #6366f1  (on :root or [data-theme])
  Use:    color: var(--color-primary)
  Override at runtime: el.style.setProperty('--color-primary', '#ff0000')
  Powers: theming, dark mode, design tokens

CSS-in-JS (know for interviews, avoid for new projects):
  styled-components / Emotion
  ❌ Runtime cost (style injection per render)
  ❌ Incompatible with React Server Components
  ✅ Dynamic styles, co-location, scoping
  Verdict: replaced by Tailwind for most new projects

Component variant pattern:
  BEM modifiers: className="btn btn-primary"
  Lookup object: const variants = { primary: 'classes...' }
  CVA: cva('base', { variants: { ... } })
```

---

## 10. Key Takeaways

1. **CSS Modules = build-time scoping** — same CSS, unique class names per component
2. **Tailwind = utility-first** — no CSS files; styles in className; design system built-in
3. **`clsx` = conditional classNames** — clean, no trailing empty strings, readable
4. **CSS custom properties = runtime theming** — change at runtime via JS, cascade naturally
5. **CSS-in-JS is declining** — runtime cost + RSC incompatibility; Tailwind dominates new projects
6. **Component variants need a system** — lookup objects or CVA, not scattered ternaries
7. **The critical Tailwind gotcha** — never build class strings dynamically; scanner needs full strings
8. **All approaches can coexist** — CSS Modules + CSS custom properties + clsx is a valid production stack

---

*Notes: Phase 12 — Styling*  
*Next Phase: Phase 13 — Error Boundaries, Code Splitting, Lazy Loading, Suspense*
