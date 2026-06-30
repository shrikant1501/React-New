// AddTaskForm.jsx — Phase 11: Migrated to React Hook Form + Zod.
//
// WHAT CHANGED FROM PHASE 5:
// ─────────────────────────────────────────────────────────────────────────
// Before: useState for every field + custom useFormValidation hook
//         → Re-render on every keystroke (controlled inputs)
//
// After:  React Hook Form (useRef-based, uncontrolled inputs)
//         → Zero re-renders while typing; only re-renders on error state changes
//
// KEY CONCEPTS:
// ─────────────────────────────────────────────────────────────────────────
// 1. useForm()       — initialises the form; returns register, handleSubmit, etc.
// 2. register()      — connects an input to RHF via a ref (NOT useState)
// 3. handleSubmit()  — wraps your submit handler; only calls it when valid
// 4. formState       — { errors, isSubmitting, isDirty, isValid, ... }
// 5. zodResolver     — bridges Zod schema to RHF's validation system
// 6. reset()         — programmatically reset form to defaultValues
//
// UNCONTROLLED INPUTS:
// ─────────────────────────────────────────────────────────────────────────
// register('title') returns:
//   { name: 'title', ref: fn, onChange: fn, onBlur: fn }
//
// Spread onto the input:
//   <input {...register('title')} />
//
// RHF's ref stores the DOM node internally.
// Values are read from the DOM on submit/validate — never via React state.
// This is why RHF is fast: no useState = no re-render on keystroke.
//
// EXCEPTION: When you need to watch a value live (e.g., char count display),
// you must use the watch() function or use { mode: 'onChange' }.
// We use watch('title') and watch('description') for the char counters
// to preserve that feature from Phase 5.

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Zod Schema ───────────────────────────────────────────────────────────────
//
// The schema is the single source of truth for:
//   - What fields exist
//   - Their types and constraints
//   - Error messages
//
// In TypeScript projects: z.infer<typeof taskSchema> gives you the type for free.
// In JavaScript: it's just validation logic — still very useful.
//
// z.string()       → must be a string
// .min(n, msg)     → minimum length
// .max(n, msg)     → maximum length
// .trim()          → trim whitespace before validating
// .optional()      → field can be undefined/empty
// z.enum([...])    → must be one of the listed values

const TITLE_MAX = 80
const DESC_MAX  = 200

const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3,         'Title must be at least 3 characters')
    .max(TITLE_MAX, `Title must be ${TITLE_MAX} characters or fewer`),

  description: z
    .string()
    .max(DESC_MAX, `Description must be ${DESC_MAX} characters or fewer`)
    .optional()
    .or(z.literal('')),  // allow empty string (optional field)

  priority: z.enum(['low', 'medium', 'high']),
})

// ─── Component ────────────────────────────────────────────────────────────────

