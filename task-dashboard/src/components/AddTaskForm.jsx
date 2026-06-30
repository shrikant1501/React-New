// AddTaskForm.jsx
// A form component for adding new tasks.
//
// DEMONSTRATES:
//   1. LOCAL STATE — form field values are managed inside this component
//   2. CONTROLLED COMPONENTS — input values are driven by state (covered deeply in Phase 5)
//   3. FORM HANDLING — onSubmit, preventDefault, input onChange
//   4. STATE RESET — clearing the form after successful submission
//   5. CALLBACK PROP — notifying the parent (App) about the new task
//
// PROPS RECEIVED:
//   onAddTask (function) — called with new task data when form is submitted
//
// WHY LOCAL STATE HERE?
// The form field values (title, description) are only relevant to this form.
// No other component needs to know what the user is currently typing.
// Once submitted, the result is sent UP to App via the onAddTask callback.
// This is exactly where local state belongs — data used by one component.

import { useState } from 'react'

function AddTaskForm({ onAddTask }) {
  // Local state — only this component cares about these values
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')

  function handleSubmit(event) {
    // event.preventDefault() stops the browser's default form submission
    // which would cause a full page reload (the old HTML behaviour).
    // In React SPAs, we handle form submission entirely in JavaScript.
    event.preventDefault()

    // Guard: don't submit if title is empty (after trimming whitespace)
    if (!title.trim()) return

    // Build the new task object.
    // We don't set an 'id' here — the parent (App) assigns it.
    // This keeps AddTaskForm unaware of the existing task list.
    onAddTask({
      title: title.trim(),
      description: description.trim(),
      priority,
      status: 'todo',    // new tasks always start as 'todo'
    })

    // Reset the form after successful submission
    // This is why we use state for form values — we can reset them programmatically
    setTitle('')
    setDescription('')
    setPriority('medium')
  }

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <h3 className="form-title">Add New Task</h3>

      <div className="form-group">
        <input
          className="form-input"
          type="text"
          placeholder="Task title..."
          value={title}
          // onChange fires on every keystroke.
          // e.target.value is the current value of the input.
          // We update state → React re-renders → input reflects new state.
          // This is a CONTROLLED INPUT — state drives the displayed value.
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div className="form-group">
        <input
          className="form-input"
          type="text"
          placeholder="Description (optional)..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div className="form-row">
        <select
          className="form-select"
          value={priority}
          onChange={e => setPriority(e.target.value)}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>

        <button type="submit" className="btn btn-primary">
          Add Task
        </button>
      </div>
    </form>
  )
}

export default AddTaskForm
