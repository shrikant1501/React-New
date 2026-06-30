// src/services/authApi.js
//
// Authentication service layer — all auth-related network calls live here.
//
// REAL-WORLD vs MOCK:
// ─────────────────────────────────────────────────────────────────────────
// In production (Spring Boot / Node.js backend):
//   POST /auth/login  → backend verifies password hash, creates JWT, returns it
//   POST /auth/logout → backend invalidates the token (if using blocklist)
//   GET  /auth/me     → backend validates token, returns current user profile
//
// With json-server (our mock):
//   json-server doesn't generate JWTs — it just stores raw data.
//   So we simulate the flow:
//     1. GET /users?email=... → find the user record
//     2. Compare password directly (in production: bcrypt.compare() on backend)
//     3. Build a fake JWT-shaped token using btoa() (Base64 encoding)
//
// This gives us the exact same AUTH FLOW as production — only the token
// generation moves from backend to frontend mock.
//
// IMPORTANT: In production, NEVER send passwords from backend to frontend,
// NEVER compare passwords in the frontend, and NEVER generate tokens on
// the frontend. All of that lives on the server. This is MOCK ONLY.

const BASE_URL = import.meta.env.VITE_API_URL

// ─── Mock JWT Generator ────────────────────────────────────────────────────
//
// Creates a fake JWT-shaped token (3 Base64 parts separated by dots).
// Real JWTs use HMAC-SHA256 to sign the payload — only the server can verify.
// Our mock just encodes the data — this is NOT cryptographically secure.
// It illustrates the JWT structure for learning purposes.
//
// Real JWT structure:
//   header.payload.signature
//   eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjF9.SflKxwRJSM...
//
function createMockToken(user) {
  // Header: algorithm + token type
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))

  // Payload: the claims — who the user is, when the token expires
  // In production: backend generates this with the actual secret key
  const payload = btoa(JSON.stringify({
    userId:  user.id,
    email:   user.email,
    name:    user.name,
    role:    user.role,
    // exp: expiry time — Unix timestamp (seconds since epoch)
    // 1 hour from now: Date.now() gives milliseconds, divide by 1000 for seconds
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
    iat: Math.floor(Date.now() / 1000), // issued at
  }))

  // Signature: in production this is HMAC-SHA256(header + '.' + payload, secretKey)
  // Our mock uses a placeholder — it would fail real JWT verification
  const signature = btoa('mock-signature-not-cryptographically-secure')

  return `${header}.${payload}.${signature}`
}

// ─── Token Decoder ─────────────────────────────────────────────────────────
//
// Reads the payload section of a JWT without verifying the signature.
// This is safe for reading user data from a stored token.
//
// In production: frontend can decode to READ the payload, but NEVER trusts
// the data blindly — the backend verifies the signature on every API call.
//
// Real libraries like 'jwt-decode' do exactly this same Base64 decoding.
//
export function decodeToken(token) {
  try {
    // JWT is: header.payload.signature — split on '.' and take index 1
    const payloadBase64 = token.split('.')[1]
    // atob() is the browser's built-in Base64 decoder (opposite of btoa)
    return JSON.parse(atob(payloadBase64))
  } catch {
    // Malformed token — return null so the caller can handle gracefully
    return null
  }
}

// ─── Token Expiry Check ────────────────────────────────────────────────────
//
// JWTs contain an 'exp' claim (expiry timestamp in seconds).
// We check this on app load — if the stored token is expired, we log the
// user out immediately rather than making API calls with an expired token.
//
export function isTokenExpired(token) {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  // Date.now() is milliseconds → divide by 1000 to compare with exp (seconds)
  return decoded.exp < Math.floor(Date.now() / 1000)
}

// ─── Auth API ──────────────────────────────────────────────────────────────

export const authApi = {
  // POST /auth/login (simulated — real backend would do this server-side)
  //
  // In production (Spring Boot):
  //   const res = await fetch(`${BASE_URL}/auth/login`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ email, password })
  //   })
  //   const { user, token } = await res.json()
  //   return { user, token }
  //
  // Our mock queries the users collection directly:
  login: async (email, password) => {
    // Step 1: Find user by email in json-server's /users collection
    const res = await fetch(`${BASE_URL}/users?email=${encodeURIComponent(email)}`)

    if (!res.ok) {
      throw new Error('Network error — is the API server running?')
    }

    const users = await res.json()

    // Step 2: Check if a user with this email exists
    if (users.length === 0) {
      // In production: return a generic "Invalid credentials" message
      // NEVER say "email not found" — that leaks user account info to attackers
      throw new Error('Invalid email or password')
    }

    const user = users[0]

    // Step 3: Verify password
    // In production: backend runs bcrypt.compare(password, user.passwordHash)
    // bcrypt is a one-way hash — the original password is never stored
    if (user.password !== password) {
      throw new Error('Invalid email or password')
    }

    // Step 4: Create token — in production this happens on the backend
    const token = createMockToken(user)

    // Step 5: Return user (without password!) + token
    // NEVER send the password field back to the frontend
    const { password: _omit, ...safeUser } = user
    return { user: safeUser, token }
  },

  // In a real app, POST /auth/logout would invalidate the token on the server.
  // With stateless JWTs, logout is mostly a client-side operation:
  // just delete the token. The server can optionally maintain a "token blocklist".
  logout: async () => {
    // Real implementation: await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' })
    // Our mock: nothing to do — the caller clears localStorage
    return true
  },
}
