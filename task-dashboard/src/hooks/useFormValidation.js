// hooks/useFormValidation.js
// A custom hook that manages form field values, touched state, and validation errors.
//
// WHY THIS EXISTS:
//   Form validation logic (touched tracking, error computation, submit handling)
//   is the same boilerplate in every form. By extracting it into a hook, each
//   form component gets clean, declarative validation without repetition.
//   This is the philosophy behind libraries like React Hook Form — we're
//   building a miniature version to understand the concept deeply.
//
// PARAMETERS:
//   initialValues  (object) — initial field values  e.g. { title: '', priority: 'medium' }
//   validationRules (object) — map of fieldName → validator function
//                              validator: (value, allValues) → errorString | null
//
// RETURNS:
//   values      — current field values
//   errors      — current validation errors (only for touched fields)
//   touched     — which fields have been interacted with
//   isValid     — true if no errors exist across ALL fields
//   handleChange(field, value) — update a field value
//   handleBlur(field)          — mark a field as touched
//   handleSubmit(onSubmit)     — returns a submit handler that validates first
//   reset()                    — reset to initial values

import { useState, useCallback } from 'react'

function useFormValidation(initialValues, validationRules = {}) {
  const [values, setValues]   = useState(initialValues)
  const [touched, setTouched] = useState({})

  // Compute errors from current values — derived, not stored state.
  // Re-computed on every render automatically. No sync needed.
  const errors = Object.keys(validationRules).reduce((acc, field) => {
    const error = validationRules[field](values[field], values)
    if (error) acc[field] = error
    return acc
  }, {})

  // A form is valid when there are no errors in any field
  const isValid = Object.keys(errors).length === 0

  // useCallback: prevents handleChange from being recreated on every render.
  // This is important when passing handleChange as a prop to child inputs —
  // a stable reference prevents unnecessary child re-renders.
  // We'll cover useCallback deeply in Phase 7; introduced here in context.
  const handleChange = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleBlur = useCallback((field) => {
    // Mark field as "touched" — errors only show for touched fields.
    // This prevents showing errors on fields the user hasn't interacted with yet.
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  // Returns an event handler for the form's onSubmit.
  // On submit: mark ALL fields as touched (show all errors), then call
  // the provided onSubmit callback only if the form is valid.
  const handleSubmit = useCallback((onSubmit) => {
    return (e) => {
      e.preventDefault()

      // Mark every field as touched so all errors become visible
      const allTouched = Object.keys(validationRules).reduce((acc, field) => {
        acc[field] = true
        return acc
      }, {})
      setTouched(allTouched)

      // Only call the success handler if there are no errors
      if (isValid) {
        onSubmit(values)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, values, validationRules])

  const reset = useCallback(() => {
    setValues(initialValues)
    setTouched({})
  }, [initialValues])

  return {
    values,
    // Only expose errors for fields that have been touched.
    // Untouched fields have no errors shown — better UX.
    errors: Object.keys(errors).reduce((acc, field) => {
      if (touched[field]) acc[field] = errors[field]
      return acc
    }, {}),
    touched,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  }
}

export default useFormValidation
