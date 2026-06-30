// AddTaskForm.jsx — Phase 5: Production-quality form.
//
// DEMONSTRATES:
//   1. useRef for DOM access — auto-focus title input on mount
//   2. useFormValidation custom hook — validation, touched state, errors
//   3. Character count — real-time feedback using controlled input
//   4. Accessible error messages — aria-describedby, role="alert"
//   5. Disabled submit — prevent submission when form is invalid
//   6. Visual field states — error borders, error text
//
// CONTROLLED vs UNCONTROLLED in this form:
//   All inputs are CONTROLLED — state drives every field value.
//   The title field ALSO uses a ref, but only to call .focus() on mount.
//   Having a ref AND being controlled is valid — they serve different purposes:
//     ref → access the DOM node (for focus, measurements)
//     value/onChange → control what's displayed (React's job)

import { useRef, useEffect } from 'react'
import useFormValidation from '../hooks/useFormValidation'

// ─── Validation Rules ─────────────────────────────────────────────────────────
// Defined OUTSIDE the component — stable reference across renders.
// If defined inside, a new object would be created on every render,
// which would make useCallback deps unstable in useFormValidation.

const TITLE_MAX = 80
const DESC_MAX  = 200

const VALIDATION_RULES = {
  title: (value) => {
    if (!value || !value.trim())       return 'Title is required'
    if (value.trim().length < 3)       return 'Title must be at least 3 characters'
    if (value.length > TITLE_MAX)      return `Title must be ${TITLE_MAX} characters or fewer`
    return null   // null = no error
  },
  description: (value) => {
    if (value && value.length > DESC_MAX)
      return `Description must be ${DESC_MAX} characters or fewer`
    return null
  },
}

const INITIAL_VALUES = {
  title:       '',
  description: '',
  priority:    'medium',
}

// ─── Component ────────────────────────────────────────────────────────────────

function AddTaskForm({ onAddTask }) {
  // ── useRef: DOM access for auto-focus ─────────────────────────────────────
  // We want to focus the title input when the form mounts.
  // We cannot do this in render (side effect) — it goes in useEffect.
  // useRef gives us the bridge to the actual DOM node.
  const titleInputRef = useRef(null)

  useEffect(() => {
    // After mount: titleInputRef.current is the real <input> DOM node.
    // We call the browser's native .focus() method directly.
    // This is one of the main reasons useRef exists — imperative DOM access
    // for things React doesn't expose declaratively.
    titleInputRef.current?.focus()
    // ?. optional chaining: safe if ref is somehow null (defensive coding)
  }, [])   // [] = run once on mount

  // ── useFormValidation: validation logic via custom hook ───────────────────
  const {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  } = useFormValidation(INITIAL_VALUES, VALIDATION_RULES)

  // ── Form submit handler ───────────────────────────────────────────────────
  // handleSubmit() returns an event handler.
  // It validates, calls onSubmit only if valid, then we also reset.
  const onSubmit = handleSubmit((validValues) => {
    onAddTask({
      title:       validValues.title.trim(),
      description: validValues.description.trim(),
      priority:    validValues.priority,
      status:      'todo',
    })
    reset()

    // After reset, re-focus the title field for rapid task entry
    // Small timeout gives React one render cycle to update the input value
    setTimeout(() => titleInputRef.current?.focus(), 0)
  })

  // ─── Derived display values ───────────────────────────────────────────────
  const titleCharsLeft = TITLE_MAX - values.title.length
  const descCharsLeft  = DESC_MAX  - values.description.length

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form className="add-task-form" onSubmit={onSubmit} noValidate>
      {/* noValidate: disables browser's native validation UI — we handle it */}

      <h3 className="form-title">Add New Task</h3>

      {/* ── Title Field ──────────────────────────────────────────────────── */}
      <div className="form-group">
        <div className="form-field-row">
          <label className="form-label" htmlFor="task-title">
            Title <span className="required-mark">*</span>
          </label>
          <span className={`char-count ${titleCharsLeft < 10 ? 'char-count-warn' : ''}`}>
            {titleCharsLeft}
          </span>
        </div>

        <input
          id="task-title"
          ref={titleInputRef}
          // ↑ ref attaches React to the DOM node — does NOT make this uncontrolled.
          //   This input is STILL controlled (has value + onChange below).
          //   ref is used separately, only for .focus() in useEffect.
          className={`form-input ${errors.title ? 'form-input-error' : ''}`}
          type="text"
          placeholder="e.g. Learn useRef and useEffect..."
          value={values.title}
          onChange={e => handleChange('title', e.target.value)}
          onBlur={() => handleBlur('title')}
          // onBlur: fires when input loses focus — marks field as "touched"
          // Errors only show for touched fields (better UX than showing on first render)
          aria-describedby={errors.title ? 'title-error' : undefined}
          // aria-describedby: accessibility — screen readers announce the error
          maxLength={TITLE_MAX + 10}
          // Allow a few extra chars so they can see the error before being cut off
        />

        {/* Error message — only shown when field is touched AND has an error */}
        {errors.title && (
          <span id="title-error" className="form-error" role="alert">
            {errors.title}
          </span>
          // role="alert": accessibility — screen readers immediately read this
        )}
      </div>

      {/* ── Description Field ────────────────────────────────────────────── */}
      <div className="form-group">
        <div className="form-field-row">
          <label className="form-label" htmlFor="task-desc">Description</label>
          <span className={`char-count ${descCharsLeft < 20 ? 'char-count-warn' : ''}`}>
            {descCharsLeft}
          </span>
        </div>

        <input
          id="task-desc"
          className={`form-input ${errors.description ? 'form-input-error' : ''}`}
          type="text"
          placeholder="Optional — what does this task involve?"
          value={values.description}
          onChange={e => handleChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          aria-describedby={errors.description ? 'desc-error' : undefined}
        />

        {errors.description && (
          <span id="desc-error" className="form-error" role="alert">
            {errors.description}
          </span>
        )}
      </div>

      {/* ── Priority + Submit Row ─────────────────────────────────────────── */}
      <div className="form-row">
        <select
          className="form-select"
          value={values.priority}
          onChange={e => handleChange('priority', e.target.value)}
          aria-label="Task priority"
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={touched.title && !isValid}
          // Disabled only AFTER the user has touched the title field.
          // Before that, allow the first submit attempt to show all errors.
          // This prevents a confusing "why can't I click?" experience for new users.
        >
          Add Task
        </button>
      </div>

    </form>
  )
}

export default AddTaskForm
