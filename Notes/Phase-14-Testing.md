# Phase 14 — Testing (Vitest, React Testing Library, renderHook, msw)

> **Status:** ✅ Complete  
> **Tools:** Vitest + @testing-library/react + @testing-library/user-event + @testing-library/jest-dom  
> **Tests written:** 12 tests across 3 files — all passing  
> **Run:** `npm test`

---

## 1. The Testing Philosophy — Test What Users See

**The core principle (Kent C. Dodds):**
> "The more your tests resemble the way your software is used, the more confidence they give you."

```javascript
// ❌ Bad — tests implementation details (how it works internally)
expect(component.state.isLoading).toBe(true)
expect(wrapper.find('button').props().disabled).toBe(true)

// ✅ Good — tests observable behaviour (what users experience)
expect(screen.getByRole('button', { name: /add task/i })).toBeDisabled()
expect(screen.getByRole('alert')).toHaveTextContent('Title is required')
```

Implementation details can change (rename state, refactor internals) without breaking user behaviour. Tests that test implementation details break on refactors — giving false failures. Tests that test behaviour only break when behaviour actually breaks — giving true failures.

---

## 2. Vitest vs Jest

We use **Vitest** — the Vite-native test runner. It reads your `vite.config.js` directly — no separate `jest.config.js`, no Babel config, no transform setup.

