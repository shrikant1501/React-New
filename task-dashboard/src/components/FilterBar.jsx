// FilterBar.jsx
// Renders filter buttons: All / Todo / In Progress / Done
// Demonstrates:
//   - Receiving state + setter as props (lifted state pattern)
//   - Conditional className based on active filter
//   - Iterating over a config array to render buttons (DRY principle)
//
// PROPS RECEIVED:
//   activeFilter  (string)   — the currently active filter value
//   onFilterChange (function) — callback: called with the new filter value when clicked
//
// NOTE ON STATE OWNERSHIP:
// FilterBar does NOT own the filter state. The state lives in App (Phase 3).
// FilterBar only receives the current value and a way to change it.
// This is "lifting state up" — the state lives at the lowest common ancestor
// that needs it (App needs it to filter the task list AND pass it here).

const FILTERS = [
  { label: 'All',         value: 'all' },
  { label: 'To Do',       value: 'todo' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Done',        value: 'done' },
]

function FilterBar({ activeFilter, onFilterChange }) {
  return (
    <div className="filter-bar">
      {FILTERS.map(filter => (
        <button
          key={filter.value}
          // Conditional className: active button gets extra styling
          // This is a very common pattern — className based on state comparison
          className={`filter-btn ${activeFilter === filter.value ? 'filter-btn-active' : ''}`}
          onClick={() => onFilterChange(filter.value)}
          // ↑ We call the callback prop with the new filter value.
          // This is the child-to-parent communication pattern:
          //   Child (FilterBar) → calls onFilterChange → Parent (App) updates state
          //   Parent re-renders → passes new activeFilter back down → FilterBar highlights correct button
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

export default FilterBar
