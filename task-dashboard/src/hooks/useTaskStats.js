// hooks/useTaskStats.js
// A custom hook that computes task statistics from a tasks array.
//
// WHY A CUSTOM HOOK HERE?
// This is pure computation — no side effects, no state. It doesn't actually
// need to be a hook (it could just be a plain function).
// However, we build it as a hook for two reasons:
//   1. Demonstrates the pattern of extracting logic out of components
//   2. Future-proof: if we add useMemo optimisation later, it stays here
//
// This is an example of a "logic extraction" custom hook — it makes
// App.jsx cleaner by moving stat computation out of the component body.
//
// NOTE: Not all shared logic needs to be a hook. If it doesn't use any
// React hooks internally, a plain utility function is equally correct
// and actually preferred (no use* naming restriction, works anywhere).
// The distinction matters in interviews — understand the trade-off.
//
// PARAMETERS:
//   tasks (array) — the full array of task objects
//
// RETURNS:
//   { total, done, inProgress, todo } — counts by status

function useTaskStats(tasks) {
  // These are simple derived computations — no useState or useEffect needed.
  // They recalculate automatically whenever this hook is called (on every render
  // of the component that uses it).
  const total      = tasks.length
  const done       = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const todo       = tasks.filter(t => t.status === 'todo').length

  return { total, done, inProgress, todo }
}

export default useTaskStats
