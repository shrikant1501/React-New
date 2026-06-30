# Phase 15 — Build, Deployment, Fiber Internals, Web Vitals, Spring Boot Integration

> **Status:** ✅ Complete — Final Phase  
> **Added:** `rollup-plugin-visualizer`, `build:analyze` script, `cross-env`  
> **Run bundle analysis:** `npm run build:analyze` → opens `dist/stats.html`

---

## 1. React Fiber — The Most Important Internal Concept

### Why Fiber Was Built (The Problem With The Old Reconciler)

Before React 16, React used a recursive, synchronous reconciler ("Stack reconciler"). When React started rendering a component tree, it could not stop until the entire tree was processed. On large trees this could block the main thread for hundreds of milliseconds — causing dropped frames and janky UIs.

**The fundamental constraint:** JavaScript is single-threaded. The browser's main thread handles rendering, JavaScript execution, user input, and animations. If your JS blocks for 100ms, the browser can't respond to user clicks for 100ms.

### What Fiber Is

Fiber is React's complete internal rewrite (React 16, 2017) of the reconciliation algorithm. The name comes from the data structure: a **Fiber** is a plain JavaScript object that represents a unit of work for one component.

```javascript
// Simplified Fiber node (one exists per component instance)
{
  type:          TaskCard,          // the component function/class
  key:           '5',               // the key prop
  stateNode:     domNode,           // actual DOM node (for host components)
  child:         fiberNode,         // first child fiber
  sibling:       fiberNode,         // next sibling fiber
  return:        fiberNode,         // parent fiber
  pendingProps:  { title: '...' },  // new props being applied
  memoizedProps: { title: '...' },  // props from last render
  memoizedState: { count: 0 },      // hook state linked list
  effectTag:     'UPDATE',          // what needs to happen: PLACEMENT | UPDATE | DELETION
  lanes:         SyncLane,          // priority of this update
  alternate:     fiberNode,         // the "other" tree (current ↔ work-in-progress)
}
```

### The Two-Tree Model (Current + Work-In-Progress)

Fiber maintains two trees at all times:

```
Current Tree                Work-In-Progress Tree
─────────────────           ──────────────────────
What's on screen            What React is computing

App                         App (alternate)
├─ Header                   ├─ Header (alternate)
├─ Sidebar                  ├─ Sidebar (alternate) ← being updated
└─ TasksPage                └─ TasksPage (alternate)
    └─ TaskCard x10              └─ TaskCard x10 (alternate)
```

When a state update triggers, React builds the work-in-progress tree by reusing fiber nodes from the current tree where nothing changed. Once complete, React "commits" — atomically swapping work-in-progress to become the new current tree. The old current tree's nodes become the new work-in-progress pool (ready for the next render).

