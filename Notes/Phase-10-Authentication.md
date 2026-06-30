# Phase 10 — Authentication (JWT, AuthContext, Protected Routes, Token Storage)

> **Status:** ✅ Complete  
> **Project:** Task Dashboard — full auth flow added  
> **New files:** `AuthContext.jsx`, `authApi.js`, `LoginPage.jsx`  
> **Modified:** `ProtectedRoute.jsx`, `taskApi.js`, `Header.jsx`, `App.jsx`, `main.jsx`, `App.css`, `db.json`

---

## 1. Topic Overview

Authentication is the process of verifying **who a user is** before granting access to protected resources. Phase 10 adds a complete auth flow to the Task Dashboard:

- **Login page** with controlled form, error handling, and post-login redirect
- **AuthContext** — a React context that owns all auth state (user, token, login, logout)
- **JWT tokens** — industry-standard stateless authentication
- **Protected routes** — upgraded from a localStorage flag to real auth context
- **Token attachment** — every API request automatically carries the JWT
- **Session persistence** — login survives page refreshes (token stored in localStorage)
- **Token expiry detection** — expired tokens are cleared on app load

---

## 2. Why Authentication Exists

Without authentication, every visitor to your app can:
- See all data (including other users' data)
- Modify or delete any record
- Perform admin actions

Authentication answers two questions:
1. **Identity:** "Who are you?" → Solved by login (credential verification)
2. **Permission:** "What are you allowed to do?" → Solved by authorization (roles, scopes)

> **Auth vs Authz:** Authentication = who you are. Authorization = what you're allowed to do. They are different concepts, often confused.

---

## 3. The Problem Authentication Solves

**Without auth:**
```
GET /tasks → returns ALL tasks (anyone can see everyone's tasks)
DELETE /tasks/5 → deletes task 5 (anyone can delete anything)
```

**With auth:**
```
GET /tasks
Headers: Authorization: Bearer eyJ...
→ Backend decodes token → gets userId=1 → returns only user 1's tasks

DELETE /tasks/5
Headers: Authorization: Bearer eyJ...
→ Backend verifies task 5 belongs to user 1 → allows or denies
```

The frontend's role: obtain a token at login and send it with every subsequent request. The **backend** is responsible for actual security enforcement.

> 🔑 **KEY INSIGHT:** ProtectedRoute is UX protection (nice experience), NOT security. Real security lives in the backend. A user can always open DevTools and bypass ProtectedRoute. What they CANNOT bypass is a properly secured API that validates every token server-side.

---

## 4. JWT — Internal Working

### Structure

A JWT is three Base64url-encoded strings joined by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsImV4cCI6MTcwMH0.SflKxwRJSMeKKF2QT4fwpMeJf
     HEADER                      PAYLOAD                         SIGNATURE
```

**Decode the header:**
```json
{ "alg": "HS256", "typ": "JWT" }
```
→ Algorithm used to sign (HMAC-SHA256). The "alg" field tells the server how to verify.

**Decode the payload (the "claims"):**
```json
{
  "userId": 1,
  "email": "shrikant@example.com",
  "name": "Shrikant Thakre",
  "role": "admin",
  "exp": 1700000000,   ← expiry (Unix timestamp, seconds)
  "iat": 1699996400    ← issued at
}
```
→ Any JSON data can go here. It's readable by anyone — don't put passwords here.

**The signature:**
```
HMAC-SHA256(
  base64url(header) + "." + base64url(payload),
  SERVER_SECRET_KEY
)
```
→ Only the server knows `SERVER_SECRET_KEY`. Anyone can read the payload, but cannot fake a valid signature without the secret. This is what makes JWTs trustworthy.

### How the Server Validates a Token

```
1. Receive: Authorization: Bearer eyJ...
2. Split token into header + payload + signature
3. Re-compute: HMAC-SHA256(header + "." + payload, SERVER_SECRET_KEY)
4. Compare computed signature with received signature
5. If they match → token is valid → trust the payload
6. Check exp → if expired → reject with 401
7. Use userId from payload to query the database
```

### Why Stateless?

Unlike session cookies (where the server stores `{sessionId → userId}` in a database), JWTs embed all the needed information inside the token. The server doesn't need to look up anything — it just verifies the signature. This makes JWTs ideal for **horizontally scaled systems** (multiple servers, no shared session store needed).

---

## 5. Token Storage — The Most Important Security Decision

| Storage | XSS Vulnerable | CSRF Vulnerable | Survives Refresh | Use Case |
|---|---|---|---|---|
| `localStorage` | ✅ YES | ❌ No | ✅ Yes | Learning projects, low-risk apps |
| `sessionStorage` | ✅ YES | ❌ No | ❌ No (tab close) | Short-lived sessions |
| `httpOnly Cookie` | ❌ No | ✅ YES (needs CSRF token) | ✅ Yes | **Production apps** |
| Memory (variable) | ❌ No | ❌ No | ❌ No (page refresh) | Maximum security, SPA-only |

### What is XSS?
Cross-Site Scripting — an attacker injects malicious JavaScript into your page. If the token is in `localStorage`, the script does `localStorage.getItem('auth_token')` and steals it. Game over.

**httpOnly cookies** cannot be read by JavaScript (the `httpOnly` flag tells the browser to hide them from `document.cookie`). An XSS attack cannot steal the token.

### What is CSRF?
Cross-Site Request Forgery — an attacker tricks your browser into making a request to your API while the cookie is automatically attached. The server receives a valid (but unwanted) request.

**Mitigation:** CSRF tokens — a secret value sent in headers (not cookies) that the attacker's page cannot read.

### Our Phase 10 Choice
`localStorage` — acceptable for a learning project where we control the entire environment. The interview answer:

> "For this learning project I use localStorage for simplicity. In production I'd use httpOnly cookies with CSRF protection, or keep the token in memory and use refresh tokens in httpOnly cookies for persistence."

---

## 6. The Full Auth Flow — Step by Step

### Login Flow
```
1. User fills email + password → clicks "Sign In"
2. LoginPage calls login(email, password) from useAuth()
3. AuthContext.login():
   a. Sets isLoading = true (shows "Signing in…" on button)
   b. Calls authApi.login(email, password)
   c. authApi queries GET /users?email=...
   d. Finds user, verifies password, creates mock JWT
   e. Returns { user: {id, name, email, role}, token: "eyJ..." }
4. AuthContext:
   a. localStorage.setItem('auth_token', token)  ← persist for refresh
   b. setToken(token) + setUser(user)             ← React state update
   c. setIsLoading(false)
5. isAuthenticated becomes !!user = true
6. LoginPage receives returned user → navigate('/tasks', { replace: true })
7. ProtectedRoute re-renders: isAuthenticated=true → renders DashboardLayout
8. DashboardLayout mounts, TaskProvider fetches tasks (with JWT in header)
```

### Logout Flow
```
1. User clicks "Sign out" in Header
2. Header calls logout() from useAuth()
3. AuthContext.logout():
   a. localStorage.removeItem('auth_token')  ← remove persisted token
   b. setToken(null) + setUser(null)          ← React state update
4. isAuthenticated becomes !!null = false
5. Header calls navigate('/login', { replace: true })
6. ProtectedRoute re-renders: isAuthenticated=false → <Navigate to="/login">
```

### Session Restoration (Page Refresh)
```
1. Browser loads app → AuthProvider mounts
2. useEffect runs (mount only, [] deps):
   a. Reads token from localStorage
   b. Calls isTokenExpired(token):
      - Decodes payload (Base64 → JSON)
      - Checks exp < current time
   c. If valid: setToken(token), setUser(decoded)
   d. setIsInitialising(false)
3. ProtectedRoute's first render: isInitialising=true → returns null (spinner)
4. After useEffect: isInitialising=false, user is set → renders children
```

---

## 7. The `isInitialising` Problem — Critical Concept

This is a subtle but interview-important concept.

**The problem:**
```javascript
// On every app load:
const [user, setUser] = useState(null)  // null initially
// useEffect hasn't run yet → user is null → isAuthenticated=false

// ProtectedRoute:
if (!isAuthenticated) return <Navigate to="/login" />
// ← This fires on the FIRST render, before useEffect reads localStorage!
// User sees /login flash for 1 frame even though they're logged in.
```

**The solution:**
```javascript
const [isInitialising, setIsInitialising] = useState(true)

useEffect(() => {
  const token = localStorage.getItem('auth_token')
  if (token && !isTokenExpired(token)) {
    setUser(decodeToken(token))
  }
  setIsInitialising(false)  // ← now we know the answer
}, [])

// ProtectedRoute:
if (isInitialising) return null  // wait — don't decide yet
if (!isAuthenticated) return <Navigate to="/login" />
return children  // all good
```

**The render sequence:**
```
Render 1: isInitialising=true, user=null    → return null (blank screen, imperceptible)
useEffect: reads localStorage, sets user
Render 2: isInitialising=false, user={...}  → renders children (dashboard)
```

No flash. The blank moment is ~1ms — faster than a human can perceive.

---

## 8. Terminology

| Term | Definition |
|---|---|
| **Authentication (AuthN)** | Verifying identity — "who are you?" |
| **Authorization (AuthZ)** | Verifying permission — "what can you do?" |
| **JWT (JSON Web Token)** | Self-contained, signed token for stateless auth |
| **Bearer token** | Token sent in `Authorization: Bearer <token>` header |
| **Claim** | A key-value pair in the JWT payload (userId, exp, role) |
| **exp** | Expiry claim — Unix timestamp when the token becomes invalid |
| **iat** | Issued-at claim — when the token was created |
| **HMAC-SHA256** | Cryptographic algorithm used to sign JWTs |
| **httpOnly cookie** | Cookie the browser won't expose to JavaScript |
| **XSS** | Cross-Site Scripting — injected JS steals tokens |
| **CSRF** | Cross-Site Request Forgery — tricks browser into making requests |
| **Session** | Server-side auth: server stores `{sessionId → userId}` |
| **Stateless auth** | JWT-based: no server storage needed — token is self-contained |
| **Token refresh** | Using a long-lived refresh token to get a new short-lived access token |
| **isInitialising** | A guard state preventing redirect before session is restored |
| **ProtectedRoute** | A route wrapper that redirects unauthenticated users to /login |

---

## 9. Key APIs / Methods / Hooks

### `useAuth()` — the primary hook
```javascript
const {
  user,            // { id, name, email, role } or null
  token,           // JWT string or null
  isAuthenticated, // boolean — !!user
  isInitialising,  // boolean — true on first load while restoring session
  isLoading,       // boolean — true while login API call is in flight
  error,           // string or null — last login error
  login,           // async (email, password) => user
  logout,          // () => void
} = useAuth()
```

### `authApi`
```javascript
// Returns { user: { id, name, email, role }, token: string }
await authApi.login(email, password)

// Returns true (in production: invalidates token on server)
await authApi.logout()
```

### `decodeToken(token)` — reads JWT payload
```javascript
const payload = decodeToken('eyJ...')
// { userId: 1, email: '...', exp: 1700000000, ... }
```

### `isTokenExpired(token)` — checks expiry
```javascript
isTokenExpired('eyJ...')  // true if exp < current time
```

### Browser APIs used
```javascript
btoa(string)   // encode string to Base64 (used in createMockToken)
atob(string)   // decode Base64 to string (used in decodeToken)
localStorage.setItem('auth_token', token)
localStorage.getItem('auth_token')
localStorage.removeItem('auth_token')
```

---

## 10. Syntax Summary

### AuthProvider + useAuth pattern
```jsx
// context/AuthContext.jsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isInitialising, setIsInitialising] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token && !isTokenExpired(token)) {
      setUser(decodeToken(token))
    }
    setIsInitialising(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { user, token } = await authApi.login(email, password)
    localStorage.setItem('auth_token', token)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isInitialising, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
```

### ProtectedRoute pattern
```jsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitialising } = useAuth()
  const location = useLocation()

  if (isInitialising) return null                         // wait for session restore
  if (!isAuthenticated) return (                          // not logged in
    <Navigate to="/login" state={{ from: location }} replace />
  )
  return children                                         // authenticated ✓
}
```

### Redirect-after-login pattern
```jsx
// LoginPage.jsx
const location = useLocation()
const from = location.state?.from?.pathname || '/tasks'

