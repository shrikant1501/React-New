// src/services/taskApi.js
//
// The API service layer — ALL network calls live here.
//
// WHY A SERVICE LAYER?
// ─────────────────────
// Components should not contain fetch() calls directly. Reasons:
//   1. Separation of concerns — components describe UI, services handle network
//   2. Single place to change if the API URL or format changes
//   3. Easy to mock in tests — just mock this one import
//   4. Easy to add auth headers later (Phase 10) — one place to change
//   5. Reusable — multiple components can call taskApi.getAll() cleanly
//
// STRUCTURE:
//   request()  — shared helper that handles all fetch boilerplate
//   taskApi    — object with one method per API endpoint

const BASE_URL = import.meta.env.VITE_API_URL
// → "http://localhost:3001"  in development  (.env.development)
// → "https://api...."        in production   (.env.production)

// ─── Shared request helper ───────────────────────────────────────────────────
//
// Centralises the two fetch gotchas:
//   1. fetch() only rejects on network failure — must manually check res.ok
//   2. res.json() must be called separately — response body is a stream
//
// Every taskApi method calls this instead of fetch() directly.
async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    // Default headers — merge with any headers passed by the caller
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  // fetch does NOT throw on 404/500 — we must check res.ok manually
  // res.ok is true when status is 200–299
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  // 204 No Content (e.g. DELETE response) has no body — calling .json() would throw
  if (res.status === 204) return null

  return res.json()
}

// ─── Task API ─────────────────────────────────────────────────────────────────
//
// Each method maps to one REST endpoint:
//   GET    /tasks       → getAll()
//   GET    /tasks/:id   → getById(id)
//   POST   /tasks       → create(task)
//   PUT    /tasks/:id   → update(id, changes)
//   DELETE /tasks/:id   → remove(id)
//
// This matches a standard Spring Boot REST controller exactly.
// Swapping json-server for a real backend = zero changes in components.

export const taskApi = {
  // GET /tasks → array of all tasks
  getAll: () =>
    request('/tasks'),

  // GET /tasks/:id → single task object
  getById: (id) =>
    request(`/tasks/${id}`),

  // POST /tasks — body: { title, status, priority, phase, description }
  // json-server auto-assigns an id
  create: (task) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  // PUT /tasks/:id — replaces the entire task object
  // Use PATCH for partial updates — json-server supports both
  update: (id, changes) =>
    request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    }),

  // PATCH /tasks/:id — partial update (only the fields you send change)
  patch: (id, changes) =>
    request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),

  // DELETE /tasks/:id — json-server returns 200 with deleted object
  remove: (id) =>
    request(`/tasks/${id}`, {
      method: 'DELETE',
    }),
}
