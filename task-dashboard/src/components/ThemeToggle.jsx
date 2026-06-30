// components/ThemeToggle.jsx
// A button that toggles between dark and light mode.
// Demonstrates: consuming ThemeContext without any props from parent.
// The parent (App) does NOT need to know this component exists or pass it anything.
// This component reaches context directly — zero prop drilling.

import { useTheme } from '../context/ThemeContext'

function ThemeToggle() {
  // Direct context access — no props needed from parent
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Currently: ${theme} mode. Click to switch.`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

export default ThemeToggle
