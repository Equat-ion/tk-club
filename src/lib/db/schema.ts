import {
    pgTable,
    uuid,
    text,
    timestamp,
    boolean,
    pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// Enums
// ============================================

export const taskStatusEnum = pgEnum('task_status', [
    'inbox',
    'active',
    'waiting',
    'done',
])

// ============================================
// Tables
// ============================================

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    authUserId: uuid('auth_user_id').notNull().unique(),
    email: text('email').notNull().unique(),
    displayName: text('display_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon'),
    venue: text('venue'),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const calendars = pgTable('calendars', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#3b82f6'),
    isVisible: boolean('is_visible').notNull().default(true),
    isDefault: boolean('is_default'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const calendarEvents = pgTable('calendar_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    calendarId: uuid('calendar_id').references(() => calendars.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    location: text('location'),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    isAllDay: boolean('is_all_day').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const eventMembers = pgTable('event_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: text('role').notNull().$type<'owner' | 'admin' | 'member'>(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const eventTeams = pgTable('event_teams', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const teamMembers = pgTable('team_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => eventTeams.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').notNull().references(() => eventMembers.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
})

export const eventInvites = pgTable('event_invites', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    inviteType: text('invite_type').notNull().$type<'email' | 'link'>(),
    token: uuid('token').notNull().defaultRandom(),
    email: text('email'),
    invitedBy: uuid('invited_by').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    assignerId: uuid('assigner_id').notNull().references(() => eventMembers.id, { onDelete: 'cascade' }),
    assigneeId: uuid('assignee_id').references(() => eventMembers.id, { onDelete: 'set null' }),
    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
    teamId: uuid('team_id').references(() => eventTeams.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatusEnum('status').notNull().default('inbox'),
    priority: text('priority').notNull().default('medium'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    waitingReason: text('waiting_reason'),
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userSettings = pgTable('user_settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    themePreference: text('theme_preference').notNull().default('system'),
    defaultCalendarView: text('default_calendar_view').notNull().default('week'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
    userSettings: many(userSettings),
}))

export const eventsRelations = relations(events, ({ one, many }) => ({
    organizer: one(users, {
        fields: [events.organizerId],
        references: [users.id],
    }),
    calendars: many(calendars),
    calendarEvents: many(calendarEvents),
    eventMembers: many(eventMembers),
    eventTeams: many(eventTeams),
    eventInvites: many(eventInvites),
    tasks: many(tasks),
}))

export const calendarsRelations = relations(calendars, ({ one, many }) => ({
    event: one(events, {
        fields: [calendars.eventId],
        references: [events.id],
    }),
    calendarEvents: many(calendarEvents),
}))

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
    event: one(events, {
        fields: [calendarEvents.eventId],
        references: [events.id],
    }),
    calendar: one(calendars, {
        fields: [calendarEvents.calendarId],
        references: [calendars.id],
    }),
}))

export const eventMembersRelations = relations(eventMembers, ({ one, many }) => ({
    event: one(events, {
        fields: [eventMembers.eventId],
        references: [events.id],
    }),
    teamMemberships: many(teamMembers),
    assignedTasks: many(tasks, { relationName: 'assignee' }),
    createdTasks: many(tasks, { relationName: 'assigner' }),
}))

export const eventTeamsRelations = relations(eventTeams, ({ one, many }) => ({
    event: one(events, {
        fields: [eventTeams.eventId],
        references: [events.id],
    }),
    teamMembers: many(teamMembers),
    tasks: many(tasks),
}))

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
    team: one(eventTeams, {
        fields: [teamMembers.teamId],
        references: [eventTeams.id],
    }),
    member: one(eventMembers, {
        fields: [teamMembers.memberId],
        references: [eventMembers.id],
    }),
}))

export const eventInvitesRelations = relations(eventInvites, ({ one }) => ({
    event: one(events, {
        fields: [eventInvites.eventId],
        references: [events.id],
    }),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
    event: one(events, {
        fields: [tasks.eventId],
        references: [events.id],
    }),
    assigner: one(eventMembers, {
        fields: [tasks.assignerId],
        references: [eventMembers.id],
        relationName: 'assigner',
    }),
    assignee: one(eventMembers, {
        fields: [tasks.assigneeId],
        references: [eventMembers.id],
        relationName: 'assignee',
    }),
    owner: one(users, {
        fields: [tasks.ownerId],
        references: [users.id],
    }),
    team: one(eventTeams, {
        fields: [tasks.teamId],
        references: [eventTeams.id],
    }),
}))

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
    organizer: one(users, {
        fields: [userSettings.organizerId],
        references: [users.id],
    }),
}))
