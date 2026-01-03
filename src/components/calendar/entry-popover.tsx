'use client'

import { useState, useEffect } from 'react'
import { format, addHours } from 'date-fns'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useCalendars } from '@/hooks/use-calendars'
import type { CalendarEvent, CalendarEventInsert } from '@/lib/database.types'
import { parseCalendarEventTime } from '@/lib/calendar-utils'

interface EntryPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEvent | null
  defaultDate?: Date
  defaultEndDate?: Date
  eventId: string
  onSave: (data: CalendarEventInsert | { id: string } & Partial<CalendarEventInsert>) => void
  onDelete?: (id: string) => void
  triggerRef?: React.RefObject<HTMLElement>
  position?: { x: number; y: number }
}

export function EntryPopover({
  open,
  onOpenChange,
  event,
  defaultDate,
  defaultEndDate,
  eventId,
  onSave,
  onDelete,
  position,
}: EntryPopoverProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [calendarId, setCalendarId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: calendars = [] } = useCalendars(eventId)

  // Populate form when editing or creating
  useEffect(() => {
    if (!open) return // Only run when popover is open
    
    if (event) {
      const start = parseCalendarEventTime(event.start_time)
      const end = parseCalendarEventTime(event.end_time)
      
      setTitle(event.title)
      setDescription(event.description || '')
      setLocation(event.location || '')
      setStartDate(format(start, 'yyyy-MM-dd'))
      setStartTime(format(start, 'HH:mm'))
      setEndDate(format(end, 'yyyy-MM-dd'))
      setEndTime(format(end, 'HH:mm'))
      setIsAllDay(event.is_all_day || false)
      setCalendarId(event.calendar_id || null)
    } else if (defaultDate) {
      // Use defaultEndDate if provided, otherwise add 1 hour to start
      const endDateTime = defaultEndDate || addHours(defaultDate, 1)
      
      // Find the default calendar
      const defaultCalendar = calendars.find(cal => cal.is_default)
      
      // Check if this is an all-day event (times are 00:00 to 23:59)
      const isAllDayEvent = 
        defaultDate.getHours() === 0 && 
        defaultDate.getMinutes() === 0 && 
        endDateTime.getHours() === 23 && 
        endDateTime.getMinutes() === 59
      
      setTitle('')
      setDescription('')
      setLocation('')
      setStartDate(format(defaultDate, 'yyyy-MM-dd'))
      setStartTime(format(defaultDate, 'HH:mm'))
      setEndDate(format(endDateTime, 'yyyy-MM-dd'))
      setEndTime(format(endDateTime, 'HH:mm'))
      setIsAllDay(isAllDayEvent)
      setCalendarId(defaultCalendar?.id || null)
    }
  }, [event, defaultDate, defaultEndDate, open, calendars])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // For all-day events, set time to midnight/end of day
    // For regular events, use the time inputs
    let start: Date
    let end: Date
    
    if (isAllDay) {
      start = new Date(`${startDate}T00:00:00`)
      end = new Date(`${endDate}T23:59:59`)
    } else {
      start = new Date(`${startDate}T${startTime}:00`)
      end = new Date(`${endDate}T${endTime}:00`)
    }
    
    // Validate that dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return
    }

    // Validate that end time is after start time
    if (end <= start) {
      return
    }
    
    // Ensure calendar_id is set (use default if not selected)
    const finalCalendarId = calendarId || calendars.find(cal => cal.is_default)?.id || calendars[0]?.id || null

    if (event) {
      onSave({
        id: event.id,
        title,
        description: description || null,
        location: location || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: isAllDay,
        calendar_id: finalCalendarId,
      })
    } else {
      onSave({
        event_id: eventId,
        title,
        description: description || null,
        location: location || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: isAllDay,
        calendar_id: finalCalendarId,
      })
    }
    
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id)
      setDeleteDialogOpen(false)
      onOpenChange(false)
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <span 
            className="absolute"
            style={position ? { 
              left: position.x, 
              top: position.y,
              width: 0,
              height: 0,
            } : undefined}
          />
        </PopoverTrigger>
        <PopoverContent 
          className="w-80" 
          align="start" 
          side="right"
          sideOffset={8}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Session title"
                required
                maxLength={200}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required={!isAllDay}
                  disabled={isAllDay}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={isAllDay}
                onCheckedChange={(checked) => setIsAllDay(checked === true)}
              />
              <Label
                htmlFor="allDay"
                className="text-sm font-normal cursor-pointer"
              >
                All day
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required={!isAllDay}
                  disabled={isAllDay}
                />
              </div>
            </div>

            {calendars.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="calendar">Calendar</Label>
                <Select
                  value={calendarId || ''}
                  onValueChange={(value) => setCalendarId(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: calendar.color }}
                          />
                          {calendar.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Room, area, etc."
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="flex justify-between">
              {event && onDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!title.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </form>
        </PopoverContent>
      </Popover>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this calendar entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