**Why two trees?** If rendering is interrupted mid-way, the current tree (what's on screen) is never corrupted. React can always show the last committed state.

### The Render Phase vs Commit Phase

```
┌───────────────────────────────────────────────────────────┐
│                    RENDER PHASE                           │
│  (async, interruptible, may run multiple times)           │
│                                                           │
│  React traverses the fiber tree                           │
│  Calls component functions (re-renders)                   │
│  Computes what changed (reconciliation / diffing)         │
│  Builds list of effects (DOM mutations needed)            │
│                                                           │
│  ← NO DOM mutations happen here                           │
│  ← Can be paused, resumed, or abandoned                   │
└───────────────────────────────────────────────────────────┘
                          │
                    (all effects computed)
                          │
┌───────────────────────────────────────────────────────────┐
│                    COMMIT PHASE                           │
│  (synchronous, cannot be interrupted)                     │
│                                                           │
│  Phase 1 (before mutations): runs getSnapshotBeforeUpdate │
│  Phase 2 (mutations):        applies all DOM changes      │
│  Phase 3 (layout):           runs useLayoutEffect         │
│  Phase 4 (passive effects):  runs useEffect (async)       │
│                                                           │
│  ← DOM mutations happen here — all or nothing             │
│  ← User sees consistent UI (no partial renders)           │
└───────────────────────────────────────────────────────────┘
```

**Why `useLayoutEffect` fires before `useEffect`:**
`useLayoutEffect` runs synchronously in Phase 3 (after DOM mutations but before browser paint). The browser hasn't painted yet — your code can read layout measurements and make synchronous DOM changes without causing visible flicker. `useEffect` runs asynchronously after paint (Phase 4) — safer for side effects that don't need layout measurements.

### Concurrent Mode — Fiber's Key Feature

Fiber's linked-list structure makes rendering **interruptible**. React can pause work-in-progress at any fiber node boundary, handle a higher-priority update, then resume.

```
Without Concurrent Mode (legacy/blocking mode):
  Update arrives → synchronous render → blocks thread → user input queued

With Concurrent Mode (React 18+):
  Low-priority update starts rendering
  High-priority update arrives (user types)
  React pauses the low-priority work
  Processes the high-priority update (instant response to user)
  Resumes low-priority work when idle
```

**What this enables:**
- `useTransition` — mark updates as non-urgent (Phase 13)
- `useDeferredValue` — defer expensive child renders
- `Suspense` for data — show stale content while new content loads
- `startTransition` from React — the imperative version of `useTransition`

### Reconciliation — How React Diffs

Reconciliation is the process of comparing the new VDOM tree against the current fiber tree to determine the minimum set of DOM changes.

**The diffing rules (O(n) algorithm — not O(n³) like naive tree diff):**

**Rule 1: Different component types → full unmount/remount**
```jsx
// If type changes, React throws away the entire subtree and creates fresh
{showA ? <ComponentA /> : <ComponentB />}
// When switching A→B: A unmounts fully, B mounts fresh
// No attempt to reuse A's DOM nodes for B
```

**Rule 2: Same type → update in place**
```jsx
// Before: <input type="text" value="old" />
// After:  <input type="text" value="new" />
// React keeps the DOM node, updates only the 'value' attribute
```

**Rule 3: Keys tell React identity across renders**
```jsx
{tasks.map(task => (
  <TaskCard key={task.id} {...task} />
))}
```
Without `key`: React matches by position. Inserting at the beginning shifts all items → React re-renders every card.
With `key`: React matches by `task.id`. Inserting at the beginning only creates one new node — others are reused by key.

**Why `key={index}` is dangerous:**
```jsx
// tasks = [A, B, C]  → keys: 0, 1, 2
// After removing B:
// tasks = [A, C]     → keys: 0, 1
// React thinks: key=1 still exists (was B, now C) → tries to UPDATE B into C
// Causes: wrong state in inputs, lost animation state, subtle bugs
// Use a stable unique ID as key — never the array index
```

### The Virtual DOM — Clarifying the Mental Model

The "Virtual DOM" is not a React-specific technology. It's a programming pattern: maintain an in-memory representation of the UI, diff it against the previous version, then apply only the changed parts to the real DOM.

```
Render phase:
  JSX → React.createElement() → Virtual DOM tree (plain JS objects)

Diffing:
  New VDOM tree vs current fiber tree → list of changes

Commit phase:
  Changes applied to real DOM (insertions, updates, deletions)
```

**Common misconception:** "Virtual DOM makes React fast." In isolation, creating and diffing a VDOM adds overhead. The real advantage is **batching** — React accumulates all state changes, runs one diffing pass, then applies the minimum DOM mutations in one commit. Compared to direct DOM manipulation spread across many event handlers, this is often faster and always more predictable.

---

## 2. The Vite Build Pipeline

### What `npm run build` Does

```
src/ (your source files)
   │
   ▼  Vite (Rollup under the hood)
   │
   ├─ Tree-shaking:    removes unused exports
   ├─ Minification:    renames vars, removes whitespace
   ├─ Code splitting:  React.lazy() → separate chunks
   ├─ Asset hashing:   index-Bx4kQ2.js (cache-busting)
   └─ CSS extraction:  all CSS → one .css file
   │
   ▼
dist/
  index.html           (entry point — references the hashed JS/CSS)
  assets/
    index-Bq3gV5e9.js  (main chunk — React, router, context, components)
    TasksPage-Bj...js   (lazy chunk — only downloaded when /tasks visited)
    index-XU1v...css    (all styles combined and minified)
```

### Bundle Analysis — `npm run build:analyze`

```bash
npm run build:analyze
# Opens dist/stats.html in your browser automatically
# Shows an interactive treemap: every module and its byte contribution
```

**What to look for:**
1. **Unexpectedly large libraries** — a chart library that adds 200KB for one pie chart
2. **Duplicate dependencies** — same package included multiple times (version mismatch)
3. **Development code in production** — devtools, debug helpers that weren't tree-shaken
4. **Opportunities for lazy-loading** — large page components not already lazy

### Our Build Output Explained

```
dist/assets/index-Bq3gV5e9.js    278 KB gzip:88 KB
  └─ React (react-dom)            ~130 KB
  └─ React Router                  ~25 KB
  └─ React Query                   ~35 KB
  └─ React Hook Form + Zod         ~25 KB
  └─ clsx                           ~0.2 KB
  └─ AuthContext, TaskContext...    ~15 KB
  └─ DashboardLayout, Header...    ~10 KB

dist/assets/TasksPage-Bj...js      98 KB gzip:29 KB
  └─ React Hook Form (shared)      ~25 KB  ← RHF is in the TasksPage chunk
  └─ AddTaskForm, FilterBar...     ~73 KB
```

### Tree-Shaking

Vite/Rollup statically analyses your `import` statements and removes any exports that are never imported anywhere.

```javascript
// math.js
export const add      = (a, b) => a + b   // ← used
export const subtract = (a, b) => a - b   // ← never imported anywhere
export const multiply = (a, b) => a * b   // ← never imported anywhere

// After tree-shaking: subtract and multiply are GONE from the bundle
```

**Why it only works with ES modules (`import`/`export`):**
`require()` (CommonJS) is dynamic — Rollup can't know at build time which exports are used. `import` is static — Rollup traces the dependency graph at build time. This is why the ecosystem moved to ESM.

### Asset Hashing and Caching

```
index.js          ← no hash — never cached aggressively
index-Bq3gV5e9.js ← hash changes when content changes
```

The hash is derived from the file's content. When you deploy a new version:
- Unchanged chunks: same hash → browser serves from cache (instant)
- Changed chunks: new hash → browser downloads fresh copy

`index.html` always contains the current hashes, so the browser always loads the right versions. This is **content-based cache busting** — no manual version numbers needed.

### Environment Variables

```bash
# .env.development   (used with npm run dev)
VITE_API_URL=http://localhost:3001

# .env.production    (used with npm run build)
VITE_API_URL=https://api.mytaskapp.com

# .env.local         (never committed to git — secrets)
VITE_SECRET_KEY=...
```

```javascript
// In your code:
const url = import.meta.env.VITE_API_URL   // works in browser code
const isDev = import.meta.env.DEV          // boolean
const isProd = import.meta.env.PROD        // boolean
const mode = import.meta.env.MODE          // "development" | "production"
```

**Security rule:** Only expose variables prefixed with `VITE_` — Vite inlines these into the browser bundle. Variables without the prefix are only available in `vite.config.js`. **Never put secrets in `VITE_` variables** — they're visible in the bundle to anyone who downloads your app.

---

## 3. Web Vitals — What Senior Interviews Expect

Google's Core Web Vitals are the metrics that define a "fast" website. They directly affect SEO ranking and user experience.

### The Three Core Metrics

**LCP — Largest Contentful Paint**
Time until the largest visible element (image, hero text) is rendered.
- Good: < 2.5 seconds
- Needs improvement: 2.5–4s
- Poor: > 4s

**FID — First Input Delay (→ INP in 2024)**
Time from first user interaction to browser response.
- Good: < 100ms
- Needs improvement: 100–300ms
- Poor: > 300ms
*FID is being replaced by INP (Interaction to Next Paint) — measures all interactions, not just first.*

**CLS — Cumulative Layout Shift**
How much the page layout shifts during load (images popping in, fonts swapping).
- Good: < 0.1
- Needs improvement: 0.1–0.25
- Poor: > 0.25

### React-Specific Web Vitals Optimisations

```
LCP Optimisations:
✅ Code splitting (Phase 13) — smaller initial bundle → faster parse
✅ Preload critical assets — <link rel="preload">
✅ Server-side rendering (Next.js) — HTML arrives pre-rendered
✅ Skeleton UI (Phase 9) — perceived performance while data loads
✅ Image optimisation — WebP, lazy loading, explicit dimensions

FID / INP Optimisations:
✅ useTransition (Phase 13) — non-urgent updates don't block input
✅ useDeferredValue — defer expensive renders
✅ React.memo + useCallback — prevent unnecessary re-renders
✅ Code splitting — less JS to parse → faster interactive time
✅ Web Workers — offload heavy computation off main thread

CLS Optimisations:
✅ Skeleton cards (Phase 9) — reserve space before data loads
✅ Explicit image dimensions — <img width={x} height={y} />
✅ Avoid inserting content above existing content
✅ font-display: optional or swap — prevent font-swap layout shift
```

### Measuring Web Vitals

```javascript
// Using the web-vitals library (Google's official package)
import { getCLS, getFID, getLCP } from 'web-vitals'

getCLS(metric => console.log('CLS:', metric.value))
getFID(metric => console.log('FID:', metric.value))
getLCP(metric => console.log('LCP:', metric.value))

// In production: send to your analytics instead of console.log
getCLS(metric => analytics.track('webVital', metric))
```

**In Chrome DevTools:** Lighthouse tab → "Generate report" → full performance audit with Web Vitals, accessibility, best practices, and SEO scores.

---

## 4. Spring Boot + React Integration

This is the production pattern for teams using React frontend with a Java backend.

### The Three Deployment Models

**Model 1 — Separate Servers (Most Common in Production)**
```
Frontend:  React app deployed to Vercel / Netlify / S3+CloudFront
           https://app.mytaskapp.com
           
Backend:   Spring Boot API deployed to EC2 / App Service / Cloud Run
           https://api.mytaskapp.com

CORS:      Spring Boot must explicitly allow requests from the frontend origin
```

```java
// Spring Boot — enable CORS for React frontend
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://app.mytaskapp.com")
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
            .allowedHeaders("*")
            .allowCredentials(true);  // needed for httpOnly cookies
    }
}
```

**Model 2 — Spring Boot Serves the React Build (Monolith)**
```
# Build React
npm run build   # → dist/ folder

# Copy dist/ into Spring Boot's static resources
cp -r dist/* src/main/resources/static/

# Spring Boot serves everything:
#   GET /api/tasks → handled by TaskController.java
#   GET /          → serves dist/index.html
#   GET /tasks     → also serves index.html (React Router handles it client-side)
```

```java
// Spring Boot — forward unknown routes to index.html (for React Router)
@Controller
public class SpaController {
    // Any path that doesn't match an API endpoint → send back index.html
    // React Router in the browser then handles the /tasks, /settings etc.
    @RequestMapping(value = {"/", "/{path:[^\\.]*}", "/{path:^(?!api).*$}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
```

**Model 3 — Vite Dev Proxy (Development Only)**
```javascript
// vite.config.js — during development, proxy /api calls to Spring Boot
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // Spring Boot dev server
        changeOrigin: true,
        // rewrite: removes /api prefix if Spring Boot doesn't use it
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

```javascript
// With proxy — your service layer uses relative URLs:
const BASE_URL = '/api'  // no CORS issues — same-origin to Vite dev server
// Vite proxies /api/tasks → http://localhost:8080/api/tasks
```

### JWT Integration With Spring Boot

```java
// Spring Boot — JWT validation filter
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, ...) {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            // Validate the JWT, extract userId, set SecurityContext
            Claims claims = jwtService.validateToken(token);
            // React sends: Authorization: Bearer eyJ... (from taskApi.js)
        }
    }
}
```

```javascript
// React (taskApi.js) — already implemented in Phase 10
function getAuthHeader() {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
```

The Spring Boot filter reads the `Authorization: Bearer <token>` header that our `taskApi.js` sends automatically on every request.

### Spring Boot API Response Format

Real Spring Boot APIs often wrap responses:
```json
{
  "data": [...],
  "message": "Success",
  "status": 200
}
```

Our `taskApi.js` would need to extract `.data`:
```javascript
async function request(path, options = {}) {
  const res = await fetch(...)
  const json = await res.json()
  return json.data ?? json  // handle both wrapped and unwrapped responses
}
```

Or use Spring's `@RestController` which returns the object directly (no wrapper) — which is what `json-server` also does.

---

## 5. Production Checklist

What you verify before shipping a React app:

```
Performance:
✅ Code splitting in place (React.lazy for routes)
✅ Images optimised (WebP, lazy loading, explicit dimensions)
✅ Bundle size analysed (npm run build:analyze)
✅ React.memo on expensive list items
✅ useCallback/useMemo where re-render costs are measurable

Security:
✅ No secrets in VITE_ environment variables
✅ Auth tokens use httpOnly cookies (or accepted localStorage risk is documented)
✅ API validates every token server-side (frontend protection is UX only)
✅ CORS configured on backend with specific allowed origins (not *)
✅ Content Security Policy headers set on the server

Error Handling:
✅ ErrorBoundary wraps the app
✅ API error states handled (Phase 9 — isError states)
✅ Error logging configured (Sentry.captureException in componentDidCatch)
✅ 404 page for unknown routes (Phase 8)

Accessibility:
✅ Semantic HTML (button not div for clicks, nav for navigation)
✅ aria-label on icon-only buttons
✅ role="alert" on error messages
✅ htmlFor on all labels

Build:
✅ npm run build succeeds with no errors
✅ npm run preview — test the production build locally
✅ All environment variables set for production (.env.production)
✅ Console.log() removed (or behind import.meta.env.DEV guard)
```

---

## 6. Interview Q&A — The Deep Questions

**Q: Explain React Fiber.**  
A: Fiber is React's reconciliation engine, introduced in React 16. It replaced the synchronous stack-based reconciler with a linked-list-based architecture where each component is represented as a "fiber" node. The key innovation is that rendering work is divided into small units, making it interruptible. React can pause a render in progress, process a higher-priority update (like user input), and resume the paused work. This is the foundation of all concurrent features: `useTransition`, `useDeferredValue`, `Suspense` for data. Fiber also introduced the two-phase architecture: the interruptible render phase (computing what changed) and the synchronous commit phase (applying DOM mutations).

**Q: What is the Virtual DOM and is it always faster than direct DOM manipulation?**  
A: The Virtual DOM is an in-memory representation of the UI tree (plain JavaScript objects). React diffs the new VDOM against the previous version to find the minimum set of DOM changes needed, then batches them into one commit. It's not always faster in absolute terms — creating and diffing VDOM objects adds overhead. The advantage is predictability and batching: instead of multiple direct DOM mutations scattered across event handlers (which can cause multiple repaints), React accumulates all changes and applies them once. For complex UIs with many interdependent updates, this batched approach usually outperforms manual DOM manipulation.

**Q: Why do React keys need to be stable and unique?**  
A: Keys are React's identity system for list items across renders. React uses them during reconciliation to match old fiber nodes to new elements — preserving DOM nodes, component state, and animations for items that haven't changed. Unstable keys (like array indices) cause React to misidentify items when the list changes — it thinks an existing item changed when actually a different item was removed. This leads to incorrect component state, lost input values, and broken animations. Keys must be unique within a list and stable across re-renders — typically a database ID or UUID.

**Q: What is the difference between the render phase and the commit phase?**  
A: The render phase is where React calls your component functions, builds the work-in-progress fiber tree, and determines what changed. It's asynchronous and interruptible — React can pause and restart it. No DOM mutations happen here. The commit phase is synchronous and uninterruptible — React applies all accumulated DOM mutations at once, then runs layout effects (`useLayoutEffect`) synchronously, and finally schedules passive effects (`useEffect`) asynchronously after the browser has painted. The synchronous commit ensures users see a consistent UI — never a partial render.

**Q: How would you connect a React app to a Spring Boot backend?**  
A: Two approaches depending on deployment. For separate deployments: React is hosted on a CDN (Vercel/S3), Spring Boot on a server. Spring Boot configures CORS to allow the React origin. React's service layer sends `Authorization: Bearer <token>` headers on every API call. For a monolith: `npm run build` generates a `dist/` folder that's placed in `src/main/resources/static/`. Spring Boot serves the React app for all non-API routes by forwarding to `index.html`, letting React Router handle client-side routing. During development, Vite's `server.proxy` proxies API calls to avoid CORS issues.

**Q: What are Core Web Vitals and how does React affect them?**  
A: Core Web Vitals are Google's three key metrics: LCP (Largest Contentful Paint — loading speed), INP (Interaction to Next Paint — responsiveness), and CLS (Cumulative Layout Shift — visual stability). React affects all three. LCP is improved by code splitting (smaller initial bundle), skeleton UIs (perceived loading), and server-side rendering. INP is improved by `useTransition` and `useDeferredValue` (keeping the main thread free for input). CLS is improved by skeleton cards that reserve space before data loads, preventing layout shifts when content arrives.

**Q: What is tree-shaking and why does it require ES modules?**  
A: Tree-shaking is the process of removing unused code (dead code elimination) from the production bundle. Rollup/Vite analyses which exports are actually imported anywhere in the codebase and removes the rest. This requires ES module `import`/`export` syntax because it's statically analysable at build time — the bundler can trace the complete dependency graph without executing code. CommonJS `require()` is dynamic (can depend on runtime values), making static analysis impossible. This is why modern libraries publish ES module builds (`"module"` field in package.json).

---

## 7. Tricky Interview Questions

**Q: If `useEffect` runs after paint and `useLayoutEffect` runs before paint, why not always use `useLayoutEffect`?**  
A: `useLayoutEffect` runs synchronously during the commit phase, blocking the browser from painting until it completes. If your layout effect is slow (complex calculations, many DOM reads/writes), it delays the visible update — users see a blank or frozen screen. `useEffect` runs after paint, so the user sees the updated UI immediately. Use `useLayoutEffect` only when you must read layout measurements (e.g., `getBoundingClientRect`) and make synchronous DOM adjustments before the user sees the frame — like positioning a tooltip, measuring element size, or syncing a scroll position. For everything else, `useEffect` is correct.

**Q: Can React render the same component multiple times per update in Fiber?**  
A: Yes — this is exactly what happens in `StrictMode` during development. React intentionally double-invokes render functions, `useState` initializers, and `useMemo` computations to surface impure renders early. In concurrent mode, React may also render a component, interrupt it, and re-render it with the same props if a higher-priority update arrives. This is why render functions must be pure — side effects during render will fire twice in dev, and potentially multiple times in concurrent rendering scenarios. Side effects belong in `useEffect`, not in the component body.

**Q: What happens to the work-in-progress tree if an error is thrown during the render phase?**  
A: React unwinds the work-in-progress tree, looking for the nearest Error Boundary in the fiber tree. When found, React marks that boundary's fiber with an error effect and re-renders from that boundary using `getDerivedStateFromError`'s returned state (showing the fallback UI). The current tree (what was on screen) is preserved until the boundary commits its fallback. If no Error Boundary is found, React unmounts the entire application and throws the error to the browser, resulting in a blank screen.

---

## 8. Complete Project Architecture — Final State

```
task-dashboard/
├── vite.config.js          ✅ Vitest config + bundle visualizer
├── package.json            ✅ 15 scripts: dev, api, build, build:analyze, test...
├── db.json                 ✅ users[] + tasks[] (json-server mock DB)
├── .env.development        ✅ VITE_API_URL=http://localhost:3001
├── .env.production         ✅ VITE_API_URL=https://api.mytaskapp.com
│
└── src/
    ├── main.jsx            ✅ BrowserRouter > AuthProvider > QueryClient > Theme > Task > App
    ├── App.jsx             ✅ ErrorBoundary > Suspense > Routes (lazy pages)
    ├── App.css             ✅ All component styles + dark/light theme variables
    ├── index.css           ✅ CSS custom properties (theme tokens)
    │
    ├── services/
    │   ├── taskApi.js      ✅ fetch() + getAuthHeader() + all CRUD endpoints
    │   └── authApi.js      ✅ mock JWT login/logout + decodeToken + isTokenExpired
    │
    ├── context/
    │   ├── AuthContext.jsx ✅ user, token, isInitialising, login(), logout()
    │   ├── TaskContext.jsx ✅ React Query + split contexts (state/dispatch)
    │   └── ThemeContext.jsx✅ dark/light toggle + localStorage persistence
    │
    ├── hooks/
    │   ├── useFormValidation.js  ✅ Phase 5 custom hook (kept for reference)
    │   ├── useLocalStorage.js    ✅ Phase 4 hook (kept for reference)
    │   ├── useDocumentTitle.js   ✅ document.title side effect
    │   ├── useTaskStats.js       ✅ pure computation hook
    │   ├── usePrevious.js        ✅ useRef + no-dep useEffect pattern
    │   ├── useRenderCount.js     ✅ DEV-only render counter
    │   └── useAuthRedirect.js    ← could be added for redirect-after-login
    │
    ├── pages/
    │   ├── LoginPage.jsx         ✅ RHF form, useAuth(), redirect-after-login
    │   ├── TasksPage.jsx         ✅ useSearchParams, useTransition
    │   ├── TaskDetailPage.jsx    ✅ useParams, useNavigate
    │   ├── SettingsPage.jsx      ✅ theme toggle, reset tasks
    │   └── NotFoundPage.jsx      ✅ 404 catch-all
    │
    ├── components/
    │   ├── ErrorBoundary.jsx     ✅ class component, getDerivedStateFromError
    │   ├── DashboardLayout.jsx   ✅ Header + Sidebar + <Outlet />
    │   ├── ProtectedRoute.jsx    ✅ isInitialising guard + useAuth()
    │   ├── Header.jsx            ✅ user avatar + logout button
    │   ├── Sidebar.jsx           ✅ NavLink + stats
    │   ├── AddTaskForm.jsx       ✅ React Hook Form + Zod schema
    │   ├── FilterBar.jsx         ✅ React.memo + clsx object syntax
    │   ├── TaskCard.jsx          ✅ React.memo + clsx string syntax
    │   ├── TaskListSection.jsx   ✅ isPending dim + skeleton cards
    │   ├── StatsBar.jsx          ✅ React.memo
    │   └── ThemeToggle.jsx       ✅ useTheme()
    │
    └── test/
        ├── setup.js              ✅ @testing-library/jest-dom
        ├── StatusBadge.test.jsx  ✅ render, screen, toBeInTheDocument
        ├── useTaskStats.test.js  ✅ renderHook, rerender
        └── AddTaskForm.test.jsx  ✅ userEvent, vi.fn(), waitFor, getByRole
```

---

## 9. Revision Cheat Sheet — The Entire 15-Phase Journey

```
FIBER INTERNALS:
  Fiber = JS object per component: { type, stateNode, child, sibling, return, memoizedState }
  Two trees: current (on screen) + work-in-progress (being computed)
  Render phase: interruptible, no DOM mutations
  Commit phase: synchronous, DOM mutations, layout effects, passive effects
  Reconciliation rules:
    1. Different type → unmount + remount
    2. Same type → update in place
    3. key → identity across renders (stable ID, never index)

VITE BUILD:
  npm run build         → dist/ with hashed chunks
  npm run build:analyze → opens treemap visualizer
  npm run preview       → serves dist/ locally (test production build)
  Tree-shaking: removes unused exports (ESM only)
  Hash = content hash → cache until content changes

ENVIRONMENT VARIABLES:
  VITE_* prefix → inlined into browser bundle (safe to expose)
  No prefix     → only in vite.config.js (not in browser)
  import.meta.env.VITE_API_URL
  import.meta.env.DEV | PROD | MODE

WEB VITALS:
  LCP < 2.5s  → code split, SSR, preload
  INP < 100ms → useTransition, useDeferredValue, React.memo
  CLS < 0.1   → skeleton UI, explicit image dimensions

SPRING BOOT INTEGRATION:
  CORS: @CrossOrigin or WebMvcConfigurer.addCorsMappings()
  JWT: Authorization: Bearer token → Spring Security JwtAuthFilter
  Serve React: static/ folder + forward unknown routes to index.html
  Vite proxy: server.proxy /api → http://localhost:8080 (dev only)

PRODUCTION CHECKLIST:
  ✅ Code splitting, bundle analysis, no secrets in VITE_ vars
  ✅ ErrorBoundary, error logging (Sentry), 404 page
  ✅ CORS locked to specific origin (not *)
  ✅ httpOnly cookies for tokens (or accepted localStorage risk)
  ✅ npm run preview passes
```

---

## 10. Key Takeaways — The Final Phase

1. **Fiber = interruptible rendering** — linked list of work units, two-tree model, render vs commit phases
2. **Virtual DOM advantage is batching** — not speed in isolation, but consistency and fewer DOM touches
3. **Keys are identity** — stable unique IDs, never array index
4. **Tree-shaking requires ESM** — static `import`/`export` enables dead code elimination
5. **Content hashing = cache busting** — changed files get new names; unchanged files stay cached
6. **`VITE_` = public** — anything prefixed is visible in the bundle; never put secrets there
7. **Web Vitals affect SEO** — LCP, INP, CLS are Google ranking factors
8. **Spring Boot integration** — CORS for separate servers, static serving for monolith, Vite proxy for dev
9. **`npm run preview`** — always test the production build before deploying
10. **`build:analyze`** — visual proof of what's in your bundle; use before every major release

---

## 🎓 The Complete Learning Journey — All 15 Phases

| Phase | Topic | Key Concept |
|---|---|---|
| 1 | Introduction, JSX, Components | Why React, Virtual DOM basics, component model |
| 2 | Props, Data Flow | Unidirectional data flow, destructuring, children |
| 3 | State, useState | Immutability, controlled forms, lifting state |
| 4 | Lifecycle, useEffect | Mount/update/unmount, cleanup, custom hooks |
| 5 | useRef, Forms | Uncontrolled inputs, DOM access, form validation |
| 6 | Performance | React.memo, useCallback, useMemo, reference equality |
| 7 | Context API | Provider pattern, split contexts, global state |
| 8 | React Router | SPA routing, nested routes, URL params, protected routes |
| 9 | API Integration | fetch, service layer, React Query, skeleton UI |
| 10 | Authentication | JWT, AuthContext, isInitialising, token storage |
| 11 | React Hook Form + Zod | Uncontrolled forms, schema validation, register() |
| 12 | Styling | CSS Modules, Tailwind, clsx, CSS custom properties |
| 13 | Error Boundaries + Lazy | Class components, code splitting, Suspense, useTransition |
| 14 | Testing | Vitest, RTL, renderHook, userEvent, vi.fn(), MSW |
| 15 | Build + Production + Fiber | Vite pipeline, Web Vitals, Spring Boot, Fiber internals |

---

*Notes: Phase 15 — Build, Deployment, Fiber Internals (Final Phase)*  
*The complete Task Dashboard learning journey is now complete.*
