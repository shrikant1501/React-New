// FilterBar.jsx — Phase 12: clsx for conditional active class.
//
// DEMONSTRATES the object syntax of clsx:
//   clsx('filter-btn', { 'filter-btn-active': condition })
//
// The object { 'className': boolean } is the most readable clsx pattern
// when you have a single boolean condition. It reads like plain English:
//   "add filter-btn-active when this filter is active"
//
// Compare to the old template literal approach:
//   `filter-btn ${activeFilter === filter.value ? 'filter-btn-active' : ''}`
//   ↑ The trailing empty string '' is messy — clsx discards falsy values cleanly.

import { memo } from 'react'
import clsx from 'clsx'

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
          // clsx object syntax: { 'className': boolean }
          // 'filter-btn-active' is added only when the condition is true.
          // No trailing empty string when inactive — clsx handles it.
          className={clsx('filter-btn', {
            'filter-btn-active': activeFilter === filter.value,
          })}
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
})

export default FilterBar
