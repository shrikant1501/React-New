// FilterBar.jsx — Phase 6: Wrapped with React.memo.
// activeFilter is a primitive string → stable comparison ✅
// onFilterChange is passed via useCallback from App → stable reference ✅
// Result: FilterBar only re-renders when the active filter actually changes.
// When tasks are added/deleted (App re-renders), FilterBar is SKIPPED.
//
// PROPS RECEIVED:
//   activeFilter   (string)   — the currently active filter value
//   onFilterChange (function) — callback (useCallback-stabilised in App)

import { memo } from 'react'

const FILTERS = [
  { label: 'All',         value: 'all' },
  { label: 'To Do',       value: 'todo' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Done',        value: 'done' },
]

const FilterBar = memo(function FilterBar({ activeFilter, onFilterChange }) {
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
})

export default FilterBar
