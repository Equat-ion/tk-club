'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useArchiveTask,
  useChangeTaskStatus,
  type TaskWithRelations,
} from '@/hooks/use-tasks'
import { useEventMembers } from '@/hooks/use-teams'
import { TaskList, CreateTaskDialog } from '@/components/tasks'
import type { TaskStatus } from '@/lib/database.types'

export default function TasksPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [currentMemberId, setCurrentMemberId] = useState<string>('')
  const [currentMemberRole, setCurrentMemberRole] = useState<'owner' | 'admin' | 'member'>('member')

  const { data: members = [] } = useEventMembers(eventId)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const archiveTask = useArchiveTask()
  const changeStatus = useChangeTaskStatus()

  // Get current user's member ID and role
  useEffect(() => {
    async function getCurrentMember() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const member = members.find(m => m.userId === user.id)
      if (member) {
        setCurrentMemberId(member.id)
        setCurrentMemberRole(member.role as 'owner' | 'admin' | 'member')
      }
    }

    if (members.length > 0) {
      getCurrentMember()
    }
  }, [members, router, supabase])

  const handleCreateTask = async (data: {
    title: string
    description?: string
    assigneeId?: string
    teamId?: string
    priority: 'low' | 'high'
    dueAt?: string
  }) => {
    try {
      await createTask.mutateAsync({
        eventId: eventId,
        assignerId: currentMemberId,
        assigneeId: data.assigneeId || null,
        teamId: data.teamId || null,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        dueAt: data.dueAt || null,
        status: 'inbox',
      })
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleEditTask = async (data: {
    title: string
    description?: string
    assigneeId?: string
    teamId?: string
    priority: 'low' | 'high'
    dueAt?: string
  }) => {
    if (!editingTask) return

    try {
      await updateTask.mutateAsync({
        id: editingTask.id,
        eventId: eventId,
        title: data.title,
        description: data.description || null,
        assigneeId: data.assigneeId || null,
        teamId: data.teamId || null,
        priority: data.priority,
        dueAt: data.dueAt || null,
        status: editingTask.status,
      })
      setEditingTask(null)
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleStatusChange = async (
    taskId: string,
    status: TaskStatus,
    waitingReason?: string
  ) => {
    try {
      await changeStatus.mutateAsync({
        id: taskId,
        eventId: eventId,
        status,
        waitingReason,
      })
    } catch (error) {
      console.error('Failed to change status:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync({ id: taskId, eventId })
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleArchiveTask = async (taskId: string) => {
    try {
      await archiveTask.mutateAsync({ id: taskId, eventId })
    } catch (error) {
      console.error('Failed to archive task:', error)
    }
  }

  if (!currentMemberId) {
    return <div className="flex items-center justify-center h-full">Loading...</div>
  }

  return (
    <div className="flex h-full flex-col">
      <TaskList
        eventId={eventId}
        currentMemberId={currentMemberId}
        currentMemberRole={currentMemberRole}
        onCreateTask={() => {
          setEditingTask(null)
          setCreateDialogOpen(true)
        }}
        onEditTask={(task) => {
          setEditingTask(task)
          setCreateDialogOpen(true)
        }}
        onStatusChange={handleStatusChange}
        onDeleteTask={handleDeleteTask}
        onArchiveTask={handleArchiveTask}
      />

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        eventId={eventId}
        currentMemberId={currentMemberId}
        currentMemberRole={currentMemberRole}
        editingTask={editingTask}
        onSubmit={editingTask ? handleEditTask : handleCreateTask}
      />
    </div>
  )
}
