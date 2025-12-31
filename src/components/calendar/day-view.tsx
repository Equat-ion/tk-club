'use client'

import { useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  getHoursOfDay,
  formatHour,
  format,
  isToday,
  isSameDay,
  getEventPosition,
  getTimeFromPosition,
  parseCalendarEventTime,
  setHours,
  setMinutes,
} from '@/lib/calendar-utils'
import type { CalendarEvent } from '@/lib/database.types'
import { CalendarEntry } from './calendar-entry'

interface DayViewProps {
  date: Date
  events: CalendarEvent[]
  onSlotClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onEventDrop: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
}

export function DayView({ 
  date, 
  events, 
  onSlotClick, 
  onEventClick,
  onEventDrop 
}: DayViewProps) {
  const hours = getHoursOfDay()
  const containerRef = useRef<HTMLDivElement>(null)

  const dayEvents = events.filter(event => {
    const eventStart = parseCalendarEventTime(event.start_time)
    return isSameDay(eventStart, date)
  })

  const handleSlotClick = useCallback((hour: number, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const minutes = Math.round(offsetY / rect.height * 60 / 15) * 15
    const clickedTime = setMinutes(setHours(date, hour), minutes)
    onSlotClick(clickedTime)
  }, [date, onSlotClick])

  const handleDrop = useCallback((e: React.DragEvent, hour: number) => {
    e.preventDefault()
    const eventData = e.dataTransfer.getData('text/plain')
    if (!eventData) return

    try {
      const event = JSON.parse(eventData) as CalendarEvent
      const rect = e.currentTarget.getBoundingClientRect()
      const offsetY = e.clientY - rect.top
      const minutes = Math.round(offsetY / rect.height * 60 / 15) * 15
      
      const newStart = setMinutes(setHours(date, hour), minutes)
      const eventStart = parseCalendarEventTime(event.start_time)
      const eventEnd = parseCalendarEventTime(event.end_time)
      const duration = eventEnd.getTime() - eventStart.getTime()
      const newEnd = new Date(newStart.getTime() + duration)

      onEventDrop(event, newStart, newEnd)
    } catch {
      // Invalid drag data
    }
  }, [date, onEventDrop])

  return (
    <div ref={containerRef} className="flex flex-1 flex-col overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex border-b bg-background">
        <div className="w-15 shrink-0 border-r" />
        <div
          className={cn(
            'flex-1 py-2 text-center',
            isToday(date) && 'bg-primary/5'
          )}
        >
          <div className="text-xs text-muted-foreground">
            {format(date, 'EEEE')}
          </div>
          <div className={cn(
            'text-lg font-semibold',
            isToday(date) && 'text-primary'
          )}>
            {format(date, 'MMMM d')}
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="relative flex flex-1">
        {/* Time column */}
        <div className="sticky left-0 z-10 w-15 shrink-0 border-r bg-background">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-16 border-b px-2 text-right"
            >
              <span className="text-xs text-muted-foreground -mt-2 block">
                {formatHour(hour)}
              </span>
            </div>
          ))}
        </div>

        {/* Day column */}
        <div
          className={cn(
            'relative flex-1',
            isToday(date) && 'bg-primary/5'
          )}
        >
          {/* Hour slots */}
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-16 border-b cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={(e) => handleSlotClick(hour.getHours(), e)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, hour.getHours())}
            />
          ))}

          {/* Events */}
          {dayEvents.map((event) => {
            const startTime = parseCalendarEventTime(event.start_time)
            const endTime = parseCalendarEventTime(event.end_time)
            const dayStart = new Date(date)
            dayStart.setHours(0, 0, 0, 0)
            const { top, height } = getEventPosition(startTime, endTime, dayStart)

            return (
              <CalendarEntry
                key={event.id}
                event={event}
                style={{ top, height }}
                onClick={() => onEventClick(event)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
