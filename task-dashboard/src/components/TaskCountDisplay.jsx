// TaskCountDisplay.jsx
// Displays the current task count with a "previously X" hint.
// Demonstrates usePrevious — tracking the previous render's value using useRef.
//
// PROPS RECEIVED:
//   count (number) — current total task count

import usePrevious from '../hooks/usePrevious'

function TaskCountDisplay({ count }) {
  const prevCount = usePrevious(count)

  // prevCount is undefined on first render (nothing stored yet)
  // From the second render onward, it holds the count from the previous render

  const diff = prevCount !== undefined ? count - prevCount : 0
  const changed = diff !== 0

  return (
    <div className="task-count-display">
      <span className="tcd-current">{count} tasks</span>

      {/* Only show the change indicator if count actually changed */}
      {changed && (
        <span className={`tcd-delta ${diff > 0 ? 'tcd-added' : 'tcd-removed'}`}>
          {diff > 0 ? `+${diff}` : diff}
        </span>
      )}
    </div>
  )
}

export default TaskCountDisplay
