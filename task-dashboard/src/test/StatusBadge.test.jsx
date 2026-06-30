// src/test/StatusBadge.test.jsx
//
// WHAT THIS FILE TEACHES:
// ─────────────────────────────────────────────────────────────────────────
// 1. render()        — mount a component into a virtual DOM for testing
// 2. screen         — query the rendered DOM (the "Testing Library" way)
// 3. getByRole()    — find elements by ARIA role (preferred query method)
// 4. toBeInTheDocument() — assert element exists in the DOM
// 5. toHaveClass()  — assert CSS class is applied
// 6. toHaveTextContent() — assert text content
//
// THE "TESTING TROPHY" PHILOSOPHY (Kent C. Dodds):
// ─────────────────────────────────────────────────────────────────────────
// "Test the way users interact with your app, not implementation details."
//
// BAD (implementation detail test):
//   expect(component.state.isActive).toBe(true)   ← tests internals
//   expect(wrapper.find('span').props().className) ← tests CSS class names
//
// GOOD (user-centric test):
//   expect(screen.getByRole('status')).toHaveTextContent('Done') ← tests what users see
//
// QUERY PRIORITY (use in this order):
// ─────────────────────────────────────────────────────────────────────────
// 1. getByRole       — most accessible, matches what screen readers see
// 2. getByLabelText  — for form inputs with labels
// 3. getByPlaceholderText — for inputs with placeholders
// 4. getByText       — for any element with visible text
// 5. getByDisplayValue — for select/input current values
// 6. getByAltText    — for images
// 7. getByTitle      — title attribute
// 8. getByTestId     — last resort (avoid coupling tests to data-testid)

import { render, screen } from '@testing-library/react'
import StatusBadge from '../components/StatusBadge'

// describe(): groups related tests together — shows as a block in output
describe('StatusBadge', () => {

  // ── Test 1: renders the correct label ─────────────────────────────────
  it('renders "Done" for status="done"', () => {
    // render() mounts the component into jsdom (virtual browser DOM)
    render(<StatusBadge status="done" />)

    // screen.getByText() — finds element by its visible text content.
    // Throws if not found (use queryByText if you expect it might not exist).
    const badge = screen.getByText('Done')

    // toBeInTheDocument() — from @testing-library/jest-dom
    // Asserts the element exists in the DOM (not just that the query ran).
    expect(badge).toBeInTheDocument()
  })

  it('renders "In Progress" for status="in-progress"', () => {
    render(<StatusBadge status="in-progress" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders "To Do" for status="todo"', () => {
    render(<StatusBadge status="todo" />)
    expect(screen.getByText('To Do')).toBeInTheDocument()
  })

  // ── Test 2: applies the correct CSS class ──────────────────────────────
  // WHY TEST CSS CLASSES?
  // In this case the class drives the colour — it's a user-visible behaviour.
  // But generally, prefer testing visible outcomes over class names.
  it('applies the status-specific CSS class', () => {
    render(<StatusBadge status="done" />)
    const badge = screen.getByText('Done')

    // toHaveClass() — checks className on the element.
    // Can check for one class at a time or multiple.
    expect(badge).toHaveClass('status-badge')
    expect(badge).toHaveClass('status-done')
  })

  // ── Test 3: fallback for unknown status ────────────────────────────────
  // Tests the graceful fallback: labels[status] || status
  it('renders the raw status string for unknown values', () => {
    render(<StatusBadge status="unknown-status" />)
    expect(screen.getByText('unknown-status')).toBeInTheDocument()
  })

})