async function handleSubmit(e) {
  e.preventDefault()
  await login(email, password)
  navigate(from, { replace: true })
}
```

### Attaching JWT to every request (fetch approach)
```javascript
function getAuthHeader() {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
    ...options,
  })
}
```

### Attaching JWT with Axios interceptors (production pattern)
```javascript
import axios from 'axios'

const apiClient = axios.create({ baseURL: BASE_URL })

// Request interceptor — runs before EVERY request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handles 401 (token expired)
apiClient.interceptors.response.use(
  (response) => response,    // success — pass through
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired → log user out
      logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

## 11. Real-World Examples

### Spring Boot backend auth flow
```java
// Spring Boot controller:
@PostMapping("/auth/login")
public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
  User user = userRepository.findByEmail(request.getEmail())
    .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

  if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
    throw new BadCredentialsException("Invalid credentials");
  }

  String token = jwtService.generateToken(user);  // signs with secret key
  return ResponseEntity.ok(new AuthResponse(user.toDto(), token));
}
```

The frontend calls this with `authApi.login()`. The only difference from our mock: the backend does the password comparison and token generation.

### Next.js (full-stack) — httpOnly cookie approach
```javascript
// pages/api/auth/login.js
export default async function handler(req, res) {
  const { email, password } = req.body
  const user = await db.users.findOne({ email })
  const valid = await bcrypt.compare(password, user.passwordHash)

  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' })

  // httpOnly: JS cannot read this cookie — immune to XSS
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; SameSite=Strict; Secure`)
  res.json({ user: { id: user.id, name: user.name } })
}
```

---

## 12. Best Practices

1. **Never store passwords in the frontend** — the `authApi.js` password field comparison is mock-only; in production this happens on the backend with bcrypt
2. **Use httpOnly cookies in production** — immune to XSS; localStorage is only for learning
3. **Short expiry times** — access tokens should expire in 15 min to 1 hour; use refresh tokens for longer sessions
4. **Generic error messages** — "Invalid email or password" (not "Email not found" — that leaks user account info)
5. **isInitialising guard** — always protect your app against the session-restore flash
6. **useCallback for login/logout** — keeps context value stable, prevents unnecessary re-renders
7. **Single token storage key** — use a named constant (`TOKEN_KEY`) not a string literal in multiple places
8. **Check expiry on load** — expired tokens should be cleared, not used for API calls
9. **replace: true on navigate** — after login and after logout, use `replace` so the back button behaves sensibly
10. **Derive isAuthenticated** — `!!user` is cleaner than a separate `isAuthenticated` state that could drift out of sync

---

## 13. Common Mistakes

### ❌ Forgetting `isInitialising`
```jsx
// Wrong — flashes /login on every page refresh for logged-in users
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" />
  return children
}