| | Vitest | Jest |
|---|---|---|
| **Config** | Inside `vite.config.js` | Separate `jest.config.js` |
| **Speed** | Faster (uses Vite's native ESM) | Slower with Vite (needs transforms) |
| **API** | Identical to Jest (`describe`, `it`, `expect`, `vi.fn()`) | `jest.fn()`, `jest.mock()` |
| **Watch mode** | `vitest` | `jest --watch` |
| **Vite projects** | ✅ Native | ⚠️ Requires extra config |

**For interviews:** Say you know Jest (you do — the API is identical). Mention Vitest as the modern choice for Vite projects. Interviewers are happy with either.

---

## 3. Setup — What Each Piece Does

```javascript
// vite.config.js
test: {
  environment: 'jsdom',          // simulates browser in Node.js
  setupFiles: ['./src/test/setup.js'],  // runs before every test file
  globals: true,                 // no import { describe, it } needed
}

// src/test/setup.js
import '@testing-library/jest-dom'
// Adds: toBeInTheDocument(), toHaveValue(), toBeDisabled(), toHaveClass()...
```

**Why jsdom?** Tests run in Node.js, which has no browser APIs (`document`, `window`, `localStorage`). jsdom is a JavaScript implementation of the browser DOM that runs in Node — giving tests a realistic DOM environment.

---

## 4. The Three Core RTL Exports

```javascript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
```

### `render()`
Mounts a component into a temporary jsdom container:
```javascript
render(<StatusBadge status="done" />)
// Now the component's DOM is queryable via screen.*
```

After each test, RTL automatically cleans up (unmounts, removes DOM). No manual cleanup needed.

### `screen`
The query object — all queries come from here:
```javascript
screen.getByText('Done')                          // by text content
screen.getByRole('button', { name: /submit/i })   // by ARIA role + name
screen.getByLabelText('Email')                    // by label association
screen.getByPlaceholderText('Enter title')        // by placeholder
screen.getByDisplayValue('medium')                // by current value
screen.getByTestId('my-element')                  // by data-testid (last resort)
```

### `waitFor()`
Waits for assertions to pass (polls until timeout):
```javascript
await waitFor(() => {
  expect(screen.getByRole('alert')).toBeInTheDocument()
})
// Retries up to 1000ms — handles async state updates, API responses
```

---

## 5. Query Variants — The Most Important RTL Concept

Every query has three variants with completely different behaviour:

| Variant | Found | Not Found | Multiple |
|---|---|---|---|
| `getBy...` | Returns element | **Throws** immediately | **Throws** |
| `queryBy...` | Returns element | Returns `null` | **Throws** |
| `findBy...` | Returns element (async) | **Throws** after timeout | **Throws** |
| `getAllBy...` | Returns array | **Throws** | Returns array |
| `queryAllBy...` | Returns array | Returns `[]` | Returns array |
| `findAllBy...` | Returns array (async) | **Throws** after timeout | Returns array |

```javascript
// getBy — use when the element MUST exist right now
screen.getByRole('button')          // throws if not found

// queryBy — use when asserting an element does NOT exist
expect(screen.queryByText('Error')).not.toBeInTheDocument()
// ↑ getBy would throw before the expect — queryBy returns null instead

// findBy — use when element appears AFTER an async operation
const btn = await screen.findByRole('button', { name: /submit/i })
// ↑ waits up to 1000ms; equivalent to: await waitFor(() => screen.getByRole(...))
```

**The critical distinction:** Use `queryBy` when testing absence. Use `findBy` when waiting for async appearance.

---

## 6. `userEvent` — Realistic User Simulation

```javascript
import userEvent from '@testing-library/user-event'

const user = userEvent.setup()  // call once per test

// Typing
await user.type(input, 'Hello world')    // types char by char (keydown/input/keyup per char)
await user.clear(input)                  // clears input value
await user.type(input, '{Enter}')        // special keys

// Clicking
await user.click(button)                 // hover + pointerdown + mousedown + click + focus
await user.dblClick(element)

// Form interactions
await user.selectOptions(select, 'high')  // selects option by value/text
await user.tab()                          // Tab key (triggers blur on current, focus on next)

// Keyboard
await user.keyboard('[Space]')
await user.keyboard('{Escape}')
```

**Why `userEvent.setup()` per test?** Each `setup()` creates a fresh interaction state (pointer position, keyboard modifiers). Sharing one instance across tests could cause pointer state to bleed between tests.

**`userEvent` vs `fireEvent`:**
```javascript
// fireEvent — single low-level DOM event (no side effects)
fireEvent.change(input, { target: { value: 'hello' } })

// userEvent — full user gesture sequence
await user.type(input, 'hello')
// fires: focus, keydown('h'), keypress, input, keyup, ... × 5 chars

// Use userEvent for all interactions. fireEvent only when testing specific
// DOM events in isolation or when userEvent is overkill (rare).
```

---

## 7. `vi.fn()` — Mock Functions

```javascript
// Create a mock function
const mockFn = vi.fn()

// With a return value
const mockFn = vi.fn().mockReturnValue(42)
const mockFn = vi.fn().mockResolvedValue({ data: 'ok' })  // async

// With implementation
const mockFn = vi.fn((a, b) => a + b)

// Assertions
expect(mockFn).toHaveBeenCalled()               // was called at least once
expect(mockFn).toHaveBeenCalledOnce()           // called exactly once
expect(mockFn).toHaveBeenCalledWith('arg1', 2)  // called with specific args
expect(mockFn).toHaveBeenCalledTimes(3)         // called exactly N times
expect(mockFn).not.toHaveBeenCalled()           // never called

// Inspect calls
mockFn.mock.calls         // [[arg1, arg2], [arg1, arg2], ...]  — array of call arguments
mockFn.mock.results       // [{ type: 'return', value: ... }, ...]

// Reset between tests
mockFn.mockClear()   // clears call history (not implementation)
mockFn.mockReset()   // clears calls + return values
```

**`expect.objectContaining()`** — partial match for object arguments:
```javascript
// Assert only the fields you care about (ignore others)
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({ title: 'My task', status: 'todo' })
  // ← passes even if the actual object also has { phase: 11, priority: 'medium' }
)
```

---

## 8. `renderHook` — Testing Custom Hooks

```javascript
import { renderHook, act } from '@testing-library/react'

// Basic usage
const { result } = renderHook(() => useMyHook())
// result.current = current return value of the hook

// With props
const { result, rerender } = renderHook(
  ({ count }) => useCounter(count),
  { initialProps: { count: 0 } }
)
expect(result.current.value).toBe(0)

rerender({ count: 5 })  // re-calls the hook with new args
expect(result.current.value).toBe(5)

// When the hook causes state updates (from clicking, etc.)
act(() => {
  result.current.increment()  // triggers state update
})
expect(result.current.value).toBe(6)
// act(): wraps code that causes React state updates in tests
// Without act(): React warns "state update outside act()"
```

---

## 9. Testing Components With Context (wrapping providers)

Components that use `useAuth()`, `useTasks()`, or `useTheme()` need their providers when rendered in tests:

```javascript
// Option 1: wrap manually
render(
  <AuthProvider>
    <ThemeProvider>
      <Header />
    </ThemeProvider>
  </AuthProvider>
)

// Option 2: create a custom render wrapper (production pattern)
// src/test/test-utils.jsx
import { render } from '@testing-library/react'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'

function AllProviders({ children }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AuthProvider>
  )
}

// Override render with wrapped version
export function renderWithProviders(ui, options) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Usage in tests:
import { renderWithProviders } from './test-utils'
renderWithProviders(<Header />)
```

**This is the standard pattern** in every production codebase with global providers.

---

## 10. MSW (Mock Service Worker) — The Interview Gold

You won't need this for most component tests, but every interviewer expects you to know it.

### What It Is
MSW intercepts network requests at the **service worker level** (in browsers) or via Node.js HTTP interceptor (in tests). Your code makes real `fetch()` calls — MSW intercepts them and returns mock responses.

### Why It's Better Than Mocking `fetch`
```javascript
// ❌ Mocking fetch directly — brittle, leaks implementation
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve([{ id: 1, title: 'Task' }])
})
// ← This breaks if you switch from fetch to axios
// ← This doesn't test your actual API integration code

// ✅ MSW — mocks at the network level
// Your real fetch/axios/React Query code runs unchanged
// MSW intercepts the HTTP request and returns the mock response
```

### Setup (know for interviews)
```javascript
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost:3001/tasks', () => {
    return HttpResponse.json([
      { id: 1, title: 'Test Task', status: 'todo', priority: 'high' }
    ])
  }),

  http.post('http://localhost:3001/tasks', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 99, ...body }, { status: 201 })
  }),
]

// src/mocks/server.js (for Node/test environment)
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)

// src/test/setup.js — add alongside jest-dom import
import { server } from '../mocks/server'
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())   // reset any test-specific overrides
afterAll(() => server.close())

// In a test — override for a specific test:
server.use(
  http.get('*/tasks', () => HttpResponse.json([], { status: 500 }))
)
```

### Test With MSW + React Query
```javascript
it('shows error state when API fails', async () => {
  server.use(
    http.get('*/tasks', () => new HttpResponse(null, { status: 500 }))
  )

  render(<TasksPage />, { wrapper: AllProviders })

  await screen.findByText(/could not load tasks/i)
  // findBy waits for async — API call, React Query retry, error state render
})
```

---

## 11. What NOT to Test

```javascript
// ❌ Don't test implementation details
expect(component.state.count).toBe(5)        // internal state
expect(spy).toHaveBeenCalledWith(someRef)     // internal hooks

// ❌ Don't test third-party libraries
// React Router, React Query, Zod — they have their own tests

// ❌ Don't test styling (usually)
expect(element).toHaveStyle('color: red')    // fragile, browser-specific

// ❌ Don't over-mock
// The more you mock, the less you test the real integration

// ✅ Test:
// - Component renders correct output for given props
// - User interactions trigger correct behaviour
// - Error/loading states display correctly
// - Custom hook logic (unit test with renderHook)
// - Integration: component + context + API (with MSW)
```

---

## 12. Interview Q&A

**Q: What is the difference between `getBy`, `queryBy`, and `findBy`?**  
A: All three find elements but differ in behaviour when the element isn't found. `getBy` throws immediately if not found — use when the element must exist. `queryBy` returns `null` if not found — use when asserting an element is absent (`expect(screen.queryByText('Error')).not.toBeInTheDocument()`). `findBy` is async — it polls until the element appears or times out — use when the element appears after a state update or API call.

**Q: Why use `userEvent` instead of `fireEvent`?**  
A: `userEvent` simulates the full sequence of browser events that real users generate — pointer enter, focus, keydown, keypress, input, keyup, blur. `fireEvent` dispatches a single low-level DOM event. Using `fireEvent.change()` on an input controlled by React Hook Form won't trigger the `onBlur` validation, but `userEvent.type()` will because it fires blur when done. Tests using `userEvent` catch more bugs because they match how users actually interact.

**Q: What is `vi.fn()` and what can you assert on it?**  
A: `vi.fn()` creates a mock function that tracks all calls made to it. You can assert: `.toHaveBeenCalled()`, `.toHaveBeenCalledWith(args)`, `.toHaveBeenCalledTimes(n)`, `.toHaveBeenCalledOnce()`. Mock functions are essential for testing that callbacks (like `onAddTask`) are called correctly when the user submits a form, or that navigation functions are called after successful login.

**Q: What is MSW and why is it preferred over mocking `fetch`?**  
A: MSW (Mock Service Worker) intercepts HTTP requests at the network level, not by replacing `fetch`. Your real application code — the service layer, axios, React Query — runs exactly as in production. Only the network response is mocked. This means your tests test the full stack from component down to HTTP, catching integration bugs that fetch-mocking misses. It also makes tests resilient to switching between `fetch` and `axios`.

**Q: How do you test a component that uses Context?**  
A: Wrap the component with all required providers in the render call. The production pattern is a custom `renderWithProviders` utility that wraps the component in all providers automatically. You pass `wrapper: AllProviders` to RTL's `render()` options. For tests that need specific context values (e.g., logged-in user), you can wrap with a provider that accepts initial state as props.

**Q: When would you use `act()` in tests?**  
A: `act()` is needed when your test code directly causes React state updates outside of RTL's own managed interactions. RTL's `userEvent` and `findBy`/`waitFor` wrap their operations in `act()` automatically. You need to call `act()` manually when using `renderHook` and calling a hook function that triggers a state update, or when using `setTimeout`/`Promise` directly. If you see "Warning: An update to X inside a test was not wrapped in act()", wrap the triggering code in `act()`.

---

## 13. Revision Cheat Sheet

```
Setup:
  environment: 'jsdom'           — browser APIs in Node
  setupFiles: ['./setup.js']     — runs before every test
  @testing-library/jest-dom      — adds toBeInTheDocument() etc.

Core RTL:
  render(<Component />)          — mount into jsdom
  screen.getByRole(role, {name}) — preferred query (accessibility-first)
  screen.queryByText('x')        — returns null if not found (for absence checks)
  await screen.findByRole(...)   — async, waits for element to appear
  waitFor(() => expect(...))     — polls until assertion passes

Query priority:
  getByRole > getByLabelText > getByText > getByTestId (last resort)

Variants:
  getBy    → throws if missing (use for must-exist elements)
  queryBy  → null if missing (use for asserting absence)
  findBy   → async, waits (use after async operations)

userEvent:
  const user = userEvent.setup()    — create per test
  await user.type(input, 'text')    — types char by char
  await user.click(element)         — full click sequence
  await user.tab()                  — triggers blur + focus next
  await user.selectOptions(sel, v)  — selects dropdown option

vi.fn():
  vi.fn()                           — create mock
  expect(fn).toHaveBeenCalledOnce()
  expect(fn).toHaveBeenCalledWith(expect.objectContaining({ key: val }))

renderHook:
  const { result } = renderHook(() => useHook())
  result.current                    — current return value
  rerender({ newProp })             — re-call with new args

MSW:
  handlers: http.get(url, () => HttpResponse.json(data))
  server.use(handler)               — override for one test
  beforeAll(server.listen)
  afterEach(server.resetHandlers)
  afterAll(server.close)
```

---

## 14. Key Takeaways

1. **Test behaviour, not implementation** — what users see, not internal state
2. **Query priority: `getByRole` first** — most aligned with accessibility, most robust
3. **`queryBy` for absence checks** — `getBy` would throw before `expect` runs
4. **`findBy` for async elements** — automatically waits; no manual `waitFor` needed
5. **`userEvent` over `fireEvent`** — simulates real user gestures, not single events
6. **`vi.fn()` = `jest.fn()`** — identical API; Vitest is just faster in Vite projects
7. **MSW is the production-grade API mock** — tests your real fetch/axios/React Query code
8. **`renderHook` for custom hooks** — no wrapper component boilerplate needed
9. **Custom `renderWithProviders`** — standard pattern for components needing context
10. **`act()` is usually automatic** — RTL wraps its own calls; only needed for manual state triggers

---

*Notes: Phase 14 — Testing*  
*Next Phase: Phase 15 — Build, Deployment, Production Best Practices, Fiber Internals*
