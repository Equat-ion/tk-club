# AGENTS.md - Technical and Product Decisions

**Last Updated**: December 31, 2025

This file contains all approved technical and product decisions for the Event Management MVP.

## Decision Log

### 1. Calendar Implementation
**Decision**: Hybrid approach (Option C)
- Use calendar library for date/time logic and calculations
- Build custom UI components using shadcn primitives for full theme control
- Ensures consistent design language while reducing complexity

### 2. Multi-Event Support
**Decision**: Multiple events per organizer (Option B)
- Organizers can create and manage multiple events
- Requires event list/switcher in main sidebar
- Each event has its own workspace

### 3. State Management Strategy
**Decision**: Zustand + React Query (Option C)
- Zustand for global UI state (theme, current event, sidebar state)
- React Query for server state, caching, and Supabase interactions
- Provides optimal balance of simplicity and functionality for MVP

### 4. Real-time Calendar Updates
**Decision**: No real-time (Option B)
- Standard polling or manual refresh only
- Simpler implementation for MVP
- Sufficient for single-organizer use case

### 5. Authentication Methods
**Decision**: Email/password only (Option A)
- Supabase Auth email/password flow
- No OAuth providers in MVP
- Simplest to implement and test

### 6. Calendar Entry Form UI
**Decision**: Inline popover at click location (Option C)
- Uses shadcn Popover component
- More natural interaction for calendar clicking
- Appears at/near the clicked time slot or entry

### 7. Timezone Handling
**Decision**: UTC storage, browser display (Option A)
- All times stored in UTC in Supabase
- Display in user's browser timezone automatically
- Standard practice for web calendar apps

### 8. Event Workspace Structure
**Decision**: Workspace as environment container
- Main sidebar contains: event switcher, workspace tools (calendar, settings, etc.)
- Calendar is ONE tool within the workspace
- Workspace can contain other tools in future (not in MVP scope)
- Calendar page has its own internal nested sidebar (sidebar-12 pattern)

### 9. Calendar Entry Deletion
**Decision**: Simple confirm dialog (Option A)
- Standard shadcn AlertDialog
- "Cancel" and "Delete" buttons
- No undo mechanism in MVP

### 10. Default Calendar View on Load
**Decision**: Week containing today, with user preference (Option B + preference)
- Default: Show week containing current date
- Store user's preferred default view in user_settings table
- Preference options: week, month (day view removed)

### 11. Home Page Layout (Updated Dec 31, 2025)
**Decision**: Events listing page without sidebar
- First page shows all events in a card grid layout
- No sidebar on home page - cleaner entry experience
- Sidebar only appears when entering an event workspace
- Header with settings and sign-out on home page
- Users must explicitly select or create an event to enter workspace

### 12. Event Icon System (Added Dec 31, 2025)
**Decision**: Emoji-based event icons
- Default icon: 🎉 (party popper)
- Users can select from 40+ preset emoji options
- Stored in `icon` column on events table
- Displayed in sidebar event switcher and event cards
- More visual and recognizable than generic calendar icon

### 13. Event Date Range (Added Dec 31, 2025)
**Decision**: Optional start and end dates for events
- Events now have optional `start_date` and `end_date` fields
- Displayed on event cards for context
- Database constraint ensures end_date >= start_date
- Format: "MMM d - MMM d, yyyy" or "Starts MMM d, yyyy"

### 14. Email Verification UX (Added Dec 31, 2025)
**Decision**: Show verification prompt instead of failure
- When Supabase requires email verification, show success message
- Clear instructions to check email and verify
- Link to try again if email not received
- Organizer record created after email verification (via auth callback)

### 15. Calendar View Options (Updated Jan 1, 2025)
**Decision**: Week and Month views only
- Day view removed from calendar
- Week view is the primary detailed view
- Month view shows event overview with click-to-week navigation
- Simplifies UI while maintaining essential functionality

