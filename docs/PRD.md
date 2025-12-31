# Product Requirements Document: Event Management MVP

**Version**: 1.0
**Date**: December 31, 2025
**Status**: Implementation Ready

---

## 1. Product Overview

An event management web application designed for school club leaders, teachers, and student organizers to create and manage events with calendar-based scheduling. The MVP focuses exclusively on organizer-side event creation and calendar management, with no participant, registration, or team features.

The core value proposition is a clean, theme-aware calendar interface for scheduling event activities and sessions within a single venue or organization context.

**Platform**: Web app (desktop and mobile browsers)
**Tech Stack**: Next.js App Router, shadcn/ui, Supabase Auth + Postgres

---

## 2. User Roles

**MVP supports one role only: Organizer**

An organizer is any authenticated user who:
- Creates and manages multiple events
- Adds, edits, and deletes calendar entries within their events
- Controls their own theme preferences

**Out of scope for MVP**:
- Participants
- Attendees
- Team members
- Multiple permission levels
- Role-based access control

---

## 3. Core User Flows

### 3.1 Organizer Authentication
1. User visits app
2. If not authenticated, redirect to login page
3. User enters email and password
4. Supabase Auth validates credentials
5. On success, create/update organizer record and redirect to app
6. On failure, show error message

### 3.2 Event Creation
1. Authenticated organizer clicks "Create Event" in main sidebar
2. Modal/form appears with fields:
   - Event name (required)
   - Event description (optional)
   - Venue/location (optional)
3. Organizer submits
4. New event created in database
5. User automatically enters that event's workspace
6. Event appears in event list in main sidebar

### 3.3 Event Workspace Access
1. Organizer selects event from list in main sidebar
2. Event workspace loads with nested internal sidebar
3. Calendar tool is default/first view
4. Internal sidebar shows workspace tools (calendar, future tools)

### 3.4 Calendar Entry Creation
1. Organizer clicks empty calendar slot
2. Inline popover appears at/near click location
3. Popover contains form:
   - Title (required)
   - Start date and time (required, pre-filled from clicked slot)
   - End date and time (required, default 1 hour after start)
   - Description (optional, textarea)
   - Location inside venue (optional, text input)
4. Organizer fills form and clicks "Save"
5. Entry saves to database immediately (no draft state)
6. Entry appears on calendar instantly
7. Popover closes

### 3.5 Calendar Entry Editing
1. Organizer clicks existing calendar entry
2. Same inline popover appears with pre-filled data
3. Organizer modifies fields
4. Clicks "Save" - entry updates immediately
5. Or clicks "Delete" - confirmation dialog appears
6. On delete confirm, entry removed from database and calendar

### 3.6 Calendar Entry Drag-and-Drop
1. Organizer clicks and holds calendar entry
2. Drags to new time slot or date
3. Drops entry
4. Entry's start/end times automatically recalculated
5. Database updated immediately
6. Visual feedback confirms change

### 3.7 Settings Management
1. Organizer clicks settings icon/button in sidebar
2. Settings dialog opens (shadcn Dialog with sidebar-13 layout)
3. Dialog shows theme preference options:
   - Light
   - Dark
   - System (default)
4. Organizer selects preference
5. Theme applies immediately
6. Preference saved to user_settings table
7. Dialog can be closed, settings persist

---

## 4. Feature Scope

### In Scope
- Supabase email/password authentication
- Multiple events per organizer
- Event list in main sidebar with switcher
- Event workspace environment with internal sidebar
- Full calendar view with day/week/month options
- Calendar entry CRUD (create, read, update, delete)
- Drag-and-drop time/date changes for calendar entries
- Settings dialog for theme preference
- Responsive layout for desktop and mobile browsers

### Explicitly Out of Scope
- OAuth authentication providers
- Participant/attendee management
- Registration forms or flows
- Payment or ticketing
- Email notifications or reminders
- External calendar sync (Google Calendar, iCal, etc.)
- Analytics or reporting
- Multi-user permissions or collaboration
- Real-time multi-user editing
- Entry categories, colors, or tags
- Conflict detection or warnings for overlapping entries
- Recurring events
- File attachments
- Comments or notes beyond description field

