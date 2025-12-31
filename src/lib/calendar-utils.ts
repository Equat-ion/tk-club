import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  eachDayOfInterval,
  eachHourOfInterval,
  setHours,
  setMinutes,
  differenceInMinutes,
  differenceInDays,
  parseISO,
  isAfter,
  isBefore,
  isWithinInterval,
  max,
  min,
} from 'date-fns'
import type { CalendarEvent } from '@/lib/database.types'

export type CalendarView = 'week' | 'month'

export function getViewDateRange(date: Date, view: CalendarView) {
  switch (view) {
    case 'week':
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(date, { weekStartsOn: 1 }),
      }
    case 'month':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      }
  }
}

export function navigateDate(date: Date, view: CalendarView, direction: 'prev' | 'next' | 'today') {
  if (direction === 'today') {
    return new Date()
  }

  const delta = direction === 'next' ? 1 : -1

  switch (view) {
    case 'week':
      return delta > 0 ? addWeeks(date, 1) : subWeeks(date, 1)
    case 'month':
      return delta > 0 ? addMonths(date, 1) : subMonths(date, 1)
  }
}

export function getWeekDays(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({
    start,
    end: addDays(start, 6),
  })
}

export function getMonthDays(date: Date) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  return eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })
}

export function getHoursOfDay() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  
  // Return hours 0-23 (24 hours total, ending at midnight)
  const hours = eachHourOfInterval({
    start,
    end: setHours(start, 23),
  })
  
  // Add the final hour marker at 12 AM (midnight)
  const endMarker = new Date(start)
  endMarker.setHours(24, 0, 0, 0)
  hours.push(endMarker)
  
  return hours
}

export function formatTime(date: Date) {
  return format(date, 'h:mm a')
}

export function formatHour(date: Date) {
  return format(date, 'h a')
}

export function formatDateHeader(date: Date, view: CalendarView) {
  switch (view) {
    case 'week':
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
      if (isSameMonth(weekStart, weekEnd)) {
        return `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'd, yyyy')}`
      }
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    case 'month':
      return format(date, 'MMMM yyyy')
  }
}

export function getEventPosition(startTime: Date, endTime: Date, dayStart: Date) {
  const dayStartMinutes = dayStart.getHours() * 60 + dayStart.getMinutes()
  const eventStartMinutes = startTime.getHours() * 60 + startTime.getMinutes()
  const eventEndMinutes = endTime.getHours() * 60 + endTime.getMinutes()

  const top = ((eventStartMinutes - dayStartMinutes) / 60) * 64 // 64px per hour
  const height = ((eventEndMinutes - eventStartMinutes) / 60) * 64

  return { top: Math.max(0, top), height: Math.max(16, height) }
}

export function getTimeFromPosition(y: number, dayDate: Date) {
  const hours = Math.floor(y / 64)
  const minutes = Math.round((y % 64) / 64 * 60 / 15) * 15 // Round to 15 minutes
  
  return setMinutes(setHours(dayDate, hours), minutes)
}

export function parseCalendarEventTime(timeString: string) {
  return parseISO(timeString)
}

export { 
  isSameDay, 
  isSameMonth, 
  isToday, 
  format, 
  addDays,
  differenceInMinutes,
  setHours,
  setMinutes,
  startOfDay,
  endOfDay,
}

// Types for overlapping event layout
export interface EventWithPosition extends CalendarEvent {
  column: number
  totalColumns: number
}

