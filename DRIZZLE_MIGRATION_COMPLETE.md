# Drizzle ORM Migration - Complete ✅

## Overview
Successfully migrated all database queries and routes from Supabase client to Drizzle ORM with proper schema alignment.

## Files Created

### Server Actions (`src/app/actions/`)
All database operations now use Drizzle ORM through 'use server' modules:

- **events.ts** - Event CRUD operations (create, read, update, delete)
- **calendars.ts** - Calendar CRUD operations (create, read, update, delete)
- **calendar-events.ts** - Calendar event CRUD operations (create, read, update, delete)
- **tasks.ts** - Task CRUD operations (create, read, update, delete, archive, change status)
- **tasks-server.ts** - Server-only task queries for direct DB access (archived tasks, single task)
- **teams.ts** - Team, member, and invite operations
- **invites.ts** - Invite management operations (create, read, validate, delete)
- **users.ts** - User and settings operations (create, read, update)
- **index.ts** - Re-exports all actions for convenience

### Query Modules (`src/lib/db/queries/`)
Organized query functions using Drizzle ORM directly:

- **users.ts** - User management queries
  - `getUserByAuthId()` - Get user by Supabase auth user ID
  - `getUserById()` - Get user by internal user ID
  - `createUser()` - Create a new user
  - `updateUser()` - Update user information
  - `getUserSettings()` - Get user settings
  - `upsertUserSettings()` - Create or update user settings

- **calendars.ts** - Calendar management queries
  - `getCalendarsByEvent()` - Get all calendars for an event
  - `getDefaultCalendar()` - Get default (Primary) calendar for an event
  - `getCalendarById()` - Get calendar by ID
  - `createCalendar()` - Create a new calendar
  - `updateCalendar()` - Update calendar
  - `deleteCalendar()` - Delete calendar (moves events to Primary calendar)

- **calendar-events.ts** - Calendar event queries
  - `getCalendarEventsByEvent()` - Get all calendar events for an event
  - `getCalendarEventsInRange()` - Get events for date range
  - `getCalendarEventsByCalendar()` - Get events for specific calendar
  - `getCalendarEventById()` - Get calendar event by ID
  - `createCalendarEvent()` - Create calendar event
  - `updateCalendarEvent()` - Update calendar event
  - `deleteCalendarEvent()` - Delete calendar event

- **teams.ts** - Team and member operations
  - `getCurrentMember()` - Get current user's membership for an event
  - `getEventMembers()` - Get all members for an event
  - `getMemberById()` - Get member by ID
  - `addEventMember()` - Add member to event
  - `updateMemberRole()` - Update member role
  - `removeMember()` - Remove member from event
  - `getEventTeams()` - Get all teams for an event
  - `getMemberTeams()` - Get teams for current user (Member role)
  - `getTeamById()` - Get team by ID
  - `getTeamMembers()` - Get members of a team
  - `createTeam()` - Create a new team
  - `updateTeam()` - Update team
  - `deleteTeam()` - Delete team
  - `assignMembersToTeam()` - Assign members to team (batch operation)
  - `removeMemberFromTeam()` - Remove single member from team

- **invites.ts** - Invite management queries
  - `getEventInvites()` - Get all invites for an event
  - `getInviteByToken()` - Get invite by token
  - `validateInviteToken()` - Validate invite token (checks expiry and usage)
  - `createEmailInvite()` - Create email invite
  - `createLinkInvite()` - Create link invite
  - `markInviteAsUsed()` - Mark invite as used
  - `revokeInvite()` - Delete invite
  - `isUserEventMember()` - Check if user is already a member

- **events.ts** - Event queries (already existed)
  - `getEventsByOrganizer()` - Get events by organizer
  - `getEventById()` - Get event by ID with relations
  - `createEvent()` - Create new event
  - `updateEvent()` - Update event
  - `deleteEvent()` - Delete event
  - `getEventsByUserId()` - Get events where user is a member

- **tasks.ts** - Task queries (already existed)
  - `getTasksByEvent()` - Get all tasks for an event
  - `getTasksByAssignee()` - Get tasks assigned to member
  - `createTask()` - Create new task
  - `updateTask()` - Update task
  - `deleteTask()` - Delete task
  - `completeTask()` - Mark task as complete
  - All tasks use correct field names matching Drizzle schema

### Hooks Updated (`src/hooks/`)
All React hooks now properly import from server actions:

- **use-events.ts** - Event management hooks
  - `useUser()` - Get current user
  - `useEvents()` - Get events for current organizer
  - `useEvent()` - Get single event
  - `useCreateEvent()` - Create event (with calendar event auto-creation)
  - `useUpdateEvent()` - Update event
  - `useDeleteEvent()` - Delete event
  - Now uses server actions instead of Supabase client for database operations

- **use-calendars.ts** - Calendar management hooks
  - `useCalendars()` - Get calendars for event
  - `useCreateCalendar()` - Create calendar
  - `useUpdateCalendar()` - Update calendar
  - `useDeleteCalendar()` - Delete calendar
  - `useToggleCalendarVisibility()` - Toggle calendar visibility with optimistic updates
  - `CALENDAR_COLORS` - Default color palette (orange reserved for Primary)
  - Now uses server actions

