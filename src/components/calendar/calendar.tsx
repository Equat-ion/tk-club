'use client'

import { useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '@/hooks/use-calendar-events'
import { useCalendars } from '@/hooks/use-calendars'
import { CalendarHeader } from './calendar-header'
import { WeekView } from './week-view'
import { MonthView } from './month-view'
import { EntryPopover } from './entry-popover'
import type { CalendarEvent, CalendarEventInsert } from '@/lib/database.types'

interface CalendarProps {
  eventId: string
}

export function Calendar({ eventId }: CalendarProps) {
  const calendarView = useAppStore((state) => state.calendarView)
  const calendarDate = useAppStore((state) => state.calendarDate)
  const setCalendarView = useAppStore((state) => state.setCalendarView)
  const setCalendarDate = useAppStore((state) => state.setCalendarDate)
  
  const { data: events = [], isLoading } = useCalendarEvents(eventId)
  const { data: calendars = [] } = useCalendars(eventId)
  const createEvent = useCreateCalendarEvent()
  const updateEvent = useUpdateCalendarEvent()
  const deleteEvent = useDeleteCalendarEvent()

  // Create a map of calendar IDs to calendar objects for easy lookup
  const calendarMap = calendars.reduce((acc, calendar) => {
    acc[calendar.id] = calendar
    return acc
  }, {} as Record<string, typeof calendars[0]>)

  // Filter events based on calendar visibility
  const visibleEvents = events.filter(event => {
    if (!event.calendar_id) return true // Always show events without calendar assignment
    const calendar = calendarMap[event.calendar_id]
    return calendar ? calendar.is_visible : true
  })

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })
  const [lastPopoverClose, setLastPopoverClose] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSlotClick = useCallback((date: Date) => {
    // Prevent reopening immediately after closing
    const now = Date.now()
    if (now - lastPopoverClose < 200) return
    
    setSelectedEvent(null)
    setSelectedSlotDate(date)
    setSelectedEndDate(null)
    
    // Calculate position near center of container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPopoverPosition({
        x: rect.width / 2,
        y: rect.height / 3,
      })
    }
    
    setPopoverOpen(true)
  }, [lastPopoverClose])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setSelectedSlotDate(null)
    setSelectedEndDate(null)
    
    // Calculate position near center of container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPopoverPosition({
        x: rect.width / 2,
        y: rect.height / 3,
      })
    }
    
    setPopoverOpen(true)
  }, [])

  const handleDayClick = useCallback((date: Date) => {
    // In month view, navigate to week view for selected date
    setCalendarDate(date)
    setCalendarView('week')
  }, [setCalendarDate, setCalendarView])

  const handleEventDrop = useCallback((event: CalendarEvent, newStart: Date, newEnd: Date) => {
    updateEvent.mutate({
      id: event.id,
      eventId,
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
    })
  }, [eventId, updateEvent])

  const handleSave = useCallback((data: CalendarEventInsert | { id: string } & Partial<CalendarEventInsert>) => {
    if ('id' in data && data.id) {
      updateEvent.mutate({
        id: data.id,
        eventId,
        ...data,
      })
    } else {
      createEvent.mutate(data as CalendarEventInsert)
    }
  }, [eventId, createEvent, updateEvent])

  const handleDelete = useCallback((id: string) => {
    deleteEvent.mutate({ id, eventId })
  }, [eventId, deleteEvent])

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setPopoverOpen(open)
    if (!open) {
      setLastPopoverClose(Date.now())
    }
  }, [])

  // Handler for drag-to-create events
  const handleCreateEvent = useCallback((start: Date, end: Date) => {
    // Prevent reopening immediately after closing
    const now = Date.now()
    if (now - lastPopoverClose < 200) return
    
    // Set the selected slot date and end date, then open the popover
    setSelectedEvent(null)
    setSelectedSlotDate(start)
    setSelectedEndDate(end)
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPopoverPosition({
        x: rect.width / 2,
        y: rect.height / 3,
      })
    }
    
    setPopoverOpen(true)
  }, [lastPopoverClose])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex flex-1 flex-col">
      <CalendarHeader />
      
      {calendarView === 'week' && (
        <WeekView
          date={calendarDate}
          events={visibleEvents}
          calendars={calendars}
          onSlotClick={handleSlotClick}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          onCreateEvent={handleCreateEvent}
          popoverOpen={popoverOpen}
        />
      )}
      
      {calendarView === 'month' && (
        <MonthView
          date={calendarDate}
          events={visibleEvents}
          calendars={calendars}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
        />
      )}

      <EntryPopover
        open={popoverOpen}
        onOpenChange={handlePopoverOpenChange}
        event={selectedEvent}
        defaultDate={selectedSlotDate || undefined}
        defaultEndDate={selectedEndDate || undefined}
        eventId={eventId}
        onSave={handleSave}
        onDelete={handleDelete}
        position={popoverPosition}
      />
    </div>
  )
}
