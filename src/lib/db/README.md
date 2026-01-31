# Drizzle ORM Usage Guide

This project uses **Drizzle ORM** for type-safe database queries alongside **Supabase** for authentication, realtime, and storage.

## Setup Complete ✅

- ✅ Drizzle ORM installed (`drizzle-orm`, `postgres`, `drizzle-kit`)
- ✅ Database schema defined in `src/lib/db/schema.ts`
- ✅ Database client configured in `src/lib/db/index.ts`
- ✅ Example query modules in `src/lib/db/queries/`

## Database Architecture

### Division of Responsibilities

**Supabase Client** (`@supabase/supabase-js`):
- ✅ Authentication (`supabase.auth`)
- ✅ Realtime subscriptions (`supabase.channel()`)
- ✅ Storage (`supabase.storage`)

**Drizzle ORM**:
- ✅ All database queries (SELECT, INSERT, UPDATE, DELETE)
- ✅ Type-safe query building
- ✅ Automatic TypeScript inference

### RLS (Row Level Security)

RLS policies are still enforced! Drizzle connects using the pooler connection which respects all RLS policies defined in your Supabase migrations.

## Usage Examples

### Basic Queries

```typescript
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Get all events
const allEvents = await db.select().from(events)

// Get event by ID
const event = await db.query.events.findFirst({
  where: eq(events.id, eventId)
})

// Create new event
const [newEvent] = await db
  .insert(events)
  .values({
    organizerId: '...',
    name: 'My Event',
  })
  .returning()
```

### Using Query Functions

```typescript
import { getEventsByOrganizer, createEvent } from '@/lib/db/queries/events'
import { getTasksByEvent, createTask } from '@/lib/db/queries/tasks'

// Get events
const myEvents = await getEventsByOrganizer(organizerId)

// Create event
const newEvent = await createEvent({
  organizerId: '...',
  name: 'Tech Conference 2026',
  description: 'Annual tech conference',
})

// Get tasks
const eventTasks = await getTasksByEvent(eventId)

// Create task
const newTask = await createTask({
  eventId: '...',
  assignerId: '...',
  title: 'Setup venue',
  status: 'inbox',
  priority: 'high',
})
```

### Relations & Joins

```typescript
// Get event with all related data
const event = await db.query.events.findFirst({
  where: eq(events.id, eventId),
  with: {
    organizer: true,
    calendars: {
      with: {
        calendarEvents: true,
      },
    },
    eventMembers: true,
    eventTeams: true,
    tasks: {
      with: {
        assignee: true,
        assigner: true,
      },
    },
  },
})
```

### Server Actions / API Routes

```typescript
// app/actions/events.ts
'use server'

import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'

export async function createEventAction(name: string) {
  // Still use Supabase for auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Unauthorized')
  
  // Use Drizzle for database operations
  const [event] = await db
    .insert(events)
    .values({ name, organizerId: user.id })
    .returning()
    
  return event
}
```

## File Structure

```
src/lib/db/
├── schema.ts              # Database schema definition
├── index.ts               # Database client export
└── queries/               # Organized query functions
    ├── events.ts          # Event-related queries
    ├── tasks.ts           # Task-related queries
    └── ... (add more as needed)
```

## Configuration Files

- `drizzle.config.ts` - Drizzle Kit configuration
- `.env.local` - Environment variables:
  - `DATABASE_URL` - Pooler connection (runtime)
  - `DIRECT_DATABASE_URL` - Direct connection (schema introspection)

## Next Steps

### Optional: Migrate Existing Code

You can gradually migrate existing Supabase queries to Drizzle:

**Before (Supabase):**
```typescript
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('organizer_id', organizerId)
```

**After (Drizzle):**
```typescript
const data = await db.query.events.findMany({
  where: eq(events.organizerId, organizerId)
})
```

### Benefits of Drizzle

- ✅ **Full TypeScript type safety** - Autocomplete for tables, columns, relations
- ✅ **Inferred return types** - No manual type casting needed
- ✅ **Relational queries** - Easy joins and nested data fetching
- ✅ **Performance** - Direct SQL generation, no abstraction overhead
- ✅ **Flexibility** - Can mix with existing Supabase client calls

## Resources

- [Drizzle Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle + Supabase Guide](https://orm.drizzle.team/docs/get-started-postgresql#supabase)
- [Query Examples](https://orm.drizzle.team/docs/rqb)