// Correct — waits for session restore
function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitialising } = useAuth()
  if (isInitialising) return null
  if (!isAuthenticated) return <Navigate to="/login" />
  return children
}
```

### ❌ Storing sensitive data in JWT payload
```javascript
// Wrong — anyone can decode the JWT payload
const token = createToken({ userId: 1, password: 'abc123' })

// Correct — only store non-sensitive identifiers
const token = createToken({ userId: 1, email: '...', role: 'admin' })
```

### ❌ Trusting the JWT payload without verification (frontend only)
```javascript
// Wrong — decoding is not verifying
const user = JSON.parse(atob(token.split('.')[1]))
// Setting permissions based on this alone — attacker can craft their own payload!

// Correct — backend ALWAYS re-verifies the signature on every API call
// Frontend reads payload for display only; backend enforces permissions
```

### ❌ Creating a new QueryClient inside the component
```jsx
// Wrong — new QueryClient on every render = cache reset on every render
function App() {
  const queryClient = new QueryClient()  // ← inside component = WRONG
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>
}

// Correct — create outside the component
const queryClient = new QueryClient()  // ← outside = created once
function App() {
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>
}
```

### ❌ Missing `replace: true` on post-login navigate
```javascript
// Wrong — /login gets added to history
navigate('/tasks')
// User presses Back → goes to /login → gets redirected back to /tasks (loop!)

