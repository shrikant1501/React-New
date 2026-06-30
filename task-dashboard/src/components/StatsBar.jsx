// StatsBar.jsx
// Displays live task counts grouped by status.
// This component is PURELY presentational — it receives computed numbers
// as props and just renders them. It holds no state of its own.
//
// This is a key architectural pattern: separate "smart" components
// (that own state) from "dumb" / presentational components (that only display).
//
// PROPS RECEIVED:
//   total       (number) — total task count
//   done        (number) — completed tasks
//   inProgress  (number) — in-progress tasks
//   todo        (number) — not started tasks

function StatsBar({ total, done, inProgress, todo }) {
  return (
    <div className="stats-bar">
      <div className="stat-item">
        <span className="stat-value">{total}</span>
        <span className="stat-label">Total</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value stat-done">{done}</span>
        <span className="stat-label">Done</span>
      </div>
      <div className="stat-item">
        <span className="stat-value stat-progress">{inProgress}</span>
        <span className="stat-label">In Progress</span>
      </div>
      <div className="stat-item">
        <span className="stat-value stat-todo">{todo}</span>
        <span className="stat-label">To Do</span>
      </div>
    </div>
  )
}

export default StatsBar