---

## 5. Application Layout and Navigation

### 5.1 Main Sidebar (sidebar-9 pattern)
The main app uses a collapsible nested sidebar based on shadcn block "sidebar-9".

**Structure**:
```
[App Logo / Branding]
├── Event Switcher / List
│   ├── Event 1
│   ├── Event 2
│   └── + Create Event
├── Current Event Context Indicator
└── Settings (opens dialog)
```

**Behavior**:
- Collapsible on mobile
- Persists across navigation within event workspace
- Highlights currently selected event
- Settings button fixed at bottom

### 5.2 Event Workspace Layout
When an event is selected, the workspace loads with:
- Main sidebar (sidebar-9) remains visible (or collapsible on mobile)
- Internal nested sidebar for workspace tools
- Main content area for active tool (e.g., calendar)

### 5.3 Calendar Page Internal Sidebar (sidebar-12 pattern)
The calendar tool has its own internal sidebar following shadcn block "sidebar-12" adapted for calendar context.

**Structure**:
```
[Calendar Controls]
├── View Switcher (Day / Week / Month)
├── Date Navigator (prev/today/next)
├── Current date display
└── Mini month calendar (optional for MVP)
```

**Behavior**:
- Sidebar-12 is typically used for layered navigation
- Adapt to show calendar-specific controls vertically
- Responsive collapse on smaller screens

### 5.4 Settings Dialog (sidebar-13 pattern in Dialog)
Settings is NOT a page. It's a shadcn Dialog component containing sidebar-13 layout.

**Structure**:
```
Dialog
└── Sidebar-13 Layout
    ├── Settings Navigation (if multiple categories added later)
    └── Theme Preferences Section
        ├── Light option
        ├── Dark option
        └── System option (radio group or toggle)
```

For MVP, only theme preferences exist, so sidebar navigation is minimal or single-section.

---

## 6. Detailed Calendar Feature Specification

### 6.1 Calendar Views

**Week View (Default)**
- Shows 7 days (Monday-Sunday or locale-based)
- Time axis from 00:00 to 23:59 (configurable hour range if needed)
- Horizontal columns for days, vertical rows for time slots
- 30-minute or 1-hour slot granularity
- Current time indicator line
- Entries displayed as blocks spanning time ranges

**Day View**
- Shows single day with hourly breakdown
- Similar to week view but single column
- Larger space for entry details

**Month View (Read-Only)**
- Grid of days in month
- Entries shown as dots or small labels
- Clicking entry opens edit popover
- No drag-and-drop in month view
- No creation in month view (must switch to week/day)

### 6.2 Calendar Entry Fields

**Data Model** (see Section 8 for full schema):
- `id` (UUID, primary key)
- `event_id` (UUID, foreign key to events table)
- `title` (text, required)
- `start_time` (timestamptz, required)
- `end_time` (timestamptz, required)
- `description` (text, optional)
- `location` (text, optional - "inside venue" context)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Validation Rules**:
- Title: 1-200 characters
- Start time must be before end time
- End time cannot be more than 24 hours after start time (single-day entries)
- Description: max 2000 characters
- Location: max 200 characters

### 6.3 Calendar Interactions

**Click Empty Slot**:
- Popover appears at click coordinates
- Start time pre-filled from clicked slot
- End time defaults to 1 hour later
- Focus on title field

**Click Existing Entry**:
- Popover appears near entry
- All fields pre-filled
- "Save" and "Delete" buttons visible

**Drag Entry**:
- Entry becomes draggable on mousedown/touchstart
- Visual feedback (opacity, cursor change)
- Drop updates start/end times based on new position
- Duration preserved
- If dragged across days, date changes accordingly

**Overlapping Entries**:
- Allowed without restriction
- No conflict detection
- Visual stacking (entries side-by-side if possible, or overlapping with transparency)

**Delete Entry**:
- Click "Delete" in edit popover
- AlertDialog appears: "Are you sure you want to delete this entry? This action cannot be undone."
- "Cancel" and "Delete" buttons
- On confirm, entry deleted from database
- Popover closes

