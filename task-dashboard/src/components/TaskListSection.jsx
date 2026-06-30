// components/TaskListSection.jsx
// Renders the filtered task list — reads ALL needed data from context.
// This component takes ZERO props from its parent.
// It self-sufficiently reads tasks, filter, and dispatch from context.
//
// BEFORE Context (Phase 6):
//   App → Section → FilterBar (via props)
//   App → Section → TaskCard×N (via props)
//   App managed: tasks, filter, visibleTasks, all handlers
//
// AFTER Context (Phase 7):
//   TaskListSection reads everything from context directly.
//   The component tree is FLAT from App's perspective — no prop chains.
//
// NOTE: TaskCard still receives individual task props.
// Passing the whole task object and individual handlers is intentional:
//   - TaskCard remains a "dumb" component — testable without context
//   - Individual props enable React.memo comparison (primitives)
//   - Context is for SHARED state, not for replacing all prop passing

import { memo } from 'react'
import { useTasks, useTaskDispatch, useFilter } from '../context/TaskContext'
import TaskCard from './TaskCard'
import FilterBar from './FilterBar'
import Section from './Section'

// memo: TaskListSection itself is lightweight — its children (TaskCards) are memo'd
function TaskListSection() {
  // Reading from three separate contexts — each subscription is independent.
  // A theme change will NOT cause this component to re-render.
  // A filter change will ONLY cause this component to re-render (and FilterBar).
  const { visibleTasks }                  = useTasks()
  const { deleteTask, updateTaskStatus }  = useTaskDispatch()
  const { activeFilter, setActiveFilter } = useFilter()

  return (
    <Section title="My Tasks" count={visibleTasks.length}>

      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <div className="task-grid">
        {visibleTasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks match this filter.</p>
          </div>
        ) : (
          visibleTasks.map(task => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              status={task.status}
              priority={task.priority}
              phase={task.phase}
              // Dispatch functions from context — stable via useCallback
              onDelete={deleteTask}
              onStatusChange={updateTaskStatus}
            />
          ))
        )}
      </div>

    </Section>
  )
}

export default TaskListSection
