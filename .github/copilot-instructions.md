# Copilot Instructions for TK-Club Event Management

## Architecture Overview

This is a **Next.js 16 App Router** event management application for school club organizers. Core stack:
- **UI**: shadcn/ui (radix-lyra style) + Tailwind CSS v4 + Phosphor icons
- **State**: Zustand (UI state) + React Query (server state/Supabase)
- **Backend**: Supabase (Auth + Postgres)
- **Types**: Generated from Supabase schema in `src/lib/database.types.ts`

## Key Architectural Decisions

1. **Workspace-based navigation**: Events are workspaces. Main sidebar (`app-sidebar.tsx`) has event switcher; each event workspace has its own calendar sidebar (`calendar-sidebar.tsx`)
2. **State split**: Use `useAppStore` (Zustand) for UI state (currentEventId, calendarView, theme). Use React Query hooks in `src/hooks/` for all Supabase data
3. **Supabase clients**: Use `createClient()` from `@/lib/supabase/client` in client components, `@/lib/supabase/server` in Server Components/Route Handlers

## Data Fetching Pattern

All data hooks follow this pattern in `src/hooks/`:
```typescript
// Query with eventId scope
export function useCalendarEvents(eventId: string | null) {
  return useQuery({
    queryKey: ['calendar-events', eventId],  // Always scope by eventId
    queryFn: async () => { /* supabase query */ },
    enabled: !!eventId,
  })
}

// Mutations invalidate related queries
export function useCreateCalendarEvent() {
  return useMutation({
    mutationFn: async (data) => { /* insert */ },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', data.event_id] })
    },
  })
}
```

**Query keys**: `['events']`, `['event', eventId]`, `['calendar-events', eventId]`, `['calendars', eventId]`, `['tasks', eventId]`, `['task-columns', eventId]`, `['event-members', eventId]`, `['event-teams', eventId]`

## UI Component Conventions

- **shadcn style**: radix-lyra with `rounded-none` borders (sharp corners)
- **Icons**: Always use Phosphor icons from `@phosphor-icons/react`
- **Layout**: shadcn sidebar patterns (sidebar-9 for main, sidebar-12 for calendar)
- **Forms**: Use inline popovers for calendar entry creation, dialogs for settings/teams
- **cn() utility**: Always use `cn()` from `@/lib/utils` for conditional classes

## Calendar System

The calendar (`src/components/calendar/`) supports:
- Week/Month views (no day view)
- Drag-to-create, drag-to-move, resize events
- Multiple calendars per event with color coding
- All-day events with sticky header
- 15-minute snap grid

**Key files**: `calendar.tsx` (main), `week-view.tsx`, `month-view.tsx`, `entry-popover.tsx`, `calendar-sidebar.tsx`

## Database Conventions

- All times stored in **UTC**, displayed in browser timezone
- Every event auto-creates a "Primary" calendar (orange, protected)
- Use `is_all_day` boolean for full-day events
- `calendar_id` can't be null (all entries require a calendar)

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint check
```

Supabase migrations are in `supabase/migrations/`. Generate types after schema changes:
```bash
npx supabase gen types typescript --local > src/lib/database.types.ts
```

## File Organization

- `src/app/(app)/` - Authenticated app routes with sidebar layout
- `src/app/(app)/events/[eventId]/` - Event workspace pages (calendar, tasks, team)
- `src/components/ui/` - shadcn primitives (don't modify unless necessary)
- `src/components/` - App-specific components
- `src/hooks/` - React Query hooks for each domain (events, calendars, tasks, teams)
- `docs/AGENTS.md` - Detailed decision log for edge cases and historical context
