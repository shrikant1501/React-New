// Section.jsx — Phase 5: Uses TaskCountDisplay to show count + delta.
//
// PROPS RECEIVED:
//   title    (string)        — section heading
//   count    (number)        — item count
//   children (React element) — content between tags

import TaskCountDisplay from './TaskCountDisplay'

function Section({ title, count, children }) {
  return (
    <section className="section">
      <div className="section-header">
        <h2>{title}</h2>
        {count !== undefined && <TaskCountDisplay count={count} />}
      </div>
      <div className="section-body">
        {children}
      </div>
    </section>
  )
}

export default Section