### 16. Overlapping Events Layout (Added Jan 1, 2025)
**Decision**: Staggered column-based layout
- Events that overlap are placed in side-by-side columns
- Algorithm assigns each event to the first available column
- Events with same start time are sorted by duration (longer first)
- Visual width calculation: event width = 100% / totalColumns
- Google Calendar-style overlapping visualization

### 17. Calendar Drag Interactions (Added Jan 1, 2025)
**Decision**: Full drag support with visual feedback
- **Drag to move**: Drag events to different times/days with preview
- **Resize**: Top and bottom edge handles to adjust duration
- **Drag to create**: Click and drag on empty space to create new events
- **Month view drag**: Move events between days while preserving time
- 15-minute snap grid for all drag operations
- Visual indicators show drop targets and drag previews

### 18. Calendar Sidebar (Added Jan 1, 2025, Updated Jan 1, 2026)
**Decision**: Google Calendar-style sidebar using shadcn sidebar-12 pattern
- Mini calendar for quick date navigation
- Calendars list with color coding and visibility toggles
- Create new calendars with custom names and colors
- Eye icon to show/hide calendar events
- Fixed width (256px) on left side of calendar view
- **Updated Jan 1, 2026**: Rewritten using shadcn sidebar-12 block pattern
  - Uses shadcn Sidebar component with proper composition
  - Collapsible calendars section with ChevronRight rotation indicator
  - SidebarMenu, SidebarMenuItem, SidebarMenuButton for proper structure
  - DatePicker section uses SidebarGroup and SidebarGroupContent
  - Footer with "New Calendar" button using SidebarFooter
  - Proper sidebar theme integration with bg-sidebar-primary and text-sidebar-primary-foreground
  - Simple color dot indicator (no checkboxes) - visual simplicity
  - Eye/EyeSlash icons on hover for visibility toggling
  - Lock icon for default/protected calendars

### 19. Calendars System (Added Jan 1, 2025)
**Decision**: Multiple calendars per event for organization
- Each event workspace can have multiple calendars
- Calendars have: name, color, visibility toggle
- Calendar events can be assigned to a specific calendar
- Default colors: Blue, Red, Green, Yellow, Purple, Pink, Orange, Teal, Indigo, Gray
- Calendars stored in `calendars` table with event_id foreign key

### 20. Drag-to-Create Coordinate Fix (Added Dec 31, 2025)
**Decision**: Unified coordinate system for all drag operations
- **Issue**: Drag-to-create was inaccurate because `handleCreateStart` used day column rect while `handleMouseMove` and `handleMouseUp` used grid rect
- **Fix**: All handlers now use `gridRef` bounding rect with scroll offset
- **Key change**: Added `gridRef.current.scrollTop` to Y coordinate calculation
- Ensures consistent positioning when calendar is scrolled
- Applies to: drag-to-create, drag-to-move, and resize operations

### 21. Entry Popover Close Behavior (Added Dec 31, 2025)
**Decision**: Prevent re-opening on outside click
- **Issue**: Clicking outside popover to close it triggered `handleCreateStart` on calendar grid
- **Fix**: Pass `popoverOpen` state to `WeekView` component
- When `popoverOpen` is true, `handleCreateStart` returns early without action
- Allows clean close-then-new-interaction pattern

### 22. Drag-to-Create End Time (Added Dec 31, 2025)
**Decision**: Pre-fill both start and end time from drag operation
- `onCreateEvent` callback passes both `start` and `end` Date objects
- `EntryPopover` accepts new `defaultEndDate` prop
- Form pre-fills end date/time based on where mouse was released
- Falls back to +1 hour if `defaultEndDate` not provided

### 22. Calendar Entry Calendar Assignment (Added Dec 31, 2025)
**Decision**: Calendar selector in entry popover
- Dropdown appears only if calendars exist for the event
- Shows color indicator and name for each calendar
- "No calendar" option sets `calendar_id` to null
- Selected calendar saved with entry on create/update
- Pre-fills existing `calendar_id` when editing

