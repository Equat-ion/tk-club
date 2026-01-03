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
  differenceInDays,
} from '@/lib/calendar-utils'
import type { CalendarEvent, Calendar } from '@/lib/database.types'

interface MonthViewProps {
  date: Date
  events: CalendarEvent[]
  calendars: Calendar[]
  onDayClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onEventDrop?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  onCreateAllDayEvent?: (startDate: Date, endDate: Date) => void
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const weekDaysAriaLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Helper to check if an event starts on a specific day
function eventStartsOnDay(event: CalendarEvent, day: Date): boolean {
  const eventStart = parseCalendarEventTime(event.start_time)
  return isSameDay(eventStart, day)
}

// Multi-day event position for a week row
interface WeekEventPosition {
  event: CalendarEvent
  startCol: number // 0-6
  endCol: number // 0-6
  row: number // vertical stacking row
}

// Calculate multi-day event positions for a week
function calculateWeekEventPositions(
  events: CalendarEvent[],
  weekDays: Date[]
): WeekEventPosition[] {
  const positions: WeekEventPosition[] = []
  const rows: { endCol: number }[][] = []
  
  // Filter to only multi-day events that occur in this week
  const multiDayEvents = events.filter(event => {
    if (!isMultiDayEvent(event)) return false
    return weekDays.some(day => eventOccursOnDay(event, day))
  })
  
  // Sort by start date, then duration (longer first)
  const sortedEvents = [...multiDayEvents].sort((a, b) => {
    const startA = parseCalendarEventTime(a.start_time)
    const startB = parseCalendarEventTime(b.start_time)
    const diff = startA.getTime() - startB.getTime()
    if (diff !== 0) return diff
    
    const endA = parseCalendarEventTime(a.end_time)
    const endB = parseCalendarEventTime(b.end_time)
    const durationA = endA.getTime() - startA.getTime()
    const durationB = endB.getTime() - startB.getTime()
    return durationB - durationA
  })
  
  for (const event of sortedEvents) {
    const eventStart = startOfDay(parseCalendarEventTime(event.start_time))
    const eventEnd = startOfDay(parseCalendarEventTime(event.end_time))
    
    // Find column indices within this week
    let startCol = weekDays.findIndex(d => isSameDay(d, eventStart))
    let endCol = weekDays.findIndex(d => isSameDay(d, eventEnd))
    
    // Clamp to week boundaries
    if (startCol === -1) {
      if (eventStart < weekDays[0]) startCol = 0
      else continue
    }
    if (endCol === -1) {
      if (eventEnd > weekDays[6]) endCol = 6
      else continue
    }
    
    // Find available row
    let row = 0
    while (rows[row]) {
      const canFit = !rows[row].some(slot => slot.endCol >= startCol)
      if (canFit) break
      row++
    }
    
    if (!rows[row]) rows[row] = []
    rows[row].push({ endCol })
    
    positions.push({ event, startCol, endCol, row })
  }
  
  return positions
}

export function MonthView({ 
  date, 
  events, 
  calendars,
  onDayClick, 
  onEventClick,
  onEventDrop,
  onCreateAllDayEvent,
}: MonthViewProps) {
  const days = getMonthDays(date)
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [dragStartDayOffset, setDragStartDayOffset] = useState<number>(0) // Which day of the event was grabbed
  const [dropTargetDay, setDropTargetDay] = useState<Date | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ weekIndex: number; startCol: number; endCol: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Drag-to-create multi-day event state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null)

  // Create a map of calendar IDs to calendar objects for easy lookup
  const calendarMap = calendars.reduce((acc, calendar) => {
    acc[calendar.id] = calendar
    return acc
  }, {} as Record<string, Calendar>)
  
  // Group days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  // Get single-day events for a specific day
  const getSingleDayEventsForDay = useCallback((day: Date) => {
    return events.filter(event => {
      if (isMultiDayEvent(event)) return false
      return eventOccursOnDay(event, day)
    })
  }, [events])

