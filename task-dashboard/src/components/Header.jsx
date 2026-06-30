// Header.jsx — Phase 2: Now accepts a currentPhase prop.
// The badge now dynamically shows which phase we are currently studying.
//
// PROPS RECEIVED:
//   currentPhase (number) — the active learning phase (default: 1)

function Header({ currentPhase = 1 }) {
  // Default prop value using JS destructuring default syntax.
  // If the parent doesn't pass currentPhase, it defaults to 1.
  // This protects the component from crashing when a prop is missing.

  return (
    <header className="header">
      <div className="header-brand">
        <h1>Task Dashboard</h1>
        <p>Manage your work, one task at a time</p>
      </div>
      <div className="header-meta">
        {/* Dynamic value from props — no longer hardcoded "Phase 1" */}
        <span className="badge">Phase {currentPhase}</span>
      </div>
    </header>
  )
}

export default Header