### 24. Calendar Page Sidebar Compression (Added Dec 31, 2025, Updated Jan 1, 2026)
**Decision**: Allow main app sidebar control on calendar pages
- Main app sidebar can be expanded/collapsed by user on calendar pages
- No forced compression - user maintains control
- **Updated Jan 1, 2026**: Removed forced sidebar collapse
  - Users can now expand the main sidebar on calendar pages if needed
  - Sidebar state persists based on user preference
  - More flexible layout control

### 25. Calendar Sidebar Sticky Positioning (Added Jan 1, 2026, Updated Jan 1, 2026)
**Decision**: Make mini-calendar sidebar fixed with proper height constraints
- Calendar sidebar uses `h-full` instead of `h-screen` to match parent container height
- Sidebar remains fixed while only the main calendar canvas area scrolls
- WeekView component has `overflow-auto` to enable scrolling for calendar grid
- Mini-calendar and calendars list always visible for quick navigation
- Ensures proper flex layout between sidebar and main content area
- **Updated Jan 1, 2026**: Event page uses `calc(100vh - 3rem)` for precise height calculation (3rem = 48px topbar)
  - Sidebar confined to viewport height minus topbar
  - Calendar canvas wrapped in ScrollArea component with `h-full` class for proper height
  - Week view: Day names header and all-day section moved inside ScrollArea to enable sticky positioning
  - Day names header sticks at `top-0`, all-day section sticks at `top-[57px]`
  - Only the time grid scrolls, headers remain sticky within the ScrollArea viewport
  - Both WeekView and MonthView use ScrollArea with explicit `h-full` height
  - Parent container uses `overflow-hidden` to constrain ScrollArea properly

### 25. Calendar Event Color Coding (Added Dec 31, 2025)
**Decision**: Events inherit colors from assigned calendars
- Calendar events display using their assigned calendar's color
- Events without calendar assignment use default primary color
- Colors applied to background, border, and text for visual consistency
- Color opacity: background 12%, border 25%, text full color

### 26. Calendar Visibility Filtering (Added Dec 31, 2025)
**Decision**: Hide events from hidden calendars
- When calendar visibility is toggled off, all its events are filtered from display
- Events without calendar assignment are always visible
- Filtering applied at component level before rendering calendar views

### 27. Calendar Deletion with Protection (Added Dec 31, 2025)
**Decision**: Allow calendar deletion with default calendar protection
- Users can delete calendars via trash icon in calendar sidebar
- Confirmation dialog prevents accidental deletion
- Default/primary calendar cannot be deleted (UI shows disabled state)
- Deleting calendar sets all associated events' calendar_id to null

