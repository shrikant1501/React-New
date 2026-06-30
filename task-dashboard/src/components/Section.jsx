// Section.jsx
// A layout wrapper component that demonstrates the 'children' prop.
// The children prop is special — React automatically populates it with
// whatever JSX is placed between <Section>...</Section> tags.
//
// PROPS RECEIVED:
//   title    (string)         — section heading
//   count    (number)         — item count to show in badge
//   children (React element)  — whatever is nested between the tags (automatic)
//
// WHY THIS PATTERN EXISTS:
// Without children, every layout wrapper would need to know exactly which
// components to render, making it tightly coupled and non-reusable.
// With children, the wrapper provides structure (title, count, padding)
// while the parent decides what content fills it.

function Section({ title, count, children }) {
  return (
    <section className="section">
      <div className="section-header">
        <h2>{title}</h2>
        {/* Short-circuit: only render the badge if count was passed */}
        {count !== undefined && (
          <span className="task-count">{count} tasks</span>
        )}
      </div>

      {/* children is rendered here — the parent controls what appears */}
      <div className="section-body">
        {children}
      </div>
    </section>
  )
}

export default Section