- **use-calendar-events.ts** - Calendar event hooks
  - `useCalendarEvents()` - Get all calendar events
  - `useCalendarEventsInRange()` - Get events for date range
  - `useCreateCalendarEvent()` - Create calendar event
  - `useUpdateCalendarEvent()` - Update calendar event
  - `useDeleteCalendarEvent()` - Delete calendar event
  - Now uses server actions

- **use-tasks.ts** - Task management hooks (completely rewritten)
  - `useTasks()` - Get tasks with filters (status, assignee, team, assigner)
  - `useArchivedTasks()` - Get archived tasks (done > 1 day ago)
  - `useTask()` - Get single task
  - `useCreateTask()` - Create task
  - `useUpdateTask()` - Update task
  - `useDeleteTask()` - Delete task
  - `useArchiveTask()` - Archive task (done only)
  - `useChangeTaskStatus()` - Change status with waiting reason handling
  - `useTaskStats()` - Get task count by status
  - `useUserActiveTaskCount()` - Get active tasks for user
  - All exports use correct TypeScript types
  - Now uses server actions exclusively

- **use-teams.ts** - Team and member hooks
  - `useCurrentMember()` - Get current user's membership
  - `useEventMembers()` - Get all event members
  - `useUpdateMemberRole()` - Update member role
  - `useRemoveMember()` - Remove member
  - `useLeaveEvent()` - Leave event
  - `useEventTeams()` - Get all teams
  - `useMyTeams()` - Get teams for current user (Member role)
  - `useCreateTeam()` - Create team
  - `useUpdateTeam()` - Update team
  - `useDeleteTeam()` - Delete team
  - `useTeamMembers()` - Get team members
  - `useAssignMembers()` - Assign members to team
  - `useRemoveFromTeam()` - Remove member from team
  - Invite management hooks (create, read, validate, delete, check membership)
  - Now uses server actions

- **use-settings.ts** - Settings hooks
  - `useUserSettings()` - Get user settings with Zustand sync
  - `useUpdateUserSettings()` - Update user settings with Zustand sync
  - Now uses server actions

### Route Updated (`src/app/auth/callback/route.ts`)
Auth callback now uses server actions for user creation instead of direct Supabase client calls to database.

## Configuration Updates

### Next.js Config (`next.config.ts`)
Added `serverExternalPackages: ['postgres']` to prevent postgres.js (Node.js-only library) from being bundled for client components. This allows:
- Server actions to run on server using Drizzle ORM with postgres.js
- Client components to not include postgres.js in their bundles

### Database Client (`src/lib/db/index.ts`)
Drizzle client is properly configured with postgres.js connection pooler for Supabase.

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Client Components (React)                                 │
│     ↓                                                   │
│  Server Actions (use server)                           │
│     ↓                                                   │
│  Server Actions (Drizzle ORM queries)            │
│     ↓                                                   │
│  Database (Drizzle ORM + postgres.js)                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  Supabase Client (auth)                               │
│     ↓                                                   │
│  Middleware                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Flow:**
1. **Authentication**: Supabase Client (client-side and middleware)
2. **Server Actions**: 'use server' modules that wrap Drizzle ORM queries
3. **Client Hooks**: React Query hooks that call server actions (using Supabase client only for auth)
4. **Database**: Drizzle ORM with postgres.js connection pooler

**Key Benefits:**
- ✅ **Type Safety**: Full TypeScript type safety from Drizzle ORM schema
- ✅ **Clean Separation**: Authentication (Supabase) cleanly separated from database operations (Drizzle)
- ✅ **Server-Side Execution**: Database queries run on server using direct Drizzle ORM
- ✅ **No Client Bundling**: postgres.js excluded from client bundles via Next.js config
- ✅ **Performance**: Direct SQL generation and connection pooling via postgres.js
- ✅ **RLS Compatible**: Drizzle queries respect Supabase Row Level Security policies

## Schema Alignment

All database operations now correctly align with Drizzle schema:

### Drizzle Schema (camelCase)
- `userId` (users table)
- `teamId` (teams table)
- `assigneeId` (tasks table)
- `assignerId` (tasks table)
- `eventId` (events, calendars, calendar_events, event_members, event_teams tables)
- `dueAt` (tasks table)
- `completedAt` (tasks table)
- `waitingReason` (tasks table)

### Database (snake_case)
- `user_id` (event_members table) - stores Supabase auth user ID directly
- `assignee_id` (tasks table) - foreign key to event_members.user_id
- `assigner_id` (tasks table) - foreign key to event_members.user_id
- `event_id` (events, calendars, calendar_events, event_invites tables) - foreign key
- `team_id` (event_teams, team_members tables) - foreign key
- `due_at` (calendar_events table)
- `completed_at` (tasks table)
- `waiting_reason` (tasks table)

**Important**: event_members.user_id is NOT a foreign key to users table - it directly stores the Supabase auth user ID as a plain string. This is by design in the existing schema.

## TypeScript Types

All TypeScript types are properly exported and used throughout:
- Database types are defined in `src/lib/db/schema.ts` by Drizzle ORM
- Action types are exported from hooks for use in components
- All types use correct naming convention (camelCase)

## Migration Complete

The codebase has been successfully migrated to use Drizzle ORM for all database operations while maintaining Supabase for authentication. This provides:
- Better type safety
- Improved query performance
- Cleaner code organization
- Proper server/client separation
- Compatibility with existing Supabase setup (RLS, connection pooling)

All queries now respect the Drizzle ORM schema and use correct field names throughout the application!