### 28. Default Primary Calendar System (Added Jan 1, 2026, Updated Jan 1, 2026)
**Decision**: Auto-create protected default calendar per event with database trigger
- "Primary" calendar automatically created when new event is created via database trigger
- Uses orange color (#f97316) and cannot be deleted
- Orange is reserved exclusively for Primary calendar and removed from user color choices
- Marked with `is_default: true` flag in database
- Shows special visual indicator (lock icon) in calendar list
- All new calendar entries default to this calendar (calendar selection required, no "No Calendar" option)
- **Database trigger**: `trigger_create_default_calendar` on events table ensures every event has a default calendar
- **Migration applied**: Created default calendars for all pre-existing events
- **Migration applied (Jan 1, 2026)**: Renamed "Main Calendar" to "Primary" and updated color to orange (#f97316)
- **Update (Jan 1, 2026)**: Removed "No Calendar" option from entry popover - all events must be assigned to a calendar

### 29. Entry Popover Close Behavior Fix (Added Dec 31, 2025)
**Decision**: Prevent dialog reopening on outside click
- Add debounce/delay mechanism when popover closes via outside click
- Track popover close timestamp to prevent immediate reopening
- Ensure click events on calendar grid don't trigger when popover just closed
- Apply 200ms delay before allowing new popover creation

### 30. All-Day Events Support (Added Jan 1, 2026)
**Decision**: Add all-day event checkbox and proper handling
- **Database**: Added `is_all_day` BOOLEAN column to `calendar_events` table (default: false)
- **UI**: All-day checkbox in entry popover dialog
  - Disables time inputs when checked
  - Sets start time to 00:00 and end time to 23:59 for all-day events
- **Time Grid**: Updated to show 24 hours (0-23) with final marker at 12 AM (midnight)
  - Time labels positioned below grid lines instead of above
  - Grid properly terminates at midnight (12 AM)
- **Color Coding**: All-day and multi-day events properly use calendar colors
  - Applied calendar color with opacity to all-day event bars
  - Falls back to primary color if no calendar assigned
- **Migration**: `20260101000004_add_is_all_day_to_calendar_events.sql`
- **Bugfix (Jan 1, 2026)**: Migration was not applied to production database
  - Issue: Calendar event creation was failing with database error
  - Root cause: `is_all_day` column existed in types but not in actual database
  - Fix: Applied migration `20260101000004_add_is_all_day_to_calendar_events.sql` to production
  - Verification: Confirmed column exists with correct type (BOOLEAN NOT NULL DEFAULT false)

### 31. All-Day Section Sticky Positioning and Drag Support (Added Jan 1, 2026)
**Decision**: Make all-day section sticky and enable drag/drop for all-day events
- **Sticky positioning**: All-day section remains visible at `top-[57px]` (below day names header)
  - All-day label and event bars stay visible when scrolling time grid
  - Uses `z-20` to ensure proper layering above scrolling content
- **Drag and drop for all-day events**: Multi-day and all-day events can now be dragged between days
  - Click and drag all-day events to move them to different days
  - Maintains event duration (number of days) when moved
  - Calculates day offset and adjusts both start and end dates accordingly
  - Visual feedback shows which day the event will move to
  - Hover state on all-day events indicates they're draggable
  - Opacity change when dragging to show source event

## File Management Rules

**CRITICAL**: The AI agent is ONLY allowed to touch AGENTS.md for documentation purposes.

**Prohibited**:
- Creating additional doc files
- Creating README files
- Creating ARCHITECTURE.md or similar
- Creating any markdown documentation besides AGENTS.md

All decisions, notes, and documentation must be consolidated in this single file.

## Tech Stack Constraints

**Framework**: Next.js (App Router only)
**UI**: shadcn/ui (must be fully theme adherent)
**Backend**: Supabase (Auth + Postgres)
**State**: Zustand (global) + React Query (server)
**Calendar Library**: date-fns (date logic only, custom UI)

## Layout Component References

- **Home page**: Simple header with card grid (no sidebar)
- **Main sidebar**: shadcn block "sidebar-9" (collapsible nested) - only in event workspace
- **Calendar internal sidebar**: shadcn block "sidebar-12" (adapted for calendar)
- **Settings dialog**: shadcn block "sidebar-13" (in dialog, not page)

## Data Storage Principles

- UTC for all timestamps
- Minimal schema (only fields needed for MVP)
- Use Supabase RLS for security
- Direct mapping from Supabase Auth to organizers table

## Database Schema Updates

### events table (Updated Dec 31, 2025)
Added columns:
- `start_date` (DATE, nullable) - Event start date
- `end_date` (DATE, nullable) - Event end date  
- `icon` (TEXT, default '📅') - Emoji icon for the event

Constraint: `check_end_date_after_start_date` - ensures end_date >= start_date when both are set

### calendars table (Added Jan 1, 2025, Updated Jan 1, 2026)
New table for organizing calendar events into categories:
- `id` (UUID, primary key)
- `event_id` (UUID, foreign key to events)
- `name` (TEXT, not null) - Calendar name (e.g., "Workshops", "Talks")
- `color` (TEXT, default '#f97316') - Hex color code (updated to orange for Primary calendar)
- `is_visible` (BOOLEAN, default true) - Toggle visibility
- `is_default` (BOOLEAN, default false) - Marks the default calendar (cannot be deleted)
- `created_at`, `updated_at` (TIMESTAMPTZ)

RLS policies mirror events table (organizer-based access).

**Database triggers**:
- `trigger_create_default_calendar`: Automatically creates "Primary" calendar when event is inserted
- Ensures every event always has at least one default calendar
- Function: `create_default_calendar_for_event()` (updated Jan 1, 2026 to use "Primary" name and orange color)

### calendar_events table (Updated Jan 1, 2025, Updated Jan 1, 2026)
Added column:
- `calendar_id` (UUID, nullable, foreign key to calendars)

Allows assigning calendar entries to specific calendars for color-coding.

**Updated Jan 1, 2026**:
- `is_all_day` (BOOLEAN, default false) - Indicates if event spans full day(s) without specific time slots

## Component Implementation Details

### Create Event Dialog (Updated Dec 31, 2025)
- Uses shadcn Calendar component with Popover for date selection
- Validation: Start date must be today or in the future
- Validation: End date must be >= start date (enforced in UI by disabling invalid dates)
- Automatic organizer creation fallback if user exists but organizer record is missing

### Auth Flow (Updated Dec 31, 2025)
- Auth callback route at `/auth/callback` handles email verification
- Creates organizer record automatically after email verification
- Fallback organizer creation in useCreateEvent hook for legacy users

### Calendar Components (Added Jan 1, 2025)

#### week-view.tsx (Updated Jan 1, 2026)
- Main detailed calendar view with time grid
- 64px per hour, 24-hour display (0-23, ending at midnight)
- Features:
  - Overlapping event layout (staggered columns)
  - Drag to move events between days/times
  - Resize events via top/bottom handles
  - Drag to create new events
  - 15-minute snap grid
  - Visual previews during drag operations
  - Time labels positioned below grid lines
  - All-day/multi-day events section with calendar color support
- **Updated Dec 31, 2025**: Added `popoverOpen` prop to prevent drag-to-create when popover is open (fixes close-then-reopen bug)
- **Updated Jan 1, 2026**: Grid terminates at 12 AM (midnight) with proper hour markers

#### month-view.tsx
- Overview calendar showing events per day
- Shows up to 3 events per day with "+N more" indicator
- Click day to navigate to week view
- Drag events to different days (preserves original time)
- Visual drop target highlighting

#### entry-popover.tsx (Updated Dec 31, 2025, Updated Jan 1, 2026)
- Entry creation/editing popover
- **New**: `defaultEndDate` prop to pre-fill end time from drag-to-create
- **New**: Calendar selector dropdown (only shown if calendars exist)
  - Shows color indicator for each calendar
  - "No calendar" option for entries without calendar assignment
  - Uses `calendar_id` field on calendar_events table
- **Updated Jan 1, 2026**: All-day event checkbox
  - Disables time inputs when all-day is checked
  - Automatically sets times to 00:00 - 23:59 for all-day events
  - `is_all_day` field stored in database

#### calendar-sidebar.tsx
- Mini shadcn Calendar for date navigation
- List of calendars with color indicators
- Toggle visibility with eye icon
- Create new calendars dialog with:
  - Name input
  - Color picker (10 preset colors)

#### calendar-entry.tsx
- Individual event display component
- Supports custom colors from calendar assignment
- Resize handles on top/bottom edges
- Visual states for dragging/resizing

### Utility Functions (calendar-utils.ts)

#### calculateOverlappingPositions()
- Takes array of CalendarEvent objects
- Returns EventWithPosition[] with column assignments
- Algorithm:
  1. Sort by start time, then duration (longer first)
  2. Group events by overlap
  3. Assign columns within each group

#### getEventOverlapStyle()
- Calculates CSS positioning for overlapped events
- Returns top, height, left, and width values
- Handles percentage-based column widths
