'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { Plus, Eye, EyeSlash, Trash, Lock, CaretRight, PencilSimple } from '@phosphor-icons/react'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { useAppStore } from '@/lib/store'
import { useCalendars, useCreateCalendar, useToggleCalendarVisibility, useDeleteCalendar, useUpdateCalendar, CALENDAR_COLORS } from '@/hooks/use-calendars'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { cn } from '@/lib/utils'
import { isSameDay, parseISO } from 'date-fns'
import type { Calendar, CalendarEvent } from '@/lib/database.types'

interface CalendarSidebarProps {
  eventId: string
}

export function CalendarSidebar({ eventId }: CalendarSidebarProps) {
  const calendarDate = useAppStore((state) => state.calendarDate)
  const setCalendarDate = useAppStore((state) => state.setCalendarDate)
  
  const { data: calendars = [], isLoading } = useCalendars(eventId)
  const { data: events = [] } = useCalendarEvents(eventId)
  const createCalendar = useCreateCalendar()
  const toggleVisibility = useToggleCalendarVisibility()
  const deleteCalendar = useDeleteCalendar()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newCalendarName, setNewCalendarName] = useState('')
  const [selectedColor, setSelectedColor] = useState(CALENDAR_COLORS[0].value)

  // Compute days that have events (for showing dots)
  const daysWithEvents = useMemo(() => {
    const days = new Set<string>()
    events.forEach((event: CalendarEvent) => {
      const start = parseISO(event.start_time)
      const end = parseISO(event.end_time)
      // Add all days the event spans
      let current = new Date(start)
      while (current <= end) {
        days.add(current.toDateString())
        current.setDate(current.getDate() + 1)
      }
    })
    return days
  }, [events])

  // Modifier for days with events
  const eventDayModifier = useMemo(() => {
    return (day: Date) => daysWithEvents.has(day.toDateString())
  }, [daysWithEvents])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCalendarDate(date)
    }
  }

  const handleCreateCalendar = () => {
    if (!newCalendarName.trim()) return

    createCalendar.mutate(
      {
        event_id: eventId,
        name: newCalendarName.trim(),
        color: selectedColor,
      },
      {
        onSuccess: () => {
          setNewCalendarName('')
          setSelectedColor(CALENDAR_COLORS[0].value)
          setCreateDialogOpen(false)
        },
      }
    )
  }

  const handleToggleVisibility = (calendar: Calendar) => {
    toggleVisibility.mutate({
      id: calendar.id,
      eventId,
      isVisible: !calendar.is_visible,
    })
  }

  const handleDeleteCalendar = (calendar: Calendar) => {
    deleteCalendar.mutate({
      id: calendar.id,
      eventId,
    })
  }

  return (
    <Sidebar collapsible="none" className="border-r bg-background w-64">
      <SidebarContent>
        {/* Date Picker */}
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <CalendarComponent
              mode="single"
              selected={calendarDate}
              onSelect={handleDateSelect}
              modifiers={{ hasEvent: eventDayModifier }}
              modifiersClassNames={{ hasEvent: 'has-event' }}
              className="bg-background [&_[role=gridcell].bg-accent]:bg-primary [&_[role=gridcell].bg-accent]:text-primary-foreground [&_[role=gridcell]]:w-[33px] [&_.has-event]:relative [&_.has-event]:after:absolute [&_.has-event]:after:bottom-1 [&_.has-event]:after:left-1/2 [&_.has-event]:after:-translate-x-1/2 [&_.has-event]:after:w-1 [&_.has-event]:after:h-1 [&_.has-event]:after:rounded-full [&_.has-event]:after:bg-primary"
            />
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarSeparator className="mx-0" />

        {/* Calendars Section */}
        <SidebarGroup className="py-0">
          <Collapsible defaultOpen className="group/collapsible">
            <div className="flex items-center">
              <SidebarGroupLabel
                asChild
                className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex-1 text-sm"
              >
                <CollapsibleTrigger>
                  Calendars
                  <CaretRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 mr-2 text-muted-foreground hover:text-foreground"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <CollapsibleContent>
              <SidebarGroupContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : calendars.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No calendars yet
                  </p>
                ) : (
                  <SidebarMenu>
                    {calendars.map((calendar) => (
                      <CalendarMenuItem
                        key={calendar.id}
                        calendar={calendar}
                        eventId={eventId}
                        onToggleVisibility={handleToggleVisibility}
                        onDelete={handleDeleteCalendar}
                      />
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarSeparator className="mx-0" />
      </SidebarContent>

      {/* Create Calendar Dialog */}
      <CalendarFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Create Calendar"
        description="Create a new calendar to organize your events"
        name={newCalendarName}
        onNameChange={setNewCalendarName}
        color={selectedColor}
        onColorChange={setSelectedColor}
        onSubmit={handleCreateCalendar}
        submitLabel="Create"
        isPending={createCalendar.isPending}
      />
    </Sidebar>
  )
}

interface CalendarMenuItemProps {
  calendar: Calendar
  eventId: string
  onToggleVisibility: (calendar: Calendar) => void
  onDelete: (calendar: Calendar) => void
}

function CalendarMenuItem({ calendar, eventId, onToggleVisibility, onDelete }: CalendarMenuItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState(calendar.name)
  const [editColor, setEditColor] = useState(calendar.color)
  const updateCalendar = useUpdateCalendar()

  const handleSaveEdit = () => {
    if (!editName.trim()) return
    
    updateCalendar.mutate({
      id: calendar.id,
      eventId,
      name: editName.trim(),
      color: editColor,
    }, {
      onSuccess: () => {
        setEditDialogOpen(false)
      }
    })
  }

  const handleOpenEdit = () => {
    setEditName(calendar.name)
    setEditColor(calendar.color)
    setEditDialogOpen(true)
  }

  return (
    <>
      <SidebarMenuItem className="py-0">
        <div 
          className="group flex items-center gap-2 h-8 px-2 rounded-md hover:bg-sidebar-accent cursor-pointer"
          onClick={() => onToggleVisibility(calendar)}
        >
          <div
            className={cn(
              "size-2.5 shrink-0 rounded-full transition-opacity",
              !calendar.is_visible && "opacity-50"
            )}
            style={{ backgroundColor: calendar.color }}
          />
          <span className={cn("flex-1 truncate text-sm", !calendar.is_visible && "opacity-50")}>
            {calendar.name}
          </span>
          
          {calendar.is_default ? (
            <Lock className="size-3 text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenEdit()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    handleOpenEdit()
                  }
                }}
                title="Edit calendar"
                className="p-0.5 hover:bg-sidebar-accent rounded cursor-pointer"
              >
                <PencilSimple className="size-3.5 text-muted-foreground" />
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteDialogOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    setDeleteDialogOpen(true)
                  }
                }}
                title="Delete calendar"
                className="p-0.5 hover:bg-destructive/10 rounded transition-colors cursor-pointer"
              >
                <Trash className="size-3.5 text-muted-foreground hover:text-destructive" />
              </div>
            </div>
          )}
          
          {/* Visibility indicator */}
          {!calendar.is_visible && (
            <EyeSlash className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </SidebarMenuItem>
      
      {/* Edit Dialog */}
      <CalendarFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Edit Calendar"
        description="Update the calendar name and color."
        name={editName}
        onNameChange={setEditName}
        color={editColor}
        onColorChange={setEditColor}
        onSubmit={handleSaveEdit}
        submitLabel="Save"
        isPending={updateCalendar.isPending}
      />
      
      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calendar</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{calendar.name}"? This action cannot be undone.
              All events in this calendar will be moved to "Primary".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(calendar)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Unified Calendar Form Dialog Component
interface CalendarFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  name: string
  onNameChange: (name: string) => void
  color: string
  onColorChange: (color: string) => void
  onSubmit: () => void
  submitLabel: string
  isPending: boolean
}

function CalendarFormDialog({
  open,
  onOpenChange,
  title,
  description,
  name,
  onNameChange,
  color,
  onColorChange,
  onSubmit,
  submitLabel,
  isPending,
}: CalendarFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="calendar-name">Name</Label>
            <Input
              id="calendar-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g., Workshops, Talks, Social"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {CALENDAR_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onColorChange(c.value)}
                  className={cn(
                    'size-6 rounded-full transition-all',
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-primary'
                      : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!name.trim() || isPending}
          >
            {isPending ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
