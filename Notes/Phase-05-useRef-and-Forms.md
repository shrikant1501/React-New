# Phase 05 — useRef, Forms, and Controlled vs Uncontrolled Components
### The Mutable Box, DOM Access, and Production-Quality Form Patterns

---

> 📌 **How to use this document**
> Read top to bottom the first time. For quick revision jump to §21 (Cheat Sheet).
> For interview prep, §19 and §20 — `useRef` questions are common because
> the concept is often misunderstood.

---

## Table of Contents

1. [Topic Overview](#1-topic-overview)
2. [Controlled Components — React Owns the Value](#2-controlled-components--react-owns-the-value)
3. [Uncontrolled Components — The DOM Owns the Value](#3-uncontrolled-components--the-dom-owns-the-value)
4. [Controlled vs Uncontrolled — Full Comparison](#4-controlled-vs-uncontrolled--full-comparison)
5. [useRef — The Mutable Box](#5-useref--the-mutable-box)
6. [How useRef Works in Fiber](#6-how-useref-works-in-fiber)
7. [The Three Use Cases of useRef](#7-the-three-use-cases-of-useref)
8. [useRef vs useState — Choosing the Right Tool](#8-useref-vs-usestate--choosing-the-right-tool)
9. [The ref Prop on DOM Elements](#9-the-ref-prop-on-dom-elements)
10. [Form Validation Patterns](#10-form-validation-patterns)
11. [The usePrevious Pattern](#11-the-useprevious-pattern)
12. [Accessibility in Forms](#12-accessibility-in-forms)
13. [Important Terminology](#13-important-terminology)
14. [Best Practices](#14-best-practices)
15. [Common Mistakes](#15-common-mistakes)
16. [Performance Considerations](#16-performance-considerations)
17. [Advantages and Limitations](#17-advantages-and-limitations)
18. [Project Implementation Summary](#18-project-implementation-summary)
19. [Frequently Asked Interview Questions](#19-frequently-asked-interview-questions)
20. [Tricky Interview Questions](#20-tricky-interview-questions)
21. [Revision Cheat Sheet](#21-revision-cheat-sheet)
22. [Key Takeaways](#22-key-takeaways)
23. [Understanding Checklist](#23-understanding-checklist)

---

## 1. Topic Overview

This phase covers two deeply related topics:

**1. Controlled vs Uncontrolled Components** — two different mental models for
who owns the truth about a form field's current value. Controlled = React state.
Uncontrolled = the browser DOM.

**2. `useRef`** — a hook that creates a mutable container that persists across
renders without ever triggering one. It has three distinct use cases: DOM access,
storing values without re-rendering, and solving stale closure problems.

These topics connect because `useRef` is what makes uncontrolled components
work (`ref={myRef}` reads the DOM value), and it's also used alongside controlled
components for DOM operations like focus, scroll, and measurement.

---

## 2. Controlled Components — React Owns the Value

A controlled component is a form input whose **value is always driven by React
state**. Every change the user makes is immediately captured in state through
an `onChange` handler.

```jsx
function ControlledInput() {
  const [value, setValue] = useState('')

  return (
    <input
      value={value}                           // state → display
      onChange={e => setValue(e.target.value)} // change → state
    />
  )
}
```

### The Data Flow

```
User presses 'R':
  1. Browser fires onChange event
  2. e.target.value = 'R'
  3. setValue('R') called
  4. React schedules re-render
  5. Component renders: <input value="R" />
  6. Browser updates the displayed character

Without step 3+4+5: the input REVERTS to '' (its controlled value)
This is why controlled inputs with value but no onChange are read-only!
```

### Why React Overrides What You Type

The `value` prop creates a **contract**: "this input's displayed value will
always be exactly `value`." If you provide `value` but no `onChange`, React
keeps resetting the input to the controlled value — so typing appears to do
nothing. This is intentional and is React enforcing the contract.

```jsx
// Read-only controlled input — intentional pattern:
<input value={fixedValue} onChange={() => {}} readOnly />

// Or simply:
<input value={fixedValue} readOnly />
```

---

## 3. Uncontrolled Components — The DOM Owns the Value

An uncontrolled input lets the browser manage its value naturally, exactly as
it would in plain HTML. React doesn't track the value between keystrokes.

```jsx
function UncontrolledForm() {
  const inputRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    // Read the value from the DOM when needed (on submit)
    console.log(inputRef.current.value)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        defaultValue="Initial text"   // sets starting value once — not reactive
        type="text"
      />
      <button type="submit">Submit</button>
    </form>
  )
}
```

### `defaultValue` vs `value`

| | `value` | `defaultValue` |
|---|---|---|
| Makes input | Controlled (React owns it) | Uncontrolled (DOM owns it) |
| Updates when changed | Yes — re-render required | No — DOM updates naturally |
| React tracks? | Yes | No |
| Use with | `onChange` handler | `ref` to read on demand |

The same pattern applies to:
- `<select>` → `value` (controlled) vs `defaultValue` (uncontrolled)
- `<textarea>` → `value` (controlled) vs `defaultValue` (uncontrolled)
- `<input type="checkbox">` → `checked` (controlled) vs `defaultChecked` (uncontrolled)

### File Inputs Are Always Uncontrolled

`<input type="file">` is always uncontrolled — you can never programmatically
set its value (browser security restriction). Read files using `ref.current.files`.

```jsx
const fileRef = useRef(null)

function handleSubmit(e) {
  e.preventDefault()
  const file = fileRef.current.files[0]
  // process file
}

return <input type="file" ref={fileRef} />
// No 'value' prop possible here — always uncontrolled
```

---

## 4. Controlled vs Uncontrolled — Full Comparison

| Feature | Controlled | Uncontrolled |
|---|---|---|
| Source of truth | React state | Browser DOM |
| Value access | `stateVariable` (always available) | `ref.current.value` (pull on demand) |
| Real-time validation | ✅ Straightforward — validate in onChange | ❌ Must read DOM each time |
| Instant feedback | ✅ Character count, password strength | ❌ Not easily possible |
| Programmatic reset | ✅ `setState('')` | ⚠️ `ref.current.value = ''` (imperative) |
| Pre-populate fields | ✅ Set initial state | ⚠️ `defaultValue` only (one-time) |
| DevTools visibility | ✅ State visible in React DevTools | ❌ Only in browser DOM inspector |
| Performance | ⚠️ Re-render per keystroke | ✅ No re-renders while typing |
| Boilerplate | More per field | Less per field |
| Library support | ✅ All form libraries (RHF, Formik) | Limited |
| Industry default | **✅ Recommended** | Edge cases only |

### When to Use Each

```
Use CONTROLLED when:
  ✦ You need real-time validation (show errors while typing)
  ✦ You need to conditionally enable/disable the submit button
  ✦ You need to instantly respond to input (search, filter, character count)
  ✦ You need to programmatically set/reset the value
  ✦ Using a form library (React Hook Form, Formik)

Use UNCONTROLLED when:
  ✦ File inputs (always)
  ✦ Very large forms where per-keystroke re-renders are measurably slow
  ✦ Integrating with a non-React DOM library that manipulates the input
  ✦ Simple, read-on-submit forms with no validation
```

---

## 5. useRef — The Mutable Box

`useRef(initialValue)` returns a plain JavaScript object: `{ current: initialValue }`.

This object has two special properties:
1. **It persists** across renders — the same object is returned every time
2. **Mutating `.current` never triggers a re-render**

```jsx
const ref = useRef(0)   // { current: 0 }

// Across render 1, 2, 3... the SAME object is returned each time
// (same reference in memory)

ref.current = 5    // mutation — React doesn't know, doesn't care, doesn't re-render
ref.current++      // still no re-render
console.log(ref.current)  // 6 — persists correctly
```

### The Three Analogies

**Analogy 1 — A whiteboard in a room**:
State is like a whiteboard that triggers a full meeting every time you write
on it. A ref is like a sticky note on the whiteboard — you can write on it
without calling a meeting. The note is still there next meeting.

**Analogy 2 — Instance variable in a class**:
Before hooks, class components had instance variables (`this.timerID = 5`) that
persisted without triggering render. `useRef` is the functional component
equivalent of an instance variable.

**Analogy 3 — A box**:
`useState` gives you a box where changing the contents rings a bell (re-render).
`useRef` gives you a box where you can change the contents silently.

---

## 6. How useRef Works in Fiber

Like all hooks, `useRef` stores its data in the Fiber node's `memoizedState`
linked list:

```javascript
// On first render (mount):
useRef(initialValue)
→ Creates: { current: initialValue } in Fiber's memoizedState
→ Returns this object

// On every subsequent render:
useRef(initialValue)   // initialValue is IGNORED after mount
→ Returns the SAME object that was created on mount
```

The key: React returns the **same object reference** on every render. When you
do `ref.current = newValue`, you are mutating the object's property. The object
reference itself never changes, so React has no mechanism to detect or respond
to this mutation. This is by design.

```
Render 1: const ref = useRef(0)   → ref = { current: 0 }  (object at 0x1234)
Render 2: const ref = useRef(0)   → ref = { current: 0 }  (SAME object at 0x1234)
Render 3: const ref = useRef(0)   → ref = { current: 0 }  (SAME object at 0x1234)

ref.current = 5  (on render 2)
Render 3: ref.current is 5  (mutation persisted, no re-render triggered)
```

---

## 7. The Three Use Cases of useRef

### Use Case 1: Accessing a DOM Node

The most common use case. Place `ref={myRef}` on any JSX element, and React
populates `myRef.current` with the actual DOM node after mount.

```jsx
function SearchInput() {
  const inputRef = useRef(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current.focus()
  }, [])

  // Expose a focus method to a parent (via useImperativeHandle — Phase 9)
  function clear() {
    inputRef.current.value = ''    // directly manipulate DOM (uncontrolled)
    inputRef.current.focus()
  }

  return <input ref={inputRef} type="search" />
}
```

**Available DOM operations via ref:**
```javascript
ref.current.focus()                          // focus the element
ref.current.blur()                           // remove focus
ref.current.scrollIntoView()                 // scroll to element
ref.current.getBoundingClientRect()          // get position/size
ref.current.play() / .pause()               // for <video>/<audio>
ref.current.click()                          // programmatic click
ref.current.select()                         // select all text in input
```

### Use Case 2: Storing Mutable Values Without Re-rendering

When you need to track a value across renders but the value should NOT trigger
a re-render when it changes.

```jsx
function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef(null)   // stores timer ID — NOT part of UI

  function startPlayback() {
    setIsPlaying(true)
    intervalRef.current = setInterval(advanceFrame, 33)
    // Using useState here would cause a re-render, resetting the timer logic
  }

  function stopPlayback() {
    setIsPlaying(false)
    clearInterval(intervalRef.current)
  }

  return (
    <button onClick={isPlaying ? stopPlayback : startPlayback}>
      {isPlaying ? 'Stop' : 'Play'}
    </button>
  )
}
```

**Other values commonly stored in refs:**
- Timer IDs (`setInterval`, `setTimeout`)
- WebSocket instances
- Previous values (see `usePrevious` pattern)
- Render count tracking (for debugging)
- Whether the component is mounted (to prevent state updates after unmount)

### Use Case 3: Solving Stale Closures in useEffect

When an effect closes over a value that changes but you don't want to add it
to the deps array (to avoid re-running the effect on every change).

```jsx
function Component() {
  const [count, setCount] = useState(0)

  // Keep a ref in sync with count — no extra renders, no stale closures
  const countRef = useRef(count)
  countRef.current = count    // synchronous update during render — safe

  useEffect(() => {
    const id = setInterval(() => {
      // countRef.current is always current — no stale closure
      console.log('Current count:', countRef.current)
      // Note: we still use functional update for setCount to be safe
      setCount(c => c + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])   // [] is correct — we don't need count in deps because we use countRef
}
```

---

## 8. useRef vs useState — Choosing the Right Tool

```
Does the UI need to visually update when this value changes?
    │
    YES → useState
    │     (changing it → re-render → new JSX → DOM update)
    │
    NO  → useRef
          (changing it → no re-render → no DOM update)
```

### The Four Quadrants

| | Changes trigger re-render | Persists across renders |
|---|---|---|
| **`useState`** | ✅ Yes | ✅ Yes |
| **`useRef`** | ❌ No | ✅ Yes |
| **Local variable (let)** | ❌ No | ❌ No (resets each render) |
| **Module-level variable** | ❌ No | ✅ Yes (but shared across all instances!) |

```jsx
// useState — visible in UI, triggers re-render:
const [count, setCount] = useState(0)
return <p>{count}</p>   // must show count → useState

// useRef — invisible in UI, no re-render:
const timerRef = useRef(null)   // stores timer ID → useRef

// Local variable — resets every render:
let temp = computeValue()   // fine for temporary within-render calculations

// Module-level variable — shared across ALL instances of the component!
let globalCounter = 0   // dangerous for per-instance data
```

---

## 9. The ref Prop on DOM Elements

When `ref={myRef}` is placed on a JSX element, React manages the lifecycle:

```
Mount:   React sets myRef.current = DOM node
Update:  myRef.current remains the same DOM node (unless element type changes)
Unmount: React sets myRef.current = null
```

### Conditional refs

```jsx
// Ref on a conditional element:
{isVisible && <input ref={inputRef} />}

// When isVisible becomes false: element unmounts → inputRef.current = null
// When isVisible becomes true: element mounts → inputRef.current = DOM node
// Always check for null before using: inputRef.current?.focus()
```

### Callback Refs — An Alternative Pattern

Instead of passing a ref object, you can pass a function:

```jsx
<div ref={(node) => {
  // Called with the DOM node on mount, null on unmount
  if (node) {
    node.scrollIntoView()   // runs when element mounts
  }
}} />
```

Useful when you need to react to a ref attaching/detaching, or when you need
to track multiple elements (use an array or Map instead of a single ref).

---

## 10. Form Validation Patterns

### The Four Stages of Form Validation UX

```
Stage 1: User hasn't touched the field yet
  → Show NO errors (don't punish before they've tried)

Stage 2: User is actively typing
  → Show character count, live feedback
  → Show errors only if previously validated (re-entry)

Stage 3: User leaves the field (onBlur)
  → Mark field as "touched"
  → NOW show errors if the current value is invalid

Stage 4: User tries to submit
  → Mark ALL fields as touched
  → Show all errors simultaneously
  → Prevent submission if any errors exist
```

### The Touched Pattern (Implemented in our hook)

```jsx
const [touched, setTouched] = useState({})

// Mark as touched when user leaves the field:
<input onBlur={() => setTouched(prev => ({ ...prev, title: true }))} />

// Show error only for touched fields:
{touched.title && errors.title && (
  <span className="error">{errors.title}</span>
)}
```

### Validation Rule Patterns

```javascript
// Validator: takes value (and optionally all values), returns error string or null
const validators = {
  email: (value) => {
    if (!value)           return 'Email is required'
    if (!/\S+@\S+\.\S+/.test(value)) return 'Invalid email format'
    return null
  },

  password: (value) => {
    if (!value)           return 'Password is required'
    if (value.length < 8) return 'Must be at least 8 characters'
    return null
  },

  confirmPassword: (value, allValues) => {
    // allValues gives access to other fields for cross-field validation
    if (value !== allValues.password) return 'Passwords do not match'
    return null
  }
}
```

---

## 11. The usePrevious Pattern

A classic `useRef` pattern — tracking the value from the previous render:

```jsx
function usePrevious(value) {
  const ref = useRef(undefined)

  useEffect(() => {
    ref.current = value   // runs AFTER render — stores current as "previous" for next time
  })
  // No deps array = runs after every render

  return ref.current   // returns value from BEFORE this render (last stored value)
}
```

**The execution sequence:**

```
Render N (count=5):
  1. usePrevious(5) called
  2. Returns ref.current (which is 3 from render N-1)
  3. Component renders, UI shows: current=5, previous=3
  4. useEffect fires: ref.current = 5

Render N+1 (count=8):
  1. usePrevious(8) called
  2. Returns ref.current (which is 5 from render N)
  3. Component renders, UI shows: current=8, previous=5
  4. useEffect fires: ref.current = 8
```

**Why not useState for this?**
Calling `setState(value)` inside `useEffect` to "remember" the previous value
would trigger ANOTHER re-render, which would trigger the effect again —
infinite loop. `useRef` mutates silently — no extra renders.

---

## 12. Accessibility in Forms

Production forms must be accessible. Key requirements:

```jsx
// 1. Associate label with input via id/htmlFor:
<label htmlFor="task-title">Title</label>
<input id="task-title" ... />
// Screen reader: "Title, edit text"

// 2. Mark required fields:
<label htmlFor="title">Title <span aria-hidden="true">*</span></label>
<input id="title" required aria-required="true" ... />

// 3. Link error messages to their input:
<input
  id="title"
  aria-describedby={errors.title ? 'title-error' : undefined}
  aria-invalid={!!errors.title}
/>
<span id="title-error" role="alert">
  {errors.title}
</span>
// role="alert": announces error immediately when it appears
// aria-describedby: screen reader reads both the label AND the error

// 4. Describe the form's purpose:
<form aria-label="Add new task" ...>
```

---

## 13. Important Terminology

| Term | Definition |
|---|---|
| **Controlled component** | Form input whose value is driven by React state via `value` + `onChange`. |
| **Uncontrolled component** | Form input whose value is managed by the DOM, read via `ref.current.value`. |
| **`useRef`** | Hook returning a mutable `{ current }` object that persists across renders without triggering re-renders. |
| **`ref` prop** | Special JSX attribute that populates `ref.current` with the actual DOM node after mount. |
| **`defaultValue`** | Initial value for an uncontrolled input. Used once — React doesn't track subsequent changes. |
| **Mutable** | Can be changed after creation. `ref.current` is mutable; state must be replaced, not mutated. |
| **Focus management** | Programmatically setting which element has keyboard focus — important for accessibility and UX. |
| **Touched** | A form field that the user has interacted with (clicked into and left). Used to decide when to show errors. |
| **Validation** | Checking that input values meet required constraints before processing. |
| **`usePrevious`** | Custom hook using `useRef` + `useEffect` to return the value from the previous render. |
| **`onBlur`** | Event that fires when an element loses focus. Used to mark form fields as touched. |
| **`noValidate`** | Form attribute that disables the browser's built-in validation UI, allowing custom validation. |
| **`aria-describedby`** | Accessibility attribute linking an input to its error message element. |
| **`role="alert"`** | Accessibility role that causes screen readers to immediately announce the element's content. |
| **Callback ref** | A function passed as the `ref` prop instead of a ref object. Called with the DOM node on mount and null on unmount. |

---

## 14. Best Practices

1. **Default to controlled inputs** — they keep React as the single source of truth:
   ```jsx
   <input value={value} onChange={e => setValue(e.target.value)} />
   ```

2. **Use `defaultValue` only for truly uncontrolled scenarios** — don't mix
   `value` and `defaultValue` on the same input.

3. **Always initialise refs with `null` when expecting a DOM node:**
   ```jsx
   const ref = useRef(null)   // ✅ clear intent: will hold a DOM node
   ```

4. **Use optional chaining when accessing DOM refs:**
   ```jsx
   ref.current?.focus()   // safe if ref is null (conditional render, etc.)
   ```

5. **Never read `ref.current` during render to drive UI** — it's not reactive:
   ```jsx
   // ❌ Won't update UI when ref.current changes:
   return <p>{ref.current}</p>
   // ✅ Use useState for values that drive UI
   ```

6. **Don't use refs to bypass controlled input patterns** — resist the urge to
   directly set `inputRef.current.value` when you have a controlled input.
   Update the state instead and let React sync the DOM.

7. **Extract form validation into custom hooks or dedicated files** — keeps
   component files focused on UI structure.

8. **Show errors progressively** — only after a field is touched or after first
   submit attempt. Immediate error display on untouched fields is poor UX.

9. **Always provide `label` elements** for form inputs for accessibility:
   ```jsx
   <label htmlFor="email">Email</label>
   <input id="email" ... />
   ```

---

## 15. Common Mistakes

| Mistake | What Goes Wrong | Fix |
|---|---|---|
| `value` without `onChange` | Input becomes read-only — user can't type | Add `onChange` or use `defaultValue` |
| Using `ref.current` in JSX to drive UI | Not reactive — UI won't update when ref changes | Use `useState` for displayed values |
| Not nullchecking: `ref.current.focus()` | Crashes if element is conditionally rendered and currently unmounted | Use `ref.current?.focus()` |
| Mixing `value` and `defaultValue` | Undefined behaviour | Use only one per input |
| Calling `focus()` in render (not in `useEffect`) | Side effect in render — violates purity | Move to `useEffect(() => { ref.current.focus() }, [])` |
| Showing errors before user interacts | Overwhelming/confusing UX | Use "touched" pattern — show errors only after `onBlur` |
| Forgetting `e.preventDefault()` | Form causes full page reload, losing React state | Always call in `onSubmit` handler |
| `useRef` for every value to "avoid re-renders" | Hidden bugs — UI never updates | Only use `useRef` when you genuinely don't need UI updates |
| Direct DOM mutation on controlled input | Creates inconsistency between state and DOM | Always update state; let React sync the DOM |

---

## 16. Performance Considerations

### Controlled Inputs Re-render Per Keystroke

Each character typed calls `onChange` → `setState` → re-render. For a single
input this is negligible. For a large form with many connected components,
it can become noticeable.

**Solutions:**
- **Localise state** — form field state inside the form component only
- **Debounce with `useRef`** — use a ref-held timer to batch updates
- **React Hook Form (Phase 11)** — uses uncontrolled inputs with refs internally
  for near-zero re-renders while still providing full validation

### useRef Is Zero-Cost for React

Mutating `ref.current` causes absolutely no React work. No re-render scheduled,
no reconciliation triggered, no Virtual DOM diff computed. It is the cheapest
possible way to store a changing value across renders.

```jsx
// This causes zero React overhead — perfect for high-frequency updates:
const frameCountRef = useRef(0)
requestAnimationFrame(() => {
  frameCountRef.current++   // 60 times per second — no re-renders
})
```

---

## 17. Advantages and Limitations

### Controlled Components
**Advantages**: Single source of truth, real-time validation, full React control,
testable, works with DevTools  
**Limitations**: More boilerplate per field, re-renders per keystroke

### Uncontrolled Components
**Advantages**: Less boilerplate, no re-renders while typing, necessary for file inputs  
**Limitations**: No real-time validation easily, not visible in React DevTools, harder to test

### useRef
**Advantages**: Zero re-render cost, persists across renders, direct DOM access  
**Limitations**: Changes are not reactive — UI won't update when ref changes,
not visible in React DevTools, can lead to bugs if overused to bypass React's
rendering model

---

## 18. Project Implementation Summary

### What We Built in Phase 5

**New files:**
```
src/hooks/
├── usePrevious.js        — classic useRef pattern: previous render's value
└── useFormValidation.js  — custom hook: values + touched + errors + submit

src/components/
└── TaskCountDisplay.jsx  — uses usePrevious to show count + delta animation
```

**Updated files:**
- `src/components/AddTaskForm.jsx` — full rewrite: useRef for focus, useFormValidation,
  character count, touched-aware error messages, accessibility attributes
- `src/components/Section.jsx` — uses TaskCountDisplay instead of plain count badge

### Key Code Patterns

```jsx
// 1. useRef for DOM focus:
const inputRef = useRef(null)
useEffect(() => { inputRef.current?.focus() }, [])
<input ref={inputRef} value={...} onChange={...} />
// ref + controlled = valid. ref for DOM ops, value/onChange for React control.

// 2. usePrevious pattern:
function usePrevious(value) {
  const ref = useRef(undefined)
  useEffect(() => { ref.current = value })  // store AFTER render
  return ref.current  // return BEFORE-render value
}

// 3. Touched-aware validation:
const [touched, setTouched] = useState({})
<input
  onBlur={() => setTouched(p => ({ ...p, title: true }))}
  aria-describedby={errors.title ? 'title-error' : undefined}
/>
{touched.title && errors.title && (
  <span id="title-error" role="alert">{errors.title}</span>
)}

// 4. Derived errors from validation rules (not stored state):
const errors = Object.keys(rules).reduce((acc, field) => {
  const err = rules[field](values[field], values)
  if (err) acc[field] = err
  return acc
}, {})

// 5. Controlled input visual feedback:
<input className={`form-input ${errors.title ? 'form-input-error' : ''}`} />
```

### What the User Experiences

1. **Form mounts** → title input is automatically focused (useRef + useEffect)
2. **User types a title** → character count counts down (controlled input)
3. **User clears the field and clicks away** → error appears "Title is required" (touched + validation)
4. **User types less than 3 chars** → error appears "Must be at least 3 characters"
5. **User adds a task** → count in section header animates with +1 (usePrevious)
6. **User deletes a task** → count animates with -1 (usePrevious)

---

## 19. Frequently Asked Interview Questions

**Q1. What is a controlled component in React?**
> A form input whose value is always driven by React state. The `value` prop
> sets what the input displays, and `onChange` captures user input into state.
> React is always the single source of truth for the input's current value.
> Any change the user makes must go through React state to take effect.

**Q2. What is an uncontrolled component?**
> A form input that manages its own value in the DOM, just like plain HTML.
> React doesn't track the value. You read it when needed using `ref.current.value`.
> Use `defaultValue` to set the initial value. Most suitable for file inputs
> and simple forms where real-time validation isn't needed.

**Q3. What is `useRef` and what does it return?**
> `useRef(initialValue)` returns a plain JavaScript object `{ current: initialValue }`
> that persists for the entire lifetime of the component. The same object is
> returned on every render. Mutating `.current` never triggers a re-render.
> It has two primary uses: accessing a DOM node (via the `ref` prop) and
> storing a mutable value that should not cause re-renders.

**Q4. What is the difference between `useRef` and `useState`?**
> Both persist data across renders. `useState` is for values that drive the UI —
> changing state triggers a re-render. `useRef` is for values that the UI doesn't
> need to react to — mutating `.current` causes no re-render. Use state for
> anything displayed, use ref for internal tracking (timer IDs, previous values,
> DOM nodes, mutable counters).

**Q5. Can you use both `ref` and `value` on the same input?**
> Yes. They serve different purposes. `value` + `onChange` makes the input
> controlled (React owns the value). `ref` gives you the DOM node for imperative
> operations (focus, scroll, measurement). Having both is valid and common.
> Example: auto-focus a controlled input on mount using `ref` in `useEffect`
> while still managing its value through state.

**Q6. What is `defaultValue` and how does it differ from `value`?**
> `defaultValue` sets the initial value of an uncontrolled input — used once
> on mount, React doesn't track it after that. `value` makes the input controlled —
> React enforces this value on every render. Using both on the same input causes
> a React warning and undefined behaviour — choose one model per input.

**Q7. Why is `<input type="file">` always uncontrolled?**
> For browser security reasons, JavaScript cannot programmatically set the
> value of a file input. You can only read it via `ref.current.files`.
> React cannot make it controlled. Always use `ref` to access the selected file.

**Q8. What is the `usePrevious` pattern and why is `useRef` used instead of `useState`?**
> `usePrevious` returns the value from the previous render by storing it in
> a ref after each render with `useEffect`. `useRef` is used because updating
> the stored value must not trigger a re-render — if `useState` were used,
> `setState(newValue)` in `useEffect` would cause another render, which would
> trigger the effect again, causing an infinite loop.

**Q9. What happens if you provide `value` but no `onChange` to a controlled input?**
> The input becomes read-only. React keeps setting its displayed value back
> to `value` on every render. Any typing appears to do nothing because the
> state never changes, so React never updates the display. React also logs a
> warning: "You provided a `value` prop without an `onChange` handler."
> Either add `onChange` or add `readOnly` to make the intent explicit.

**Q10. How do you programmatically focus an input when a component mounts?**
> Create a ref with `const ref = useRef(null)`, attach it to the input with
> `ref={ref}`, then call `ref.current.focus()` inside `useEffect(() => {...}, [])`.
> The `useEffect` with empty deps runs once after mount — at that point
> `ref.current` is populated with the DOM node.

---

## 20. Tricky Interview Questions

**Q1. You set `ref.current = 100` inside a component's render. What problems does this cause?**
> Two problems: (1) The Render Phase may run multiple times (Concurrent Mode,
> StrictMode). Side-effecting render by mutating a ref during render makes the
> render impure — each execution produces different external state.
> (2) The mutation isn't batched with the render — it could be read by a stale
> effect or event handler in an unexpected state.
> Always mutate refs in `useEffect` or event handlers, never in render.

**Q2. What is the difference between `ref.current = value` (in render body)
and `ref.current = value` (in useEffect)?**
> In render: runs during React's Render Phase, which is synchronous and
> potentially interrupted/repeated. Mutating here makes render impure.
> In `useEffect`: runs after the Commit Phase, after the DOM is updated.
> React's team guidance: mutate refs in effects or event handlers only.
> Exception: `countRef.current = count` directly in the function body (not
> inside JSX/conditional) is common and accepted for the "latest ref" pattern —
> it runs synchronously before any effects, reliably reflecting the current value.

**Q3. If you pass `null` as the initial value to `useRef`, what is `ref.current`
before the component mounts?**
> `null`. The ref is initialised to `null` and stays `null` until React attaches
> the DOM node during the Commit Phase (after mount). This is why always using
> `ref.current?.method()` (optional chaining) is important — between when the
> ref is created and when the DOM node is attached, `ref.current` is `null`.

**Q4. Can you conditionally attach a `ref` to different elements?**
```jsx
<div ref={condition ? refA : refB}>
```
> Yes — this is valid JSX. React will attach to whichever element is rendered.
> However, be careful: if `condition` changes, `refA.current` will be set to
> `null` and `refB.current` will be set to the DOM node (and vice versa).
> The cleanup (setting to null) happens automatically.

**Q5. A senior developer says "You should never use an uncontrolled input for
anything that needs validation." Do you agree?**
> Mostly agree with nuance. Real-time validation (show errors while typing)
> is genuinely difficult with uncontrolled inputs. However, submit-time
> validation is perfectly achievable — read `ref.current.value` in the submit
> handler and validate there. Libraries like React Hook Form cleverly use
> uncontrolled inputs internally but expose a controlled-like validation API.
> The correct answer is: prefer controlled for most cases; uncontrolled is
> legitimate for file inputs, performance-critical scenarios, or when using
> a library that handles it for you.

---

## 21. Revision Cheat Sheet

```
useRef AND FORMS — QUICK REFERENCE
══════════════════════════════════════════════════════════

useRef
  const ref = useRef(initialValue)   // returns { current: initialValue }
  • Same object returned every render
  • Mutating .current → NO re-render
  • Use for: DOM nodes, timer IDs, previous values, stale closure fix

ref ON DOM ELEMENTS
  <input ref={myRef} />
  • After mount:   myRef.current = DOM node
  • After unmount: myRef.current = null
  • Always null-check: myRef.current?.focus()

useRef vs useState
  useState → value drives UI → changing triggers re-render
  useRef   → value is private → changing does NOT trigger re-render

CONTROLLED INPUT
  <input value={state} onChange={e => setState(e.target.value)} />
  • React owns the value
  • Real-time validation ✅
  • Programmatic reset ✅
  • Industry default ✅

UNCONTROLLED INPUT
  <input ref={myRef} defaultValue="initial" />
  • DOM owns the value
  • Read on demand: myRef.current.value
  • No real-time validation easily
  • File inputs: ALWAYS uncontrolled

defaultValue vs value
  value         → controlled (React tracks every change)
  defaultValue  → uncontrolled (sets only on mount, DOM takes over)

FORM VALIDATION PATTERN
  1. touched state — track which fields user has interacted with
  2. errors computed — derived from values (NOT separate useState)
  3. onBlur → mark touched → show errors for that field
  4. onSubmit → mark ALL touched → validate → submit if valid

ACCESSIBILITY
  <label htmlFor="id">...</label>
  <input id="id" aria-describedby="err-id" aria-invalid={!!error} />
  <span id="err-id" role="alert">{error}</span>

usePrevious PATTERN
  function usePrevious(value) {
    const ref = useRef(undefined)
    useEffect(() => { ref.current = value })  // store after render
    return ref.current   // return before-render value
  }

══════════════════════════════════════════════════════════
```

---

## 22. Key Takeaways

1. **Controlled = React owns the value** via `value` + `onChange`. React is
   always the single source of truth. This is the industry default.

2. **Uncontrolled = DOM owns the value**, read imperatively via `ref.current.value`.
   Use for file inputs and specific performance/integration scenarios.

3. **`useRef` returns a mutable `{ current }` object** that persists for the
   component's lifetime. Mutating `.current` never triggers a re-render.

4. **`useRef` has three use cases**: DOM node access (via `ref` prop), storing
   mutable values without re-renders (timer IDs, previous values), and solving
   stale closures in effects.

5. **Having `ref` and `value` on the same input is valid** — they serve
   different purposes. `ref` = DOM access, `value/onChange` = React control.

6. **`defaultValue` sets the initial value once** for uncontrolled inputs.
   It is NOT reactive — React won't update the input if `defaultValue` changes.

7. **Form validation UX follows the touched pattern**: show errors only after
   the user has interacted with a field, not immediately on render.

8. **Errors should be derived, not stored in state** — compute them from the
   current values using validation functions. This eliminates synchronisation bugs.

9. **`usePrevious` is a ref + effect pattern** — store the value after render
   (in effect), return it before render (from ref). Using `useState` here would
   cause infinite re-renders.

10. **Accessibility in forms is not optional** — `label`/`htmlFor`, `aria-describedby`,
    `role="alert"`, and `aria-invalid` are production requirements.

---

## 23. Understanding Checklist

Before moving to Phase 6, verify you can answer all of these:

- [ ] I can explain the difference between controlled and uncontrolled components (data flow, source of truth)
- [ ] I know when to use each and can justify the choice
- [ ] I can explain what `useRef` returns and what "mutable" means in this context
- [ ] I can explain why mutating `ref.current` doesn't trigger a re-render (Fiber internals)
- [ ] I can name all three use cases of `useRef` and give an example of each
- [ ] I can explain the difference between `useRef` and `useState` (when to use each)
- [ ] I can explain what happens to `ref.current` on mount and unmount
- [ ] I can explain `defaultValue` vs `value` and why mixing them is wrong
- [ ] I can write the `usePrevious` hook from memory and explain why it uses `useRef` not `useState`
- [ ] I understand the "touched" pattern in form validation — why it exists
- [ ] I can write accessible form markup: label, aria-describedby, role="alert"
- [ ] I have the enhanced form running: auto-focus on load, char count, validation errors on blur, delta animation on task count

---

*Phase 05 Notes — Complete*
*Next: Phase 06 — useMemo, useCallback, and React.memo: Performance Optimisation*
