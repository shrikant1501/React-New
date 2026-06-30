// context/TaskContext.jsx — Phase 9: Migrated to React Query.
//
// WHAT CHANGED FROM PHASE 7/8:
// ─────────────────────────────
// Before: Tasks lived in useState + localStorage inside this context.
//         This file managed: task array, CRUD operations, localStorage persistence.
//
// After:  Tasks live on the SERVER (json-server / Spring Boot).
//         React Query owns the cache and all fetching logic.
//         This context now only provides:
//           - A thin wrapper so components don't import React Query directly
//           - Derived/computed values (stats, visibleTasks)
//           - Mutation functions (create, update, delete) that call the API
//
// WHY KEEP CONTEXT AT ALL?
// React Query's useQuery/useMutation can be called directly in components.
// We keep context for two reasons:
//   1. Components don't need to know about React Query — they just call useTasks()
//   2. Computed values (stats) are derived once here, not in every component
//
// SPLIT CONTEXT PATTERN (from Phase 7) is maintained:
//   TaskStateContext   → tasks data, stats, loading, error (read-only)
//   TaskDispatchContext → mutation functions (write-only)
//
// This prevents components that only write (AddTaskForm) from re-rendering
// when the task list changes.

import { createContext, useContext, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskApi } from '../services/taskApi'

// ─── Contexts ────────────────────────────────────────────────────────────────

const TaskStateContext    = createContext(null)
const TaskDispatchContext = createContext(null)

// ─── Query Keys ──────────────────────────────────────────────────────────────
// Query keys are the cache identifiers React Query uses.
// Same key = same cache entry. All components using ['tasks'] share one fetch.
// Using a constant prevents typos and makes refactoring easy.
export const TASK_KEYS = {
  all:    ['tasks'],
  detail: (id) => ['tasks', id],
}

// ─── TaskProvider ─────────────────────────────────────────────────────────────

export function TaskProvider({ children }) {
  const queryClient = useQueryClient()

  // ── Fetch all tasks ────────────────────────────────────────────────────────
  // useQuery handles: fetching, caching, background refetch, loading/error state.
  // On mount: checks cache first. If stale/empty, calls taskApi.getAll().
  // On window focus: refetches in background if data is stale.
  const {
    data: tasks = [],   // default to [] so map() never fails before data arrives
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: TASK_KEYS.all,       // cache key — ['tasks']
    queryFn:  taskApi.getAll,      // the function that fetches data
  })

  // ── Derived / computed values ──────────────────────────────────────────────
  // Computed once here — all consumers get the same memoised values.
  const stats = useMemo(() => ({
    total:      tasks.length,
    todo:       tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done:       tasks.filter(t => t.status === 'done').length,
  }), [tasks])

  // visibleTasks: sorted by id descending (newest first)
  const visibleTasks = useMemo(() =>
    [...tasks].sort((a, b) => b.id - a.id),
  [tasks])

  // ── Mutations ─────────────────────────────────────────────────────────────
  // useMutation: for POST/PUT/PATCH/DELETE operations.
  // onSuccess: invalidateQueries tells React Query the cache is stale →
  //            automatically refetches tasks → UI updates with fresh server data.

  const addMutation = useMutation({
    mutationFn: taskApi.create,
    onSuccess: () => {
      // Invalidate the tasks cache — React Query refetches automatically
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })

  const updateStatusMutation = useMutation({
    // mutationFn receives the argument passed to mutation.mutate()
    mutationFn: ({ id, status }) => taskApi.patch(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: taskApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })

  const resetMutation = useMutation({
    // Reset: delete all tasks one by one, then re-seed with initial data.
    // In a real app this would be a single POST /tasks/reset endpoint.
    mutationFn: async () => {
      // Delete all current tasks in parallel
      await Promise.all(tasks.map(t => taskApi.remove(t.id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })

  // ── Dispatch functions (stable API for consumers) ──────────────────────────
  // Wrap mutation.mutate() in named functions — components stay clean.
  // useCallback not needed here: these functions are recreated on render,
  // but TaskDispatchContext value is memoised below — only changes if
  // the mutation objects change (they don't between renders).

  const dispatch = useMemo(() => ({
    addTask: (taskData) => addMutation.mutate(taskData),
    updateTaskStatus: (id, status) => updateStatusMutation.mutate({ id, status }),
    deleteTask: (id) => deleteMutation.mutate(id),
    resetTasks: () => resetMutation.mutate(),
    // Expose mutation states so UI can show per-action loading/error
    isAdding:   addMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }), [addMutation, updateStatusMutation, deleteMutation, resetMutation])

  // ── State context value ────────────────────────────────────────────────────
  const stateValue = useMemo(() => ({
    tasks,
    visibleTasks,
    stats,
    isLoading,    // true on first fetch (no cached data yet)
    isError,
    error,
  }), [tasks, visibleTasks, stats, isLoading, isError, error])

  return (
    <TaskStateContext.Provider value={stateValue}>
      <TaskDispatchContext.Provider value={dispatch}>
        {children}
      </TaskDispatchContext.Provider>
    </TaskStateContext.Provider>
  )
}

// ─── Custom Hooks ─────────────────────────────────────────────────────────────
// Components import these — never the raw contexts.
// If we change the internal implementation, only this file changes.

export function useTasks() {
  const ctx = useContext(TaskStateContext)
  if (!ctx) throw new Error('useTasks must be used inside TaskProvider')
  return ctx
}

export function useTaskDispatch() {
  const ctx = useContext(TaskDispatchContext)
  if (!ctx) throw new Error('useTaskDispatch must be used inside TaskProvider')
  return ctx
}
