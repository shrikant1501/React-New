// StatusBadge.jsx
// A single-responsibility component: displays a coloured status label.
// Extracted from TaskCard so it can be reused anywhere in the app.
//
// PROPS RECEIVED:
//   status (string): "todo" | "in-progress" | "done"
//
// JAVASCRIPT CONCEPT IN USE:
//   Template literals — `status-${status}` builds a dynamic className string.
//   This is standard ES6 JavaScript, not React-specific.

function StatusBadge({ status }) {
  // We build the CSS class name dynamically using a template literal.
  // If status = "done"        → className = "status-badge status-done"
  // If status = "in-progress" → className = "status-badge status-in-progress"
  // If status = "todo"        → className = "status-badge status-todo"
  // The CSS for each of these was already written in App.css in Phase 1.
  const className = `status-badge status-${status}`

  // We use a lookup object to display human-readable labels.
  // This is cleaner than a chain of if/else or a switch statement.
  // It's a common pattern called an "object map" or "lookup table".
  const labels = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'done': 'Done',
  }

  // labels[status] looks up the human label.
  // The || fallback handles any unexpected status value gracefully.
  return (
    <span className={className}>
      {labels[status] || status}
    </span>
  )
}

export default StatusBadge