  // Track which day of the event was grabbed when dragging
  const handleDragStart = useCallback((event: CalendarEvent, dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setDraggedEvent(event)
    setDragStartDayOffset(dayIndex)
  }, [])

  const handleDragEnter = useCallback((day: Date, weekIndex: number, dayIndex: number) => {
    if (draggedEvent) {
      setDropTargetDay(day)
      
      // Calculate real-time preview position
      const eventStart = parseCalendarEventTime(draggedEvent.start_time)
      const eventEnd = parseCalendarEventTime(draggedEvent.end_time)
      const eventDuration = differenceInDays(startOfDay(eventEnd), startOfDay(eventStart))
      
      // Calculate where the event would start based on grab offset
      const previewStartCol = dayIndex - dragStartDayOffset
      const previewEndCol = previewStartCol + eventDuration
      
      // Clamp to week boundaries
      const clampedStartCol = Math.max(0, previewStartCol)
      const clampedEndCol = Math.min(6, previewEndCol)
      
      setPreviewPosition({
        weekIndex,
        startCol: clampedStartCol,
        endCol: clampedEndCol,
      })
    }
  }, [draggedEvent, dragStartDayOffset])

  const handleDragLeave = useCallback(() => {
    // Don't clear preview on drag leave - only clear on drop or cancel
  }, [])

  const handleDrop = useCallback((targetDay: Date) => {
    if (!draggedEvent || !onEventDrop) {
      setDraggedEvent(null)
      setDropTargetDay(null)
      setDragStartDayOffset(0)
      return
    }

    const eventStart = parseCalendarEventTime(draggedEvent.start_time)
    const eventEnd = parseCalendarEventTime(draggedEvent.end_time)
    
    // Calculate the new start day based on where user grabbed the event
    // If user grabbed day 2 of a 3-day event and dropped on Monday,
    // the event should start on Saturday (2 days before Monday)
    const targetDayStart = startOfDay(targetDay)
    const newStartDay = addDays(targetDayStart, -dragStartDayOffset)
    
    // Calculate day offset from original start
    const originalStartDay = startOfDay(eventStart)
    const dayDiff = newStartDay.getTime() - originalStartDay.getTime()
    
    // Create new dates preserving the original time
    const newStart = new Date(eventStart.getTime() + dayDiff)
    const newEnd = new Date(eventEnd.getTime() + dayDiff)

    onEventDrop(draggedEvent, newStart, newEnd)
    setDraggedEvent(null)
    setDropTargetDay(null)
    setDragStartDayOffset(0)
    setPreviewPosition(null)
  }, [draggedEvent, onEventDrop, dragStartDayOffset])

