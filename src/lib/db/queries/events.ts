import { eq, and, desc } from 'drizzle-orm'
import { db } from '../index'
import { events, eventMembers, organizers } from '../schema'

/**
 * Get all events for a specific organizer
 */
export async function getEventsByOrganizer(organizerId: string) {
    return db.query.events.findMany({
        where: eq(events.organizerId, organizerId),
        orderBy: [desc(events.createdAt)],
        with: {
            organizer: true,
            calendars: true,
            eventMembers: true,
        },
    })
}

/**
 * Get all events where user is a member
 */
export async function getEventsByUserId(userId: string) {
    return db
        .select({
            event: events,
            role: eventMembers.role,
        })
        .from(events)
        .innerJoin(eventMembers, eq(eventMembers.eventId, events.id))
        .where(eq(eventMembers.userId, userId))
        .orderBy(desc(events.createdAt))
}

/**
 * Get a single event by ID with all relations
 */
export async function getEventById(eventId: string) {
    return db.query.events.findFirst({
        where: eq(events.id, eventId),
        with: {
            organizer: true,
            calendars: {
                with: {
                    calendarEvents: true,
                },
            },
            eventMembers: true,
            eventTeams: {
                with: {
                    teamMembers: true,
                },
            },
            tasks: true,
        },
    })
}

/**
 * Create a new event
 */
export async function createEvent(data: {
    organizerId: string
    name: string
    description?: string
    icon?: string
    venue?: string
    startDate?: Date
    endDate?: Date
}) {
    const [event] = await db
        .insert(events)
        .values(data)
        .returning()

    return event
}

/**
 * Update an event
 */
export async function updateEvent(
    eventId: string,
    data: Partial<{
        name: string
        description: string | null
        icon: string | null
        venue: string | null
        startDate: Date | null
        endDate: Date | null
    }>
) {
    const [event] = await db
        .update(events)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(events.id, eventId))
        .returning()

    return event
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string) {
    await db.delete(events).where(eq(events.id, eventId))
}