### 6.4 Component Structure

**Recommended Component Hierarchy**:
```
CalendarPage
├── CalendarSidebar (sidebar-12 pattern)
│   ├── ViewSwitcher
│   ├── DateNavigator
│   └── MiniCalendar (optional)
├── CalendarView
│   ├── WeekView | DayView | MonthView
│   │   ├── TimeAxis
│   │   ├── DayColumns
│   │   │   └── CalendarEntry (multiple)
│   │   └── EmptySlot (clickable)
│   └── CurrentTimeIndicator
└── EntryPopover (conditionally rendered)
    └── EntryForm
        ├── TitleInput
        ├── DateTimeInputs (start/end)
        ├── DescriptionTextarea
        ├── LocationInput
        └── ActionButtons (Save, Delete)
```

### 6.5 State Management Approach

**Zustand Store** (Global UI State):
- Current event ID
- Current calendar view (day/week/month)
- Current calendar date
- Sidebar collapse states
- Theme preference

**React Query** (Server State):
- Fetch calendar entries for current event
- Mutations for create/update/delete entries
- Automatic cache invalidation on mutations
- Optimistic updates for immediate UI feedback
- Polling interval (30-60 seconds) for data refresh

**Local Component State**:
- Entry form inputs (controlled components)
- Popover open/close state
- Drag state (dragging, drag coordinates)

### 6.6 Data Flow: UI to Supabase

**Create Flow**:
1. User fills form in popover
2. User clicks "Save"
3. React Query mutation triggered
4. Supabase client inserts row into calendar_events table
5. On success, React Query invalidates query cache
6. Calendar re-fetches entries and re-renders
7. Popover closes

**Update Flow**:
1. User edits entry in popover
2. User clicks "Save"
3. React Query mutation triggered
4. Supabase client updates row by entry ID
5. Cache invalidation and re-fetch
6. Popover closes

**Drag-and-Drop Flow**:
1. User drags entry to new position
2. Component calculates new start/end times
3. Optimistic update: entry moves immediately in UI
4. React Query mutation triggered
5. Supabase client updates row
6. On failure, rollback to previous state

**Delete Flow**:
1. User clicks "Delete", confirms
2. React Query mutation triggered
3. Supabase client deletes row
4. Cache invalidation
5. Entry removed from UI

### 6.7 Timezone Handling

All times stored in UTC in Supabase. Display in user's browser timezone using JavaScript Date API or date library (e.g., date-fns, day.js).

**Implementation**:
- When user selects time, convert to UTC before saving
- When displaying entries, convert UTC to browser's local timezone
- Show timezone indicator in UI (e.g., "All times in PST")

---

## 7. Settings Dialog Specification

**Trigger**: Settings button/icon in main sidebar (fixed at bottom)

**Component**: shadcn Dialog with sidebar-13 layout inside

**Content**:
- **Header**: "Settings" (Dialog title)
- **Body** (sidebar-13 structure):
  - **Left nav** (if needed): Single item "Appearance" (for future expansion)
  - **Right content**: Theme preference section
    - Label: "Theme"
    - Radio group or toggle group:
      - Light
      - Dark
      - System
    - Description: "Select your preferred theme. System matches your OS setting."
- **Footer** (optional): "Close" button or auto-close on selection

**Behavior**:
- Theme applies immediately on selection (no "Save" button needed)
- Preference saved to user_settings table via React Query mutation
- Dialog dismissible via close button, ESC key, or click outside

**Persistence**:
- Theme preference stored per organizer in user_settings table
- On app load, fetch user's theme preference
- Apply theme using shadcn theme provider

---

## 8. Data Model and Supabase Schemas

### 8.1 Tables

#### organizers
Maps Supabase Auth users to organizer profiles.

```sql
CREATE TABLE organizers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizers_auth_user_id ON organizers(auth_user_id);
```

