import { eq, and, desc, isNull } from 'drizzle-orm'
import { db } from '../index'
import { tasks, eventMembers, eventTeams } from '../schema'

/**
 * Get all tasks for an event
 */
export async function getTasksByEvent(eventId: string) {
    return db.query.tasks.findMany({
        where: eq(tasks.eventId, eventId),
        orderBy: [desc(tasks.createdAt)],
        with: {
            assigner: true,
            assignee: true,
            team: true,
        },
    })
}

/**
 * Get tasks assigned to a specific member
 */
export async function getTasksByAssignee(assigneeId: string) {
    return db.query.tasks.findMany({
        where: eq(tasks.assigneeId, assigneeId),
        orderBy: [desc(tasks.createdAt)],
        with: {
            event: true,
            assigner: true,
            team: true,
        },
    })
}

/**
 * Create a new task
 */
export async function createTask(data: {
    eventId: string
    assignerId: string
    title: string
    description?: string
    assigneeId?: string
    teamId?: string
    status?: 'inbox' | 'active' | 'waiting' | 'done'
    priority?: string
    dueAt?: Date
}) {
    const [task] = await db
        .insert(tasks)
        .values(data)
        .returning()

    return task
}

/**
 * Update a task
 */
export async function updateTask(
    taskId: string,
    data: Partial<{
        title: string
        description: string | null
        assigneeId: string | null
        teamId: string | null
        status: 'inbox' | 'active' | 'waiting' | 'done'
        priority: string
        dueAt: Date | null
        completedAt: Date | null
        waitingReason: string | null
        archived: boolean
    }>
) {
    const [task] = await db
        .update(tasks)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
        .returning()

    return task
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string) {
    await db.delete(tasks).where(eq(tasks.id, taskId))
}

/**
 * Mark task as complete
 */
export async function completeTask(taskId: string) {
    return updateTask(taskId, {
        status: 'done',
        completedAt: new Date(),
    })
}
