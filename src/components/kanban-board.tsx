'use client'

import { useState } from 'react'
import { X, Plus, Trash } from '@phosphor-icons/react'
import type { Tables } from '@/lib/database.types'
import {
  useTaskColumns,
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from '@/hooks/use-tasks'
import {
  KanbanBoardProvider,
  KanbanBoardColumn,
  KanbanBoardColumnHeader,
  KanbanBoardColumnTitle,
  KanbanBoardColumnList,
  KanbanBoardColumnListItem,
  KanbanBoardColumnFooter,
  KanbanBoardColumnButton,
  KanbanBoardCard,
  KanbanBoardCardTitle,
  KanbanBoardCardDescription,
  KanbanBoardCardTextarea,
  KanbanBoardCardButtonGroup,
  KanbanBoardCardButton,
  type KanbanBoardDropDirection,
} from '@/components/kanban'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type TaskColumn = Tables<'task_columns'>
type Task = Tables<'tasks'>

type KanbanBoardProps = {
  eventId: string
}

export function KanbanBoard({ eventId }: KanbanBoardProps) {
  const { data: columns = [], isLoading: columnsLoading } = useTaskColumns(eventId)
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(eventId)
  
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskText, setEditingTaskText] = useState('')
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const isLoading = columnsLoading || tasksLoading

  // Group tasks by column
  const tasksByColumn = tasks.reduce(
    (acc, task) => {
      if (!acc[task.column_id]) {
        acc[task.column_id] = []
      }
      acc[task.column_id].push(task)
      return acc
    },
    {} as Record<string, Task[]>,
  )

  const handleCreateTask = (columnId: string) => {
    const maxOrderIndex = Math.max(
      ...(tasksByColumn[columnId]?.map(t => t.order_index) ?? [0]),
      0,
    )

    createTask.mutate({
      event_id: eventId,
      column_id: columnId,
      title: 'New task',
      priority: 'low',
      order_index: maxOrderIndex + 1,
    })
  }

  const handleUpdateTask = (taskId: string, title: string) => {
    updateTask.mutate({
      id: taskId,
      eventId,
      title,
    })
    setEditingTaskId(null)
    setEditingTaskText('')
  }

  const handleDeleteTask = () => {
    if (deletingTaskId) {
      deleteTask.mutate({ id: deletingTaskId, eventId })
      setDeletingTaskId(null)
    }
  }

  const handleDropOverListItem = (
    columnId: string,
    targetTaskId: string,
    dataTransferData: string,
    dropDirection: KanbanBoardDropDirection,
  ) => {
    const draggedTask = JSON.parse(dataTransferData) as Task
    const targetColumn = columns.find(c => c.id === columnId)
    const tasksInColumn = tasksByColumn[columnId] || []
    const sourceColumn = columns.find(c => c.id === draggedTask.column_id)
    
    if (!targetColumn || !sourceColumn) return
    
    // Enforce task flow: can only move to Done from In Progress
    if (targetColumn.name === 'Done' && sourceColumn.name !== 'In Progress') {
      return
    }

    // Find the target task
    const targetTaskIndex = tasksInColumn.findIndex(t => t.id === targetTaskId)
    if (targetTaskIndex === -1) return

    // Calculate new order index based on drop direction
    const targetTask = tasksInColumn[targetTaskIndex]
    let newOrderIndex: number

    if (dropDirection === 'top') {
      // Insert before target task
      const prevTask = tasksInColumn[targetTaskIndex - 1]
      newOrderIndex = prevTask
        ? (prevTask.order_index + targetTask.order_index) / 2
        : targetTask.order_index - 1
    } else {
      // Insert after target task
      const nextTask = tasksInColumn[targetTaskIndex + 1]
      newOrderIndex = nextTask
        ? (targetTask.order_index + nextTask.order_index) / 2
        : targetTask.order_index + 1
    }

    // Update the dragged task
    updateTask.mutate({
      id: draggedTask.id,
      eventId,
      column_id: columnId,
      order_index: newOrderIndex,
    })
  }

  const handleDropOverColumn = (columnId: string, dataTransferData: string) => {
    const draggedTask = JSON.parse(dataTransferData) as Task
    const tasksInColumn = tasksByColumn[columnId] || []
    const maxOrderIndex = Math.max(...tasksInColumn.map(t => t.order_index), 0)
    const targetColumn = columns.find(c => c.id === columnId)
    const sourceColumn = columns.find(c => c.id === draggedTask.column_id)
    
    if (!targetColumn || !sourceColumn) return
    
    // Enforce task flow: can only move to Done from In Progress
    if (targetColumn.name === 'Done' && sourceColumn.name !== 'In Progress') {
      return
    }

    updateTask.mutate({
      id: draggedTask.id,
      eventId,
      column_id: columnId,
      order_index: maxOrderIndex + 1,
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

  return (
    <>
      <KanbanBoardProvider>
        <div className="flex h-full gap-4 overflow-x-auto p-6">
          {columns.map(column => {
            const columnTasks = tasksByColumn[column.id] || []
            const isNotStarted = column.name === 'Not Started'
            const isInProgress = column.name === 'In Progress'
            const isDone = column.name === 'Done'
            
            // Empty state messages
            let emptyMessage = ''
            if (columnTasks.length === 0) {
              if (isNotStarted) {
                emptyMessage = 'No tasks yet. Create your first task to get started!'
              } else if (isInProgress) {
                emptyMessage = 'Move tasks from Not Started to begin working on them.'
              } else if (isDone) {
                emptyMessage = 'Complete tasks from In Progress to see them here.'
              }
            }

            return (
              <KanbanBoardColumn
                key={column.id}
                columnId={column.id}
                onDropOverColumn={data => handleDropOverColumn(column.id, data)}
                className="w-80 shrink-0"
              >
                <KanbanBoardColumnHeader>
                  <KanbanBoardColumnTitle
                    columnId={column.id}
                    className="flex items-center justify-between"
                  >
                    <span>{column.name}</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      {columnTasks.length}
                    </span>
                  </KanbanBoardColumnTitle>
                </KanbanBoardColumnHeader>

                <KanbanBoardColumnList>
                  {columnTasks.map(task => (
                    <KanbanBoardColumnListItem
                      key={task.id}
                      cardId={task.id}
                      onDropOverListItem={(data, direction) =>
                        handleDropOverListItem(column.id, task.id, data, direction)
                      }
                    >
                      {editingTaskId === task.id ? (
                        <KanbanBoardCardTextarea
                          value={editingTaskText}
                          onChange={e => setEditingTaskText(e.target.value)}
                          onBlur={() => handleUpdateTask(task.id, editingTaskText)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleUpdateTask(task.id, editingTaskText)
                            }
                            if (e.key === 'Escape') {
                              setEditingTaskId(null)
                              setEditingTaskText('')
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <KanbanBoardCard
                          data={task}
                          onClick={() => {
                            setEditingTaskId(task.id)
                            setEditingTaskText(task.title)
                          }}
                        >
                          <KanbanBoardCardTitle>{task.title}</KanbanBoardCardTitle>
                          {task.description && (
                            <KanbanBoardCardDescription>
                              {task.description}
                            </KanbanBoardCardDescription>
                          )}
                          <KanbanBoardCardButtonGroup>
                            <KanbanBoardCardButton
                              tooltip="Delete task"
                              aria-label="Delete task"
                              onClick={e => {
                                e.stopPropagation()
                                setDeletingTaskId(task.id)
                              }}
                            >
                              <X weight="bold" />
                            </KanbanBoardCardButton>
                          </KanbanBoardCardButtonGroup>
                        </KanbanBoardCard>
                      )}
                    </KanbanBoardColumnListItem>
                  ))}
                  {columnTasks.length === 0 && emptyMessage && (
                    <div className="flex items-center justify-center p-4 text-center">
                      <p className="text-muted-foreground text-sm">{emptyMessage}</p>
                    </div>
                  )}
                </KanbanBoardColumnList>

                {isNotStarted && (
                  <KanbanBoardColumnFooter>
                    <KanbanBoardColumnButton onClick={() => handleCreateTask(column.id)} aria-label="Add new task">
                      <Plus className="mr-1 size-4" />
                      Add task
                    </KanbanBoardColumnButton>
                  </KanbanBoardColumnFooter>
                )}
              </KanbanBoardColumn>
            )
          })}
        </div>
      </KanbanBoardProvider>

      {/* Delete task confirmation dialog */}
      <AlertDialog open={!!deletingTaskId} onOpenChange={() => setDeletingTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the task. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTask.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} disabled={deleteTask.isPending}>
              {deleteTask.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
