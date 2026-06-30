// src/components/ErrorBoundary.jsx
//
// WHY A CLASS COMPONENT?
// ─────────────────────────────────────────────────────────────────────────
// Error boundaries MUST be class components. There is no hooks equivalent.
// React has not exposed getDerivedStateFromError or componentDidCatch
// as hooks — this is one of the few remaining reasons to write a class.
//
// React 19 introduced use() and improved Suspense, but error boundaries
// are still class-only. This is explicitly documented in the React docs.
//
// WHAT IT CATCHES:
//   ✅ Errors during rendering (in the render method / JSX evaluation)
//   ✅ Errors in lifecycle methods of child components
//   ✅ Errors in constructors of child components
//
// WHAT IT DOES NOT CATCH:
//   ❌ Event handlers (use try/catch inside them instead)
//   ❌ Async code (setTimeout, fetch — errors don't happen during render)
//   ❌ Server-side rendering
//   ❌ Errors inside the ErrorBoundary itself
//
// THE TWO KEY LIFECYCLE METHODS:
// ─────────────────────────────────────────────────────────────────────────
// 1. static getDerivedStateFromError(error)
//    → Called during the RENDER phase when a child throws
//    → Returns new state: { hasError: true }
//    → Must be static — no side effects here (it's in the render phase)
//    → Used to: switch to the fallback UI
//
// 2. componentDidCatch(error, info)
//    → Called during the COMMIT phase (after the DOM update)
//    → Receives: error (the thrown value) + info.componentStack (which component threw)
//    → Used to: log errors to Sentry, Datadog, console, etc.
//    → Can have side effects (it's after render)
//
// USAGE:
//   <ErrorBoundary fallback={<p>Something went wrong</p>}>
//     <ComponentThatMightCrash />
//   </ErrorBoundary>
//
//   <ErrorBoundary>   ← uses default fallback
//     <ComponentThatMightCrash />
//   </ErrorBoundary>

import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    // State: hasError switches us to the fallback UI
    // error: stored so we can display the message
    this.state = { hasError: false, error: null }
  }

  // ── getDerivedStateFromError ────────────────────────────────────────────
  // Static method — called synchronously when a descendant throws during render.
  // Returns the state update that switches us to the error UI.
  // Must be PURE (no side effects) — it runs during the render phase.
  static getDerivedStateFromError(error) {
    // Tell the component to render the fallback instead of children
    return { hasError: true, error }
  }

  // ── componentDidCatch ──────────────────────────────────────────────────
  // Called AFTER the DOM has been updated with the fallback UI.
  // This is the right place for side effects: logging, reporting.
  //
  // info.componentStack: a string like:
  //   "at TaskCard (TaskCard.jsx:51)"
  //   "at TaskListSection (TaskListSection.jsx:12)"
  //   "at TasksPage ..."
  // Invaluable for debugging in production.
  componentDidCatch(error, info) {
    // In production: replace this with your error tracking service
    //   Sentry.captureException(error, { extra: info })
    //   LogRocket.captureException(error)
    console.error('ErrorBoundary caught an error:', error)
    console.error('Component stack:', info.componentStack)
  }

  // ── Reset ──────────────────────────────────────────────────────────────
  // Allow users to retry — resets state back to { hasError: false }.
  // The children re-mount and attempt to render again.
  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback takes priority if passed as a prop
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI — production-quality error screen
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <span className="error-boundary-icon">⚠️</span>
            <h2>Something went wrong</h2>
            <p className="error-boundary-message">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              className="btn btn-primary"
              onClick={this.handleReset}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    // No error — render children normally
    return this.props.children
  }
}

export default ErrorBoundary
