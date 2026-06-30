// PriorityIndicator.jsx
// Displays a visual priority level for a task.
// Demonstrates: props with a default value, conditional rendering via object map.
//
// PROPS RECEIVED:
//   level (string): "low" | "medium" | "high"  — defaults to "medium"

function PriorityIndicator({ level = 'medium' }) {
  // Default parameter value via destructuring: if 'level' is not passed by the
  // parent, it automatically uses 'medium'. This is pure JavaScript — not React.
  //
  // Equivalent to:
  //   function PriorityIndicator(props) {
  //     const level = props.level !== undefined ? props.level : 'medium'
  //   }

  const config = {
    low:    { label: 'Low',    className: 'priority-low' },
    medium: { label: 'Medium', className: 'priority-medium' },
    high:   { label: 'High',   className: 'priority-high' },
  }

  // Safely fall back to 'medium' config if an unrecognised level is passed.
  const { label, className } = config[level] || config['medium']

  return (
    <span className={`priority-indicator ${className}`}>
      {label}
    </span>
  )
}

export default PriorityIndicator
