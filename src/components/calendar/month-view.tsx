'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  getMonthDays,
  format,
  isToday,
  isSameDay,
  isSameMonth,
  parseCalendarEventTime,
  eventOccursOnDay,
  isMultiDayEvent,
  startOfDay,
  addDays,
} from '@/lib/calendar-utils'
import type { CalendarEvent, Calendar } from '@/lib/database.types'

interface MonthViewProps {
  date: Date
  events: CalendarEvent[]
  calendars: Calendar[]
  onDayClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onEventDrop?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
}

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Helper to check if an event starts on a specific day
function eventStartsOnDay(event: CalendarEvent, day: Date): boolean {
  const eventStart = parseCalendarEventTime(event.start_time)
  return isSameDay(eventStart, day)
}

// Helper to check if an event continues from a previous day
function eventContinuesFromPrevious(event: CalendarEvent, day: Date): boolean {
  const eventStart = parseCalendarEventTime(event.start_time)
  return startOfDay(eventStart) < startOfDay(day)
}

// Helper to check if an event continues to the next day
function eventContinuesToNext(event: CalendarEvent, day: Date): boolean {
  const eventEnd = parseCalendarEventTime(event.end_time)
  return startOfDay(eventEnd) > startOfDay(day)
}

export function MonthView({ 
  date, 
  events, 
  calendars,
  onDayClick, 
  onEventClick,
  onEventDrop,
}: MonthViewProps) {
  const days = getMonthDays(date)
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [dropTargetDay, setDropTargetDay] = useState<Date | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Create a map of calendar IDs to calendar objects for easy lookup
  const calendarMap = calendars.reduce((acc, calendar) => {
    acc[calendar.id] = calendar
    return acc
  }, {} as Record<string, Calendar>)

  // Get all events that occur on a given day (including multi-day events)
  const getEventsForDay = useCallback((day: Date) => {
    return events.filter(event => eventOccursOnDay(event, day))
  }, [events])

  const handleDragStart = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setDraggedEvent(event)
  }, [])

  const handleDragEnter = useCallback((day: Date) => {
    if (draggedEvent) {
      setDropTargetDay(day)
    }
  }, [draggedEvent])

  const handleDragLeave = useCallback(() => {
    setDropTargetDay(null)
  }, [])

  const handleDrop = useCallback((targetDay: Date) => {
    if (!draggedEvent || !onEventDrop) {
      setDraggedEvent(null)
      setDropTargetDay(null)
      return
    }

    const eventStart = parseCalendarEventTime(draggedEvent.start_time)
    const eventEnd = parseCalendarEventTime(draggedEvent.end_time)
    
    // Calculate the day difference
    const originalDay = new Date(eventStart)
    originalDay.setHours(0, 0, 0, 0)
    const newDay = new Date(targetDay)
    newDay.setHours(0, 0, 0, 0)
    
    const dayDiff = newDay.getTime() - originalDay.getTime()
    
    // Create new dates preserving the original time
    const newStart = new Date(eventStart.getTime() + dayDiff)
    const newEnd = new Date(eventEnd.getTime() + dayDiff)

    onEventDrop(draggedEvent, newStart, newEnd)
    setDraggedEvent(null)
    setDropTargetDay(null)
  }, [draggedEvent, onEventDrop])

  const handleMouseUp = useCallback(() => {
    if (draggedEvent && dropTargetDay) {
      handleDrop(dropTargetDay)
    } else {
      setDraggedEvent(null)
      setDropTargetDay(null)
    }
  }, [draggedEvent, dropTargetDay, handleDrop])

  return (
    <ScrollArea className="flex-1 h-full">
      <div 
        ref={containerRef}
        className="relative flex flex-col p-4"
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setDraggedEvent(null)
        setDropTargetDay(null)
      }}
    >
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-px border-b pb-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7 gap-px">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, date)
          const isCurrentDay = isToday(day)
          const isDropTarget = dropTargetDay && isSameDay(dropTargetDay, day)

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-24 border p-1 cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                isCurrentDay && 'bg-primary/5 border-primary',
                !draggedEvent && 'hover:bg-muted/50',
                isDropTarget && 'bg-primary/20 border-primary border-2'
              )}
              onClick={() => !draggedEvent && onDayClick(day)}
              onMouseEnter={() => handleDragEnter(day)}
              onMouseLeave={handleDragLeave}
            >
              <div className={cn(
                'text-xs font-medium mb-1',
                isCurrentDay && 'text-primary font-semibold'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const isDragging = draggedEvent?.id === event.id
                  const isMultiDay = isMultiDayEvent(event)
                  const startsToday = eventStartsOnDay(event, day)
                  const continuesFromPrev = eventContinuesFromPrevious(event, day)
                  const continuesToNext = eventContinuesToNext(event, day)
                  const calendar = event.calendar_id ? calendarMap[event.calendar_id] : undefined
                  
                  return (
                    <button
                      key={`${event.id}-${day.toISOString()}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!draggedEvent) {
                          onEventClick(event)
                        }
                      }}
                      onMouseDown={(e) => handleDragStart(event, e)}
                      className={cn(
                        'w-full truncate px-1 py-0.5 text-left text-xs transition-all',
                        // Multi-day event styling
                        isMultiDay ? [
                          'text-primary-foreground font-medium',
                          continuesFromPrev ? 'rounded-l-none -ml-1 pl-2' : 'rounded-l-sm',
                          continuesToNext ? 'rounded-r-none -mr-1 pr-2' : 'rounded-r-sm',
                        ] : [
                          'rounded-sm',
                          !isDragging && 'hover:brightness-110',
                        ],
                        isDragging && 'opacity-50 ring-2 ring-primary'
                      )}
                      style={{
                        backgroundColor: calendar?.color ? 
                          (isMultiDay ? `${calendar.color}CC` : `${calendar.color}1A`) : 
                          (isMultiDay ? 'hsl(var(--primary) / 0.8)' : 'hsl(var(--primary) / 0.1)'),
                        color: calendar?.color && isMultiDay ? '#ffffff' : calendar?.color || undefined
                      }}
                    >
                      {/* Show arrow for continuation from previous day */}
                      {continuesFromPrev && !startsToday && (
                        <span className="mr-1">→</span>
                      )}
                      {event.title}
                    </button>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Drag indicator */}
      {draggedEvent && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm shadow-lg z-50">
          Moving: {draggedEvent.title}
        </div>
      )}
      </div>
    </ScrollArea>
  )
}
