// hooks/useLocalStorage.js
// A custom hook that works exactly like useState, but also persists the value
// to localStorage so it survives page refreshes.
//
// WHY A CUSTOM HOOK?
// The localStorage read + useState + useEffect pattern is needed anywhere
// we want persistent state. Instead of copy-pasting this logic into every
// component that needs it, we extract it into one reusable hook.
//
// This is the primary use case for custom hooks: extracting and sharing
// stateful logic between components.
//
// PARAMETERS:
//   key          (string) — the localStorage key to read/write
//   initialValue (any)    — used if no value exists in localStorage yet
//
// RETURNS:
//   [value, setValue] — identical API to useState
//
// INTERNAL WORKING:
//   1. useState with lazy initialiser: reads from localStorage ONCE on mount
//   2. useEffect with [key, value] deps: writes to localStorage after every change
//   This keeps localStorage as a mirror of the state — always in sync.

import { useState, useEffect } from 'react'

function useLocalStorage(key, initialValue) {
  // ── Step 1: Read from localStorage as initial state ──────────────────────
  // We use LAZY INITIALISATION — passing a function to useState.
  // This function runs only once (on mount). Without lazy init, JSON.parse
  // would run on every render, wasting time even though the result is ignored
  // after the first render.
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      // If a value exists in localStorage, parse it (it was stored as JSON).
      // If not, use the provided initialValue.
      return item !== null ? JSON.parse(item) : initialValue
    } catch (error) {
      // localStorage can fail in private browsing mode or if storage is full.
      // We fall back to initialValue gracefully instead of crashing.
      console.warn(`useLocalStorage: error reading key "${key}":`, error)
      return initialValue
    }
  })

  // ── Step 2: Write to localStorage whenever value changes ─────────────────
  // Dependency array [key, storedValue] means:
  //   - Runs after mount (initial save)
  //   - Runs after any render where key or storedValue changed
  //   - Does NOT run if neither changed (React skips it)
  //
  // WHY is 'key' in the deps? If the caller ever passes a different key
  // (unusual but possible), we need to write to the new key.
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.warn(`useLocalStorage: error writing key "${key}":`, error)
    }
  }, [key, storedValue])

  // Return the same [value, setter] tuple as useState
  // The caller interacts with this exactly like useState — they don't
  // need to know localStorage is involved at all.
  return [storedValue, setStoredValue]
}

export default useLocalStorage
