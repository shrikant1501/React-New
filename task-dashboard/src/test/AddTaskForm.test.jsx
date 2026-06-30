// src/test/AddTaskForm.test.jsx
//
// WHAT THIS FILE TEACHES:
// ─────────────────────────────────────────────────────────────────────────
// 1. userEvent      — simulates real user interactions (type, click, tab)
// 2. vi.fn()        — creates a mock function to spy on calls
// 3. getByRole()    — find inputs by their accessible role + name
// 4. getByLabelText()— find inputs by their <label> text
// 5. waitFor()      — wait for async DOM assertions
// 6. toHaveBeenCalledWith() — assert what a mock was called with
//
// userEvent vs fireEvent:
// ─────────────────────────────────────────────────────────────────────────
// fireEvent.click(el)    — dispatches a single DOM event (low-level)
// userEvent.click(el)    — simulates the FULL user gesture:
//                          hover, focus, click, blur — like a real user
//
// Always prefer userEvent. fireEvent is for edge cases or performance.
// userEvent is async (returns Promises) — always await it.
//
// getByRole with accessible name:
// ─────────────────────────────────────────────────────────────────────────
// screen.getByRole('textbox', { name: /title/i })
//   ↑ finds an <input> whose accessible name matches "title" (case-insensitive)
//   The accessible name comes from: <label htmlFor="id">, aria-label, aria-labelledby
//   This is the most robust query — doesn't break on text changes in other elements.

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddTaskForm from '../components/AddTaskForm'

describe('AddTaskForm', () => {

  // ── Test 1: renders with correct fields ───────────────────────────────
  it('renders title input, description input, priority select, and submit button', () => {
    render(<AddTaskForm onAddTask={() => {}} />)

    // getByRole('textbox', { name }) — finds input by ARIA role + accessible name.
    // The name comes from the <label htmlFor="task-title"> association.
    // This is preferred over getByPlaceholderText because labels are more stable.
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument()

    // getByRole('combobox') — <select> element's ARIA role is 'combobox'
    expect(screen.getByRole('combobox', { name: /priority/i })).toBeInTheDocument()

    // getByRole('button') — the submit button
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
  })

  // ── Test 2: shows validation error when title is too short ─────────────
  it('shows a validation error when title is fewer than 3 characters', async () => {
    // userEvent.setup() — creates a user-event instance.
    // Always call setup() at the top of the test, not once globally.
    const user = userEvent.setup()

    render(<AddTaskForm onAddTask={() => {}} />)

    const titleInput = screen.getByRole('textbox', { name: /title/i })

    // userEvent.type() — types text character by character (fires keydown/keyup/input)
    // userEvent.click() — full hover + focus + click + release sequence
    // Both return Promises — must be awaited
    await user.type(titleInput, 'ab')  // only 2 chars — below min of 3

    // tab away to trigger onBlur validation (mode: 'onBlur' in useForm)
    await user.tab()

    // waitFor() — retries the assertion until it passes or times out (1000ms default).
    // Needed for anything async: validation state updates, API responses.
    // Without waitFor, the assertion might run before React re-renders with the error.
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/at least 3/i)
    })
  })

  // ── Test 3: calls onAddTask with correct data when form is valid ────────
  it('calls onAddTask with the task data when submitted with valid input', async () => {
    const user = userEvent.setup()

    // vi.fn() — creates a Vitest mock function.
    // Tracks: how many times it was called, with what arguments, return values.
    // Equivalent to jest.fn() — identical API.
    const mockOnAddTask = vi.fn()

    render(<AddTaskForm onAddTask={mockOnAddTask} />)

    const titleInput = screen.getByRole('textbox', { name: /title/i })
    const submitBtn  = screen.getByRole('button',  { name: /add task/i })

    // Type a valid title (≥ 3 chars)
    await user.type(titleInput, 'Test task title')

    // Click submit
    await user.click(submitBtn)

    // toHaveBeenCalledOnce() — asserts the mock was called exactly once.
    // toHaveBeenCalledWith() — asserts the arguments passed to the mock.
    // objectContaining() — partial match (we don't care about ALL properties)
    await waitFor(() => {
      expect(mockOnAddTask).toHaveBeenCalledOnce()
      expect(mockOnAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test task title',
          status: 'todo',
          priority: 'medium',  // default value
        })
      )
    })
  })

  // ── Test 4: submit button is disabled while isSubmitting ───────────────
  it('disables the submit button when isSubmitting is true', () => {
    // No user interaction needed — pure prop-driven rendering test.
    // No need for async here.
    render(<AddTaskForm onAddTask={() => {}} isSubmitting={true} />)

    const btn = screen.getByRole('button', { name: /adding/i })

    // toBeDisabled() — checks the disabled attribute on the element
    expect(btn).toBeDisabled()
  })

})