  const handleMouseUp = useCallback(() => {
    if (draggedEvent && dropTargetDay) {
      handleDrop(dropTargetDay)
    } else {
      setDraggedEvent(null)
      setDropTargetDay(null)
      setDragStartDayOffset(0)
      setPreviewPosition(null)
    }
    
    // Handle multi-day selection
    if (isSelecting && selectionStart && selectionEnd && onCreateAllDayEvent) {
      // Ensure start is before end
      const start = selectionStart <= selectionEnd ? selectionStart : selectionEnd
      const end = selectionStart <= selectionEnd ? selectionEnd : selectionStart
      onCreateAllDayEvent(start, end)
    }
    
    // Reset selection state
    setIsSelecting(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [draggedEvent, dropTargetDay, handleDrop, isSelecting, selectionStart, selectionEnd, onCreateAllDayEvent])

  // Start multi-day selection (only when no event is being dragged)
  const handleSelectionStart = useCallback((day: Date, e: React.MouseEvent) => {
    if (draggedEvent) return
    e.preventDefault()
    setIsSelecting(true)
    setSelectionStart(day)
    setSelectionEnd(day)
  }, [draggedEvent])

  // Update selection end as mouse moves
  const handleSelectionMove = useCallback((day: Date) => {
    if (isSelecting && selectionStart) {
      setSelectionEnd(day)
    }
  }, [isSelecting, selectionStart])
  
  // Check if a day is within the current selection range
  const isDaySelected = useCallback((day: Date) => {
    if (!isSelecting || !selectionStart || !selectionEnd) return false
    const start = selectionStart <= selectionEnd ? selectionStart : selectionEnd
    const end = selectionStart <= selectionEnd ? selectionEnd : selectionStart
    return day >= start && day <= end
  }, [isSelecting, selectionStart, selectionEnd])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1 h-full">
        <div 
          ref={containerRef}
          className="relative flex flex-col p-4"
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setDraggedEvent(null)
            setDropTargetDay(null)
            setDragStartDayOffset(0)
            setPreviewPosition(null)
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

        {/* Calendar grid - by week */}
        <div className="flex flex-col gap-px">
          {weeks.map((week, weekIndex) => {
            const weekEventPositions = calculateWeekEventPositions(events, week)
            const maxRow = weekEventPositions.length > 0 
              ? Math.max(...weekEventPositions.map(p => p.row)) + 1 
              : 0
            
            return (
              <div key={weekIndex} className="relative">
                {/* Multi-day event bars - positioned absolutely over the week */}
                <div 
                  className="absolute inset-x-0 z-10 pointer-events-none"
                  style={{ top: '28px' }}
                >
                  {weekEventPositions.map(({ event, startCol, endCol, row }) => {
                    const calendar = event.calendar_id ? calendarMap[event.calendar_id] : undefined
                    const isDragging = draggedEvent?.id === event.id
                    const eventStart = startOfDay(parseCalendarEventTime(event.start_time))
                    const eventEnd = startOfDay(parseCalendarEventTime(event.end_time))
                    
                    // Determine if this segment shows the start/end of the entire event
                    const isEventStart = isSameDay(week[startCol], eventStart)
                    const isEventEnd = isSameDay(week[endCol], eventEnd)
                    
                    // Calculate position
                    const leftPercent = (startCol / 7) * 100
                    const widthPercent = ((endCol - startCol + 1) / 7) * 100
                    
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "absolute",
                          isDragging && 'opacity-30'
                        )}
                        style={{
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                          top: `${row * 44}px`,
                          height: '40px',
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!draggedEvent) onEventClick(event)
                          }}
                          onMouseDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const clickX = e.clientX - rect.left
                            const segmentWidth = rect.width / (endCol - startCol + 1)
                            const clickedSegment = Math.floor(clickX / segmentWidth)
                            const colIndex = startCol + clickedSegment
                            const dayOfEvent = Math.floor(
                              (week[colIndex].getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)
                            )
                            handleDragStart(event, dayOfEvent, e)
                          }}
                          className={cn(
                            'w-full h-full pointer-events-auto cursor-grab transition-opacity flex items-center text-xs font-medium truncate overflow-hidden',
                            isEventStart && isEventEnd && 'rounded-sm',
                            isEventStart && !isEventEnd && 'rounded-l-sm',
                            !isEventStart && isEventEnd && 'rounded-r-sm',
                            !isEventStart && !isEventEnd && 'rounded-none',
                            !isDragging && 'hover:brightness-110'
                          )}
                          style={{
                            backgroundColor: calendar?.color ? `${calendar.color}20` : 'hsl(var(--primary) / 0.1)',
                            color: calendar?.color || 'hsl(var(--foreground))',
                          }}
                        >
                          {/* Accent bar on left */}
                          {isEventStart && (
                            <div 
                              className="w-1 h-full shrink-0 rounded-l-sm"
                              style={{ backgroundColor: calendar?.color || 'hsl(var(--primary))' }}
                            />
                          )}
                          <span className="px-2 truncate">{event.title}</span>
                        </button>
                      </div>
                    )
                  })}
                  