// Correct
navigate('/tasks', { replace: true })
// Back button skips /login entirely
```

### ❌ Not clearing error state before a new login attempt
```javascript
// Wrong — old error shows when user tries again
const login = async (email, password) => {
  setIsLoading(true)
  // ...

// Correct — clear error first
const login = async (email, password) => {
  setIsLoading(true)
  setError(null)  // ← clear previous error
  // ...
```

---

## 14. Performance Considerations

### AuthContext doesn't use useMemo for the context value
```javascript
const value = {
  user, token, isAuthenticated, isInitialising, isLoading, error,
  login, logout
}
```
**Why not useMemo?** The value changes only on auth events (login/logout/token expiry). These are rare. The performance benefit of memoising the object is negligible compared to the cognitive overhead. `login` and `logout` are already `useCallback`-memoised — the function references are stable.

For a context that updates frequently (like TaskContext, which updates on every task mutation), `useMemo` is worth it. For auth state that changes only a few times per session, it's unnecessary.

### Don't put all state in one context
```javascript
// Wrong — one giant context re-renders everyone on every change
const AppContext = createContext({ tasks, user, theme, ... })

// Correct — separate contexts, separate re-render scopes
const AuthContext     = createContext(...)  // only re-renders auth consumers
const ThemeContext    = createContext(...)  // only re-renders theme consumers
const TaskContext     = createContext(...)  // only re-renders task consumers
```

---

## 15. Advantages of This Architecture

1. **Single source of truth** — all auth state lives in AuthContext; no contradictory states
2. **Instant logout** — setting `user = null` instantly re-renders all consumers (no page reload)
3. **Redirect after login** — users land where they were going, not always on the homepage
4. **Session persistence** — login survives page refreshes via localStorage
5. **Token expiry** — stale sessions are cleared on app load, not silently used
6. **Service layer** — token attachment is centralized in `taskApi.js`; components never touch tokens
7. **Consistent pattern** — AuthContext follows the same Provider + custom hook pattern as ThemeContext

---

## 16. Limitations

1. **localStorage XSS risk** — if an attacker can inject JavaScript, they can steal the token
2. **Mock JWT** — our token is Base64-encoded but not cryptographically signed; a real backend rejects it
3. **No token refresh** — when the token expires, the user must log in again (no silent refresh)
4. **No revocation** — we can't invalidate a JWT before it expires (no blocklist)
5. **No role-based protection** — we have `role` in the token but `ProtectedRoute` doesn't check it yet
6. **Password in db.json** — in production, only the password HASH (bcrypt) should be stored

---

## 17. Comparison with Similar Concepts

### JWT vs Session Cookies
| | JWT | Session Cookie |
|---|---|---|
| **State stored** | In token (stateless) | In server DB (stateful) |
| **Scalability** | Excellent (no DB lookup) | Requires shared session store |
| **Revocation** | Hard (need blocklist) | Easy (delete session record) |
| **Size** | ~200-500 bytes | Small (just a session ID) |
| **Use case** | APIs, microservices | Traditional web apps |

### AuthContext vs Redux for Auth
| | AuthContext | Redux |
|---|---|---|
| **Boilerplate** | Minimal | Significant |
| **DevTools** | Basic (React DevTools) | Excellent (Redux DevTools) |
| **Performance** | Fine for auth (rare updates) | Better for high-frequency updates |
| **Learning curve** | Low | High |
| **Recommendation** | ✅ Prefer for auth | Overkill for just auth |

### useCallback in login/logout vs no useCallback
```javascript
// Without useCallback — new function reference on every AuthProvider render
const login = async (email, password) => { ... }

// With useCallback — stable reference, no unnecessary re-renders of consumers
const login = useCallback(async (email, password) => { ... }, [])
```
Auth events are rare, so the difference is small. useCallback is used here as a best practice, not a critical optimization.

---

## 18. Project Implementation Summary

### New files created

**[`src/context/AuthContext.jsx`](../task-dashboard/src/context/AuthContext.jsx)**
- `AuthProvider` component — holds `user`, `token`, `isInitialising`, `isLoading`, `error`
- `login(email, password)` — async, calls authApi, stores token, updates state
- `logout()` — clears localStorage and state
- Session restore `useEffect` — reads token on mount, validates expiry
- `useAuth()` — the only public hook for consuming auth state

**[`src/services/authApi.js`](../task-dashboard/src/services/authApi.js)**
- `authApi.login(email, password)` — queries json-server, verifies password, creates mock JWT
- `authApi.logout()` — stub (real app would call server)
- `decodeToken(token)` — reads JWT payload via `atob()` + `JSON.parse`
- `isTokenExpired(token)` — checks `exp` claim against current timestamp
- `createMockToken(user)` — builds a JWT-shaped token for demo purposes

**[`src/pages/LoginPage.jsx`](../task-dashboard/src/pages/LoginPage.jsx)**
- Controlled form (email + password inputs with useState)
- Reads `error` and `isLoading` from `useAuth()`
- Post-login redirect to `location.state?.from?.pathname || '/tasks'`
- Demo credentials hint box

### Modified files

**[`src/components/ProtectedRoute.jsx`](../task-dashboard/src/components/ProtectedRoute.jsx)**
- Replaced `localStorage.getItem('isAuthenticated')` with `useAuth()`
- Added `isInitialising` guard (no more flash-to-login on reload)

**[`src/services/taskApi.js`](../task-dashboard/src/services/taskApi.js)**
- Added `getAuthHeader()` — reads token from localStorage
- `request()` now spreads `getAuthHeader()` into headers on every call

**[`src/components/Header.jsx`](../task-dashboard/src/components/Header.jsx)**
- Reads `user` and `logout` from `useAuth()`
- Shows user avatar (first initial), user's first name, and "Sign out" button
- `handleLogout()` calls `logout()` then `navigate('/login', { replace: true })`

**[`src/App.jsx`](../task-dashboard/src/App.jsx)**
- Added `<Route path="/login" element={<LoginPage />} />` (public)
- Wrapped DashboardLayout route with `<ProtectedRoute>` (protects all 3 nested routes)

**[`src/main.jsx`](../task-dashboard/src/main.jsx)**
- Added `<AuthProvider>` above `<QueryClientProvider>` in the provider tree

**[`db.json`](../task-dashboard/db.json)**
- Added `users` array with 2 demo users (Shrikant + Demo User)

**[`src/App.css`](../task-dashboard/src/App.css)**
- Login page styles (`.login-page`, `.login-card`, `.login-form`, `.login-error`, `.login-demo-hint`)
- Header user styles (`.header-user`, `.user-avatar`, `.user-name`, `.btn-logout`)
- `.header-meta` flex layout fix

---

## 19. Interview Q&A

**Q: What is JWT and how does it work?**  
A: JWT (JSON Web Token) is a compact, URL-safe token format for stateless authentication. It has three Base64url-encoded parts: header (algorithm), payload (claims like userId and exp), and signature (HMAC-SHA256 of header+payload using a server secret). The frontend sends the token in the `Authorization: Bearer` header. The backend verifies the signature (proving the token wasn't tampered with) and trusts the payload data.

**Q: Where should you store JWT tokens?**  
A: Three options with trade-offs: `localStorage` is simple but XSS-vulnerable (any injected JS can read it). `sessionStorage` is similar but cleared on tab close. `httpOnly cookies` cannot be read by JavaScript at all — immune to XSS — but require CSRF protection. For production: httpOnly cookies. For learning projects: localStorage with the understanding of the risk.

**Q: What is the difference between authentication and authorization?**  
A: Authentication verifies **who you are** (login with credentials). Authorization verifies **what you're allowed to do** (can user A access resource B?). They're separate concerns — a user can be authenticated (logged in) but not authorized (not admin role).

**Q: How does the `isInitialising` pattern work and why is it needed?**  
A: On app load, the first render fires before the `useEffect` that reads localStorage. So `user` is `null` on the first render even if a valid token exists. Without `isInitialising`, `ProtectedRoute` sees `isAuthenticated=false` and redirects to `/login` — a flash the user sees. `isInitialising` starts as `true`, prevents the redirect during that first render, and is set to `false` only after localStorage has been read. The blank screen lasts ~1ms — imperceptible.

**Q: Why use Context for auth instead of Redux?**  
A: Redux adds significant boilerplate (actions, reducers, slices) that isn't justified for auth state, which changes only a few times per session. Context is sufficient: a single `AuthProvider` with `useState` + `useCallback` does everything needed. Redux makes sense when you have complex state with many actions, time-travel debugging needs, or a large team that benefits from the strict Redux patterns.

**Q: What is the ProtectedRoute pattern?**  
A: A wrapper component that checks authentication before rendering its children. If not authenticated, it renders `<Navigate to="/login">` instead. It's a UI pattern — it doesn't provide actual security (users can bypass it via DevTools). Real security is enforced by the backend API which validates the JWT on every request regardless of what the frontend shows.

**Q: How do you attach a JWT to every API request?**  
A: Two approaches. (1) In a fetch-based service layer, read the token from localStorage in a helper (`getAuthHeader()`) and spread it into headers in the shared `request()` function. (2) With axios, use a request interceptor — a middleware function registered on the axios instance that runs before every request and adds the `Authorization` header automatically. The interceptor approach is more elegant as it's truly automatic with no changes to individual API methods.

**Q: What is a token refresh flow?**  
A: Access tokens are short-lived (15min–1hour) to limit damage if stolen. Refresh tokens are long-lived (days/weeks), stored in httpOnly cookies, and used to silently get a new access token when the current one expires. Flow: access token expires → API returns 401 → response interceptor catches 401 → calls `POST /auth/refresh` with the refresh token → receives new access token → retries the original failed request → user never knew anything happened.

---

## 20. Tricky Interview Questions

**Q: If JWTs are "stateless", why would you ever need to revoke one before it expires?**  
A: When a user changes their password, logs out from all devices, their account is compromised, or their role changes. A JWT with `role: admin` that's valid for 1 hour is still valid for that hour even after you remove admin privileges. Solutions: short expiry times, a token blocklist (server stores invalidated token IDs), or embedding a version number in the JWT that's compared against the user record.

**Q: Can an attacker decode a JWT and see the user's data?**  
A: Yes — anyone with the token can decode the payload (it's just Base64). But they cannot *forge* a token or modify the payload without invalidating the signature. This means: never put sensitive data (passwords, full credit card numbers) in JWT payloads. Put non-sensitive identifiers (userId, email, role) that are safe to expose.

**Q: Why does `logout()` work even when the user is offline?**  
A: Because our logout is client-side only — we clear localStorage and React state. The token technically remains valid on the server until expiry, but the client no longer sends it. In a high-security app, you'd also call `POST /auth/logout` to add the token to a server-side blocklist, so it can't be used even if someone captured it.

**Q: What happens if `setUser(user)` and `setToken(token)` are called separately — do you get two re-renders?**  
A: In React 18+, no. React batches multiple `setState` calls that happen in the same event handler or async context (automatic batching). Both state updates are collected and a single re-render is scheduled. In React 17, batching only happened inside synchronous event handlers — async callbacks got two renders. This is one of React 18's key improvements.

**Q: Could `isAuthenticated` go out of sync with `user`?**  
A: Not with our implementation because `isAuthenticated` is derived: `!!user`. It's computed at render time from `user`, not stored separately. If we had `const [isAuthenticated, setIsAuthenticated] = useState(false)` as separate state, we'd need to remember to update both on login/logout — a bug waiting to happen. Deriving from a single source of truth eliminates this class of bug entirely.

**Q: Your `ProtectedRoute` returns `null` during `isInitialising`. What does the user see?**  
A: A blank page for approximately 1 millisecond — the time it takes for JavaScript to read one localStorage entry and call `setIsInitialising(false)`. This is imperceptible to humans. The threshold for perceptible delay is ~100ms. A proper implementation would show a loading spinner for a smoother experience, but for apps where session restoration is fast, `null` is acceptable.

---

## 21. Revision Cheat Sheet

```
JWT = header.payload.signature
  header   = { alg, typ }                 Base64 encoded
  payload  = { userId, exp, role, ... }   Base64 encoded (readable, not secret)
  signature = HMAC-SHA256(header+payload, SECRET_KEY)  — only server can create

Token storage:
  localStorage   → XSS vulnerable, survives refresh     ← we use this (learning)
  sessionStorage → XSS vulnerable, cleared on tab close
  httpOnly cookie → XSS immune, needs CSRF protection   ← production standard

Auth flow:
  Login  → POST /auth/login → receive {user, token} → store token → set user state
  Logout → remove token from storage → set user=null → navigate to /login
  Refresh → read token from storage → validate expiry → restore session

isInitialising:
  true  → loading session from storage → ProtectedRoute returns null (wait)
  false → decision made → redirect or render children

ProtectedRoute logic:
  if (isInitialising) return null
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children

Token in requests:
  getAuthHeader() reads localStorage → returns { Authorization: "Bearer eyJ..." }
  request() spreads getAuthHeader() into headers on every fetch call

Provider order: BrowserRouter → AuthProvider → QueryClientProvider → ThemeProvider → TaskProvider

Derive don't store: isAuthenticated = !!user (not separate state)
```

---

## 22. Key Takeaways

1. **Auth is UI protection, not security** — backend must validate every request regardless
2. **JWT = Header + Payload + Signature** — payload is readable, signature is unforgeable
3. **isInitialising prevents flash-to-login** — always guard ProtectedRoute against premature redirect
4. **Derive isAuthenticated from user** — `!!user` stays in sync automatically
5. **useCallback stabilizes login/logout** — prevents unnecessary re-renders of auth consumers
6. **Token attachment belongs in the service layer** — components never touch tokens directly
7. **Replace: true after login/logout** — prevents back-button navigation to auth pages
8. **httpOnly cookies are the production standard** — localStorage is for learning environments
9. **The redirect-after-login pattern** — pass `state.from` in ProtectedRoute, read it in LoginPage
10. **Automatic batching (React 18)** — multiple setState calls in async code = one re-render

---

*Notes created: Phase 10 — Authentication*  
*Next Phase: Phase 11 — Forms with React Hook Form + Zod validation*
