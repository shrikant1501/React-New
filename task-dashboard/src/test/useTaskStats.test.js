// src/test/useTaskStats.test.js
//
// WHAT THIS FILE TEACHES:
// ─────────────────────────────────────────────────────────────────────────
// renderHook() — tests custom hooks in isolation without a component wrapper.
//
// WHY renderHook()?
// Hooks can only be called inside React components (Rules of Hooks).
// renderHook() provides a minimal component wrapper that calls your hook
// and exposes its return value for assertions.
//
// Without renderHook(), you'd need to write a dummy component:
//   function TestComponent({ tasks }) {
//     const stats = useTaskStats(tasks)
//     return <div data-testid="result">{JSON.stringify(stats)}</div>
//   }
//   render(<TestComponent tasks={TASKS} />)
//   JSON.parse(screen.getByTestId('result').textContent)
//   ← messy; renderHook() is cleaner for pure logic hooks

import { renderHook } from '@testing-library/react'
import useTaskStats from '../hooks/useTaskStats'

const TASKS = [
  { id: 1, status: 'done' },
  { id: 2, status: 'done' },
  { id: 3, status: 'in-progress' },
  { id: 4, status: 'todo' },
  { id: 5, status: 'todo' },
]

describe('useTaskStats', () => {

  it('computes correct counts from a tasks array', () => {
    // renderHook() calls the hook and returns { result, rerender, unmount }
    // result.current — the current return value of the hook
    const { result } = renderHook(() => useTaskStats(TASKS))

    // result.current is whatever the hook returns
    expect(result.current.total).toBe(5)
    expect(result.current.done).toBe(2)
    expect(result.current.inProgress).toBe(1)
    expect(result.current.todo).toBe(2)
  })

  it('returns all zeros for an empty array', () => {
    const { result } = renderHook(() => useTaskStats([]))

    expect(result.current.total).toBe(0)
    expect(result.current.done).toBe(0)
    expect(result.current.inProgress).toBe(0)
    expect(result.current.todo).toBe(0)
  })

  // ── rerender: test that the hook updates when input changes ────────────
  // rerender() re-calls the hook with new arguments and updates result.current.
  it('updates stats when tasks change', () => {
    // Start with one task
    const { result, rerender } = renderHook(
      ({ tasks }) => useTaskStats(tasks),
      { initialProps: { tasks: [{ id: 1, status: 'todo' }] } }
    )

    expect(result.current.todo).toBe(1)
    expect(result.current.done).toBe(0)

    // Simulate adding a done task
    rerender({ tasks: [
      { id: 1, status: 'todo' },
      { id: 2, status: 'done' },
    ]})

    // result.current now reflects the re-rendered state
    expect(result.current.todo).toBe(1)
    expect(result.current.done).toBe(1)
    expect(result.current.total).toBe(2)
  })

})