// Calculate overlapping event positions using a staggered layout algorithm
export function calculateOverlappingPositions(events: CalendarEvent[]): EventWithPosition[] {
  if (events.length === 0) return []

  // Sort events by start time, then by duration (longer events first)
  const sortedEvents = [...events].sort((a, b) => {
    const startA = parseISO(a.start_time)
    const startB = parseISO(b.start_time)
    const diff = startA.getTime() - startB.getTime()
    if (diff !== 0) return diff
    
    // If same start time, longer events first
    const durationA = parseISO(a.end_time).getTime() - startA.getTime()
    const durationB = parseISO(b.end_time).getTime() - startB.getTime()
    return durationB - durationA
  })

  // Find collision groups - groups of events that overlap with each other
  const groups: CalendarEvent[][] = []
  let currentGroup: CalendarEvent[] = []
  let groupEnd = new Date(0)

  for (const event of sortedEvents) {
    const eventStart = parseISO(event.start_time)
    const eventEnd = parseISO(event.end_time)

    if (eventStart >= groupEnd) {
      // Start a new group
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
      }
      currentGroup = [event]
      groupEnd = eventEnd
    } else {
      // Add to current group
      currentGroup.push(event)
      if (eventEnd > groupEnd) {
        groupEnd = eventEnd
      }
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  // Process each group and assign columns
  const result: EventWithPosition[] = []

  for (const group of groups) {
    if (group.length === 1) {
      // Single event - takes full width
      result.push({
        ...group[0],
        column: 0,
        totalColumns: 1,
      })
      continue
    }

    // For overlapping events, assign columns
    const columns: CalendarEvent[][] = []

    for (const event of group) {
      const eventStart = parseISO(event.start_time)
      
      // Find the first column where this event doesn't overlap
      let placed = false
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const column = columns[colIndex]
        const lastEventInColumn = column[column.length - 1]
        const lastEventEnd = parseISO(lastEventInColumn.end_time)

        if (eventStart >= lastEventEnd) {
          // Can place in this column
          column.push(event)
          placed = true
          break
        }
      }

      if (!placed) {
        // Need a new column
        columns.push([event])
      }
    }

    // Assign column info to each event
    const totalColumns = columns.length
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      for (const event of columns[colIndex]) {
        result.push({
          ...event,
          column: colIndex,
          totalColumns,
        })
      }
    }
  }

  return result
}


// Get event style with overlap handling
export function getEventOverlapStyle(
  event: EventWithPosition, 
  dayStart: Date,
  inset: number = 2
): { top: number; height: number; left: string; width: string } {
  const { top, height } = getEventPosition(
    parseISO(event.start_time), 
    parseISO(event.end_time), 
    dayStart
  )

  // Calculate width and left position based on column
  const widthPercent = 100 / event.totalColumns
  const leftPercent = event.column * widthPercent

  return {
    top,
    height,
    left: `calc(${leftPercent}% + ${inset}px)`,
    width: `calc(${widthPercent}% - ${inset * 2}px)`,
  }
}

// ============================================
// Multi-day Event Utilities
// ============================================

/**
 * Check if an event spans multiple days
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  const start = parseISO(event.start_time)
  const end = parseISO(event.end_time)
  return !isSameDay(start, end)
}

/**
 * Check if an event is an all-day event (spans full 24 hours or multiple days)
 */
export function isAllDayEvent(event: CalendarEvent): boolean {
  const start = parseISO(event.start_time)
  const end = parseISO(event.end_time)
  
  // Multi-day events are treated as all-day
  if (!isSameDay(start, end)) return true
  
  // Check if it spans the full day (midnight to midnight or close to it)
  const startHour = start.getHours()
  const endHour = end.getHours()
  const endMinute = end.getMinutes()
  
  return startHour === 0 && start.getMinutes() === 0 && 
         ((endHour === 23 && endMinute >= 59) || (endHour === 0 && endMinute === 0 && !isSameDay(start, end)))
}

/**
 * Get the days an event spans within a given date range
 */
export function getEventDaysInRange(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): Date[] {
  const eventStart = startOfDay(parseISO(event.start_time))
  const eventEnd = startOfDay(parseISO(event.end_time))
  
  // Clamp to range
  const start = max([eventStart, startOfDay(rangeStart)])
  const end = min([eventEnd, startOfDay(rangeEnd)])
  
  if (isAfter(start, end)) return []
  
  return eachDayOfInterval({ start, end })
}