function AddTaskForm({ onAddTask, isSubmitting = false }) {

  // ── useForm: the heart of React Hook Form ─────────────────────────────────
  //
  // resolver: zodResolver(taskSchema) → RHF uses Zod to validate on submit/blur
  //
  // defaultValues: initial field values (like initialValues in our custom hook)
  // Important: always provide defaultValues for controlled selects/checkboxes
  //
  // mode: 'onBlur' → validate when a field loses focus (same UX as Phase 5)
  // Other options: 'onChange' (every keystroke), 'onSubmit' (submit only)
  //
  const {
    register,      // connects input to RHF
    handleSubmit,  // wraps submit handler with validation
    formState: {
      errors,       // { title: { message: '...' }, ... }
      isValid,      // true when schema passes (respects mode)
    },
    reset,         // programmatically reset all fields to defaultValues
    watch,         // subscribe to a field's live value (causes re-render on change)
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title:       '',
      description: '',
      priority:    'medium',
    },
    mode: 'onBlur',  // validate on blur → same UX as Phase 5
  })

  // ── watch: subscribe to live values for char count display ────────────────
  //
  // watch() reads the current DOM value and causes a re-render when it changes.
  // This is the one case where RHF re-renders on change — only for watched fields.
  // Use sparingly: only watch fields where you need live feedback.
  //
  // Alternative: use the native input event with a ref. But watch() is cleaner.
  const titleValue = watch('title') || ''
  const descValue  = watch('description') || ''

  // ── Auto-focus on mount (same as Phase 5) ─────────────────────────────────
  // RHF's register() sets up the ref internally. We can still get a ref to
  // the input by using the ref callback pattern from register():
  //   const { ref: titleRef, ...titleReg } = register('title')
  //   <input ref={node => { titleRef(node); myRef.current = node }} ...titleReg />
  //
  // Simpler: just use autoFocus on the input element directly.
  // autoFocus is a native HTML attribute — works without any JS/refs.

  // ── Submit handler ─────────────────────────────────────────────────────────
  //
  // handleSubmit(onValid, onInvalid):
  //   - onValid: called with the validated form values when schema passes
  //   - onInvalid: optional — called with errors when validation fails
  //
  // RHF calls e.preventDefault() for you — you don't need to.
  //
  // data parameter: the parsed, validated values from the Zod schema
  // After Zod validation, trim() has already been applied.
  //
  const onSubmit = handleSubmit((data) => {
    onAddTask({
      title:       data.title,        // already trimmed by Zod schema
      description: data.description || '',
      priority:    data.priority,
      status:      'todo',
      phase:       11,
    })
    reset()  // clears all fields back to defaultValues
  })

  return (
    <form className="add-task-form" onSubmit={onSubmit} noValidate>
      <h3 className="form-title">Add New Task</h3>

      {/* ── Title Field ──────────────────────────────────────────────────── */}
      <div className="form-group">
        <div className="form-field-row">
          <label className="form-label" htmlFor="task-title">
            Title <span className="required-mark">*</span>
          </label>
          <span className={`char-count ${TITLE_MAX - titleValue.length < 10 ? 'char-count-warn' : ''}`}>
            {TITLE_MAX - titleValue.length}
          </span>
        </div>

        {/*
          register('title') returns:
            { name: 'title', ref: ..., onChange: ..., onBlur: ... }
          Spreading it on the input hooks it into RHF.
          autoFocus: native HTML attribute for initial focus.
        */}
        <input
          id="task-title"
          type="text"
          placeholder="e.g. Learn React Hook Form..."
          autoFocus
          className={`form-input ${errors.title ? 'form-input-error' : ''}`}
          aria-describedby={errors.title ? 'title-error' : undefined}
          {...register('title')}
        />

        {/*
          errors.title is set by RHF/Zod when validation fails.
          errors.title.message is the string from our Zod schema (.min(3, 'message here'))
        */}
        {errors.title && (
          <span id="title-error" className="form-error" role="alert">
            {errors.title.message}
          </span>
        )}
      </div>

      {/* ── Description Field ────────────────────────────────────────────── */}
      <div className="form-group">
        <div className="form-field-row">
          <label className="form-label" htmlFor="task-desc">Description</label>
          <span className={`char-count ${DESC_MAX - descValue.length < 20 ? 'char-count-warn' : ''}`}>
            {DESC_MAX - descValue.length}
          </span>
        </div>

        <input
          id="task-desc"
          type="text"
          placeholder="Optional — what does this task involve?"
          className={`form-input ${errors.description ? 'form-input-error' : ''}`}
          aria-describedby={errors.description ? 'desc-error' : undefined}
          {...register('description')}
        />

        {errors.description && (
          <span id="desc-error" className="form-error" role="alert">
            {errors.description.message}
          </span>
        )}
      </div>

      {/* ── Priority + Submit Row ─────────────────────────────────────────── */}
      <div className="form-row">
        <select
          className="form-select"
          aria-label="Task priority"
          {...register('priority')}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>

        {/*
          disabled when isSubmitting (API call in flight) OR when the form has
          errors AND the user has interacted at least once (!isValid only matters
          after first blur/submit — mode:'onBlur').
          isSubmitting here = the prop from parent (API mutation pending).
        */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding…' : 'Add Task'}
        </button>
      </div>

    </form>
  )
}

export default AddTaskForm
