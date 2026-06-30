// context/ThemeContext.jsx
// Provides dark/light theme to the entire application.
// Demonstrates: a second independent context alongside TaskContext.
//
// WHY A SEPARATE CONTEXT?
// Theme changes completely independently of task data.
// If theme and tasks were in one context, every task mutation would
// also re-render every theme consumer — unnecessary coupling.
// Separate contexts = separate subscriptions = minimal re-renders.
//
// PATTERN: Context + custom hook + localStorage persistence.
// This is the exact same pattern used for auth, locale, and feature flags
// in production applications.

import { createContext, useContext, useState, useEffect, useMemo } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  // Persist theme across refreshes using localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  // Apply theme class to <html> element — affects all CSS variables
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    // data-theme on <html> is a CSS convention:
    // [data-theme="light"] { --color-bg: #ffffff; ... }
    // [data-theme="dark"]  { --color-bg: #0f1117; ... }
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  // useMemo: stable context value — doesn't change unless theme changes
  const value = useMemo(() => ({ theme, toggleTheme }), [theme])
  // Note: toggleTheme is defined inline here, which creates a new function
  // on each ThemeProvider render. For this small context this is acceptable.
  // For stricter optimisation, useCallback could be used.

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook — the only public API for consuming theme
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a <ThemeProvider>')
  }
  return context
}