#### events
Stores events created by organizers.

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  venue TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_organizer_id ON events(organizer_id);
```

#### calendar_events
Stores calendar entries within events.

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  description TEXT CHECK (char_length(description) <= 2000),
  location TEXT CHECK (char_length(location) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_end_after_start CHECK (end_time > start_time),
  CONSTRAINT check_duration_max_24h CHECK (end_time <= start_time + INTERVAL '24 hours')
);

CREATE INDEX idx_calendar_events_event_id ON calendar_events(event_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
```

#### user_settings
Stores user preferences (theme, default calendar view).

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL UNIQUE REFERENCES organizers(id) ON DELETE CASCADE,
  theme_preference TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  default_calendar_view TEXT NOT NULL DEFAULT 'week' CHECK (default_calendar_view IN ('day', 'week', 'month')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_settings_organizer_id ON user_settings(organizer_id);
```

### 8.2 Row Level Security (RLS) Policies

Enable RLS on all tables. Policies ensure organizers can only access their own data.

**organizers**:
```sql
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view own profile" ON organizers
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Organizers can update own profile" ON organizers
  FOR UPDATE USING (auth.uid() = auth_user_id);
```

**events**:
```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view own events" ON events
  FOR SELECT USING (
    organizer_id IN (SELECT id FROM organizers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Organizers can create own events" ON events
  FOR INSERT WITH CHECK (
    organizer_id IN (SELECT id FROM organizers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Organizers can update own events" ON events
  FOR UPDATE USING (
    organizer_id IN (SELECT id FROM organizers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Organizers can delete own events" ON events
  FOR DELETE USING (
    organizer_id IN (SELECT id FROM organizers WHERE auth_user_id = auth.uid())
  );
```

**calendar_events**:
```sql
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view own event entries" ON calendar_events
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id IN (
        SELECT id FROM organizers WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organizers can create entries in own events" ON calendar_events
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE organizer_id IN (
        SELECT id FROM organizers WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organizers can update entries in own events" ON calendar_events
  FOR UPDATE USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id IN (
        SELECT id FROM organizers WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organizers can delete entries in own events" ON calendar_events
  FOR DELETE USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id IN (
        SELECT id FROM organizers WHERE auth_user_id = auth.uid()
      )
    )
  );
```

**user_settings**:
```sql
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view own settings" ON user_settings
  FOR SELECT USING (
    organizer_id IN (SELECT id FROM organizers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Organizers can update own settings" ON user_settings
  FOR UPDATE USING (
    organizer_id IN (SELECT id FROM organizers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Organizers can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (
    organizer_id IN (SELECT id FROM organizers WHERE auth_user_id = auth.uid())
  );
```

### 8.3 Database Functions and Triggers

**Updated_at Trigger**:
Automatically update `updated_at` timestamp on row modification.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizers_updated_at BEFORE UPDATE ON organizers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 9. Non-Functional Requirements

### 9.1 Performance
- Calendar page load: <2 seconds
- Entry creation/edit: <500ms perceived response (optimistic updates)
- Drag-and-drop: 60fps smooth animation
- Support up to 500 calendar entries per event without degradation

### 9.2 Security
- All API requests authenticated via Supabase Auth JWT
- RLS enforced on all tables
- HTTPS only in production
- Environment variables for sensitive keys
- No passwords or tokens in client-side code

### 9.3 Accessibility
- Keyboard navigation for all interactions
- ARIA labels on interactive elements
- Focus management in modals/dialogs
- Minimum contrast ratio 4.5:1 (WCAG AA)
- Screen reader tested for calendar navigation

### 9.4 Browser Support
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- Mobile Safari (iOS 15+)
- Chrome Mobile (Android 10+)

### 9.5 Responsive Design
- Breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- Collapsible sidebars on mobile
- Touch-friendly targets (min 44x44px)
- Calendar adapts to screen width (horizontal scroll if needed)

### 9.6 Theme Adherence
- All components use shadcn theme variables
- Custom calendar UI must respect theme colors and spacing
- No hardcoded colors outside theme system
- Light/dark/system modes fully supported

---

## 10. Open Questions and Decisions Needed

### Resolved in AGENTS.md:
All critical decisions have been made and documented in AGENTS.md [code_file:11].

### Remaining Open Questions:

#### Q1: Calendar Library Selection
Which library should be used for calendar date logic?
- **Options**: date-fns, day.js, Luxon, or native Date API
- **Decision needed**: Recommend date-fns for broad adoption and tree-shaking, or day.js for smaller bundle size

#### Q2: Event List Display in Main Sidebar
How should events be displayed in the event switcher?
- **Options**:
  - A. Simple list with radio selection
  - B. Dropdown/select component
  - C. Collapsible accordion with event details
- **Recommendation**: Option A for MVP simplicity

#### Q3: Mini Calendar in Calendar Sidebar
Should we include a mini month calendar in the sidebar-12 layout?
- **Options**:
  - A. Yes - helps with date navigation
  - B. No - reduces complexity
- **Recommendation**: No for MVP, add post-launch if users request

#### Q4: Calendar Drag-and-Drop Library
Should we use a drag-and-drop library or build native?
- **Options**:
  - A. react-dnd or dnd-kit
  - B. Native HTML5 drag-and-drop
  - C. Custom implementation with mouse/touch events
- **Recommendation**: Option B or C depending on browser support requirements

#### Q5: Entry Popover Positioning
How should popover position be calculated to avoid viewport overflow?
- **Options**:
  - A. Use shadcn Popover with automatic positioning
  - B. Custom calculation with fallback positions
- **Recommendation**: Option A (shadcn handles this)

#### Q6: Mobile Calendar UX
Should mobile calendar have different interaction patterns?
- **Options**:
  - A. Same as desktop (click and popover)
  - B. Long-press for create, tap for edit
  - C. Bottom sheet instead of popover
- **Recommendation**: Option C for better mobile UX

#### Q7: Organizer Display Name
Should display_name in organizers table be:
- **Options**:
  - A. Editable by user
  - B. Derived from email
  - C. Not used in MVP
- **Recommendation**: Option C, can add profile editing post-MVP

---

## 11. Success Criteria

### MVP Launch Criteria
1. Organizer can sign up and log in with email/password
2. Organizer can create at least 3 events
3. Organizer can switch between events via sidebar
4. Organizer can create 50+ calendar entries in a single event
5. Calendar week view displays entries correctly with no visual bugs
6. Drag-and-drop works for 90%+ of tested entries
7. Theme switching applies instantly without page reload
8. Mobile experience is usable on iOS Safari and Chrome Mobile
9. Zero RLS policy violations in testing
10. All calendar CRUD operations complete in <1 second

### User Acceptance Criteria
- Organizer can schedule a full day event (8am-6pm, 20 sessions) in under 10 minutes
- Zero data loss during entry creation/editing
- No overlapping entries cause UI rendering issues
- Settings dialog is discoverable and functional
- Calendar loads with correct default view based on user preference

### Technical Quality Criteria
- TypeScript strict mode enabled, zero `any` types in core logic
- All components follow shadcn theme conventions
- Supabase client properly initialized with auth context
- React Query cache invalidation works correctly
- No console errors in production build
- Lighthouse accessibility score >90

---

## Implementation Notes

### Development Phases
1. **Phase 1**: Auth setup, database schema, main layout shell
2. **Phase 2**: Event creation and workspace navigation
3. **Phase 3**: Calendar UI (week view, read-only)
4. **Phase 4**: Calendar interactions (create, edit, delete)
5. **Phase 5**: Drag-and-drop functionality
6. **Phase 6**: Settings dialog and theme persistence
7. **Phase 7**: Mobile responsive refinements
8. **Phase 8**: Testing and bug fixes

### Key Technical Risks
- **Calendar custom UI complexity**: Mitigation: Use proven patterns from shadcn blocks, progressive enhancement
- **Drag-and-drop browser compatibility**: Mitigation: Polyfill or fallback to click-to-move
- **RLS policy performance**: Mitigation: Index optimization, limit query scope

### Documentation Requirements
- AGENTS.md must be kept up to date with all technical decisions
- Code comments for complex calendar calculations only
- Supabase schema documented in migration files
- No additional doc files allowed per user requirement

---

**End of PRD**
