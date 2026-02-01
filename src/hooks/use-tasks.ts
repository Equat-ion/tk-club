import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as taskActions from '@/app/actions/tasks'
import * as taskServerActions from '@/app/actions/tasks-server'
import * as teamActions from '@/app/actions/teams'
import { createClient } from '@/lib/supabase/client'

export type Task = Awaited<ReturnType<typeof taskActions.getTasksByEvent>>[number]
export type TaskInsert = Omit<Parameters<typeof taskActions.createTask>[0], 'eventId' | 'assignerId'>
export type TaskUpdate = Partial<Parameters<typeof taskActions.updateTask>[1]>
export type TaskStatus = 'inbox' | 'active' | 'waiting' | 'done'

// Extended task type with relations for UI display
export type TaskWithRelations = Task & {
    assigner?: {
        id: string
        userId: string
        role: string
        eventId: string
    }
    assignee?: {
        id: string
        userId: string
        role: string
        eventId: string
    }
    team?: {
        id: string
        name: string
        description: string | null
    }
}

// Helper to get tasks with filters (runs on server)
async function getTasksWithFilters(eventId: string, filters?: {
    status?: TaskStatus | 'all'
    assigneeId?: string
    teamId?: string
    assignerId?: string
}) {
    const tasks = await taskActions.getTasksByEvent(eventId)
    
    // Filter out archived tasks
    let filtered = tasks.filter(t => !t.archived)
    
    // Apply filters
    if (filters?.status && filters.status !== 'all') {
        filtered = filtered.filter(t => t.status === filters.status)
    }
    if (filters?.assigneeId) {
        filtered = filtered.filter(t => t.assigneeId === filters.assigneeId)
    }
    if (filters?.teamId) {
        filtered = filtered.filter(t => t.teamId === filters.teamId)
    }
    if (filters?.assignerId) {
        filtered = filtered.filter(t => t.assignerId === filters.assignerId)
    }
    
    return filtered
}

// Get all non-archived tasks for an event with filters
export function useTasks(eventId: string | null, filters?: {
    status?: TaskStatus | 'all'
    assigneeId?: string
    teamId?: string
    assignerId?: string
}) {
    return useQuery({
        queryKey: ['tasks', eventId, filters],
        queryFn: async () => {
            if (!eventId) return []
            return getTasksWithFilters(eventId, filters)
        },
        enabled: !!eventId,
    })
}

// Get archived tasks (done > 1 day ago)
export function useArchivedTasks(eventId: string | null) {
    return useQuery({
        queryKey: ['tasks', eventId, 'archived'],
        queryFn: async () => {
            if (!eventId) return []
            return taskServerActions.getArchivedTasksServer(eventId)
        },
        enabled: !!eventId,
    })
}

// Get single task by ID
export function useTask(taskId: string | null) {
    return useQuery({
        queryKey: ['task', taskId],
        queryFn: async () => {
            if (!taskId) return null
            return taskServerActions.getTaskByIdServer(taskId)
        },
        enabled: !!taskId,
    })
}

// Create task
export function useCreateTask() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (task: TaskInsert & { eventId: string }) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')
            
            // Get current user's member record
            const member = await teamActions.getCurrentMember(task.eventId, user.id)
            if (!member) throw new Error('User is not a member of this event')
            
            const { eventId, ...taskData } = task
            const result = await taskActions.createTask({
                ...taskData,
                eventId,
                assignerId: member.id,
            })
            return result
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
        },
    })
}

// Update task
export function useUpdateTask() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async ({ 
            id, 
            eventId, 
            ...updates 
        }: { id: string; eventId: string } & TaskUpdate) => {
            // If updating status to 'done', set completed_at
            if (updates.status === 'done' && !updates.completedAt) {
                updates.completedAt = new Date()
            }
            
            // If updating status away from 'done', clear completed_at
            if (updates.status && updates.status !== 'done') {
                updates.completedAt = null
            }
            
            const data = await taskActions.updateTask(id, updates)
            return { ...data, eventId }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
            queryClient.invalidateQueries({ queryKey: ['task', data.id] })
        },
    })
}

// Change task status (with special handling for 'done' and 'waiting')
export function useChangeTaskStatus() {
    const updateTask = useUpdateTask()
    
    return useMutation({
        mutationFn: async ({
            id,
            eventId,
            status,
            waitingReason,
        }: {
            id: string
            eventId: string
            status: TaskStatus
            waitingReason?: string
        }) => {
            const updates: TaskUpdate = { status }
            
            // For 'waiting' status, waiting_reason is required
            if (status === 'waiting') {
                if (!waitingReason || waitingReason.trim().length === 0) {
                    throw new Error('Waiting reason is required')
                }
                updates.waitingReason = waitingReason.trim()
            } else {
                // Clear waiting_reason for other statuses
                updates.waitingReason = null
            }
            
            return updateTask.mutateAsync({ id, eventId, ...updates })
        },
    })
}

// Archive task (only for done tasks, only by admins/owners)
export function useArchiveTask() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
            const data = await taskActions.updateTask(id, { archived: true })
            if (data.status !== 'done') {
                throw new Error('Only done tasks can be archived')
            }
            return { ...data, eventId }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
            queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId, 'archived'] })
        },
    })
}

// Delete task (only by assigner or event owner)
export function useDeleteTask() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
            await taskActions.deleteTask(id)
            return { id, eventId }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', data.eventId] })
        },
    })
}

// Get task count by status for an event
export function useTaskStats(eventId: string | null) {
    const { data: tasks = [] } = useTasks(eventId, { status: 'all' })
    
    const stats = {
        inbox: tasks.filter((t: TaskWithRelations) => t.status === 'inbox').length,
        active: tasks.filter((t: TaskWithRelations) => t.status === 'active').length,
        waiting: tasks.filter((t: TaskWithRelations) => t.status === 'waiting').length,
        done: tasks.filter((t: TaskWithRelations) => t.status === 'done').length,
        total: tasks.length,
    }
    
    return stats
}

// Get active task count for a specific user (soft limit warning)
export function useUserActiveTaskCount(eventId: string | null, memberId: string | null) {
    const { data: tasks = [] } = useTasks(eventId, {
        status: 'active',
        assigneeId: memberId || undefined,
    })
    
    return tasks.length
}