/**
 * Check if an event occurs on a specific day
 */
export function eventOccursOnDay(event: CalendarEvent, day: Date): boolean {
  const eventStart = parseISO(event.start_time)
  const eventEnd = parseISO(event.end_time)
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  
  // Event occurs on this day if:
  // - Event starts before day ends AND event ends after day starts
  return isBefore(eventStart, dayEnd) && isAfter(eventEnd, dayStart)
}

/**
 * Split events into regular (single-day) and multi-day categories
 */
export function categorizeEvents(events: CalendarEvent[]): {
  regularEvents: CalendarEvent[]
  multiDayEvents: CalendarEvent[]
} {
  const regularEvents: CalendarEvent[] = []
  const multiDayEvents: CalendarEvent[] = []
  
  for (const event of events) {
    // All-day events or multi-day events go into multiDayEvents
    if (event.is_all_day || isMultiDayEvent(event)) {
      multiDayEvents.push(event)
    } else {
      regularEvents.push(event)
    }
  }
  
  return { regularEvents, multiDayEvents }
}

/**
 * For a multi-day event on a specific day, get the display times for that day
 */
export function getEventTimesForDay(event: CalendarEvent, day: Date): { start: Date; end: Date } {
  const eventStart = parseISO(event.start_time)
  const eventEnd = parseISO(event.end_time)
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  
  // If event starts on this day, use actual start time, otherwise start of day
  const displayStart = isSameDay(eventStart, day) ? eventStart : dayStart
  
  // If event ends on this day, use actual end time, otherwise end of day
  const displayEnd = isSameDay(eventEnd, day) ? eventEnd : dayEnd
  
  return { start: displayStart, end: displayEnd }
}

/**
 * Calculate position for multi-day event display in week view header
 */
export interface MultiDayEventPosition {
  event: CalendarEvent
  startDayIndex: number
  endDayIndex: number
  row: number
}

export function calculateMultiDayEventPositions(
  events: CalendarEvent[],
  days: Date[]
): MultiDayEventPosition[] {
  const positions: MultiDayEventPosition[] = []
  const rows: { endDayIndex: number }[][] = []
  
  // Sort by start date, then by duration (longer first)
  const sortedEvents = [...events].sort((a, b) => {
    const startA = parseISO(a.start_time)
    const startB = parseISO(b.start_time)
    const diff = startA.getTime() - startB.getTime()
    if (diff !== 0) return diff
    
    const durationA = parseISO(a.end_time).getTime() - startA.getTime()
    const durationB = parseISO(b.end_time).getTime() - startB.getTime()
    return durationB - durationA
  })
  
  for (const event of sortedEvents) {
    const eventStart = startOfDay(parseISO(event.start_time))
    const eventEnd = startOfDay(parseISO(event.end_time))
    
    // Find day indices within the week
    let startDayIndex = days.findIndex(d => isSameDay(d, eventStart))
    let endDayIndex = days.findIndex(d => isSameDay(d, eventEnd))
    
    // Clamp to week boundaries
    if (startDayIndex === -1) {
      if (isBefore(eventStart, days[0])) {
        startDayIndex = 0
      } else {
        continue // Event doesn't overlap this week
      }
    }
    
    if (endDayIndex === -1) {
      if (isAfter(eventEnd, days[days.length - 1])) {
        endDayIndex = days.length - 1
      } else {
        continue // Event doesn't overlap this week
      }
    }
    
    // Find available row
    let row = 0
    while (rows[row]) {
      const canFit = !rows[row].some(
        slot => slot.endDayIndex >= startDayIndex
      )
      if (canFit) break
      row++
    }
    
    if (!rows[row]) rows[row] = []
    rows[row].push({ endDayIndex })
    
    positions.push({
      event,
      startDayIndex,
      endDayIndex,
      row,
    })
  }
  
  return positions
}

export { differenceInDays }