                  {/* Real-time drag preview */}
                  {previewPosition && previewPosition.weekIndex === weekIndex && draggedEvent && (
                    <div
                      className="absolute pointer-events-none rounded-sm border-2 border-primary border-dashed bg-primary/20"
                      style={{
                        left: `calc(${(previewPosition.startCol / 7) * 100}% + 2px)`,
                        width: `calc(${((previewPosition.endCol - previewPosition.startCol + 1) / 7) * 100}% - 4px)`,
                        top: '0px',
                        height: '40px',
                      }}
                    />
                  )}
                </div>
                
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-px">
                  {week.map((day, dayIndex) => {
                    const singleDayEvents = getSingleDayEventsForDay(day)
                    const isCurrentMonth = isSameMonth(day, date)
                    const isCurrentDay = isToday(day)
                    const isDropTarget = dropTargetDay && isSameDay(dropTargetDay, day)
                    const isSelected = isDaySelected(day)
                    
                    // Calculate visible events and overflow count
                    const maxVisibleEvents = Math.max(0, 3 - maxRow)
                    const visibleEvents = singleDayEvents.slice(0, maxVisibleEvents)
                    const overflowCount = singleDayEvents.length - maxVisibleEvents

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'min-h-24 border p-1 cursor-pointer transition-colors',
                          !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                          isCurrentDay && 'bg-primary/5 border-primary',
                          !draggedEvent && 'hover:bg-muted/50',
                          isDropTarget && 'bg-primary/20',
                          isSelected && 'bg-primary/10 border-primary ring-1 ring-primary'
                        )}
                        onClick={() => !draggedEvent && !isSelecting && onDayClick(day)}
                        onMouseDown={(e) => {
                          const target = e.target as HTMLElement
                          if (!target.closest('button')) {
                            handleSelectionStart(day, e)
                          }
                        }}
                        onMouseEnter={() => {
                          handleDragEnter(day, weekIndex, dayIndex)
                          handleSelectionMove(day)
                        }}
                        onMouseLeave={handleDragLeave}
                      >
                        <div className={cn(
                          'text-xs font-medium',
                          isCurrentDay && 'text-primary font-semibold'
                        )}>
                          {format(day, 'd')}
                        </div>
                        
                        {/* Spacer for multi-day events - reserves space even on days without multi-day events */}
                        {maxRow > 0 && (
                          <div style={{ height: `${12 + maxRow * 44}px` }} />
                        )}
                        
                        {/* Single-day events */}
                        <div className={cn("space-y-1", maxRow === 0 && "mt-1")}>
                          {visibleEvents.map((event) => {
                            const isDragging = draggedEvent?.id === event.id
                            const calendar = event.calendar_id ? calendarMap[event.calendar_id] : undefined
                            
                            return (
                              <button
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!draggedEvent) onEventClick(event)
                                }}
                                onMouseDown={(e) => handleDragStart(event, 0, e)}
                                className={cn(
                                  'w-full h-7 flex items-center text-left text-xs rounded-sm transition-all overflow-hidden',
                                  !isDragging && 'hover:brightness-110',
                                  isDragging && 'opacity-50 ring-2 ring-primary'
                                )}
                                style={{
                                  backgroundColor: calendar?.color ? `${calendar.color}20` : 'hsl(var(--primary) / 0.1)',
                                  color: calendar?.color || 'hsl(var(--foreground))'
                                }}
                              >
                                {/* Accent bar on left */}
                                <div 
                                  className="w-1 h-full shrink-0 rounded-l-sm"
                                  style={{ backgroundColor: calendar?.color || 'hsl(var(--primary))' }}
                                />
                                <span className="px-2 truncate">{event.title}</span>
                              </button>
                            )
                          })}
                          
                          {/* Overflow indicator */}
                          {overflowCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDayClick(day)
                              }}
                              className="w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-sm px-1 py-0.5 transition-colors"
                            >
                              +{overflowCount} more
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Remove the floating indicator - the preview shows the position */}
      </div>
    </ScrollArea>
    </div>
  )
}
