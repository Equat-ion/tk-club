'use client'

import * as React from 'react'
import { useState } from 'react'
import { Plus, Eye, EyeSlash, Trash, Lock, CaretRight } from '@phosphor-icons/react'
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
  DialogTrigger,
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
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { useAppStore } from '@/lib/store'
import { useCalendars, useCreateCalendar, useToggleCalendarVisibility, useDeleteCalendar, CALENDAR_COLORS } from '@/hooks/use-calendars'
import { cn } from '@/lib/utils'
import type { Calendar } from '@/lib/database.types'

interface CalendarSidebarProps {
  eventId: string
}

export function CalendarSidebar({ eventId }: CalendarSidebarProps) {
  const calendarDate = useAppStore((state) => state.calendarDate)
  const setCalendarDate = useAppStore((state) => state.setCalendarDate)
  
  const { data: calendars = [], isLoading } = useCalendars(eventId)
  const createCalendar = useCreateCalendar()
  const toggleVisibility = useToggleCalendarVisibility()
  const deleteCalendar = useDeleteCalendar()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newCalendarName, setNewCalendarName] = useState('')
  const [selectedColor, setSelectedColor] = useState(CALENDAR_COLORS[0].value)

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
    <Sidebar collapsible="none" className="border-r">
      <SidebarContent>
        {/* Date Picker */}
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <CalendarComponent
              mode="single"
              selected={calendarDate}
              onSelect={handleDateSelect}
              className="[&_[role=gridcell].bg-accent]:bg-sidebar-primary [&_[role=gridcell].bg-accent]:text-sidebar-primary-foreground [&_[role=gridcell]]:w-[33px]"
            />
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarSeparator className="mx-0" />

        {/* Calendars Section */}
        <SidebarGroup className="py-0">
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroupLabel
              asChild
              className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-sm"
            >
              <CollapsibleTrigger>
                Calendars
                <CaretRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <SidebarMenuButton>
                  <Plus />
                  <span>New Calendar</span>
                </SidebarMenuButton>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Calendar</DialogTitle>
                  <DialogDescription>
                    Create a new calendar to organize your events
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="calendar-name">Name</Label>
                    <Input
                      id="calendar-name"
                      value={newCalendarName}
                      onChange={(e) => setNewCalendarName(e.target.value)}
                      placeholder="e.g., Workshops, Talks, Social"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {CALENDAR_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSelectedColor(color.value)}
                          className={cn(
                            'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                            selectedColor === color.value
                              ? 'border-foreground scale-110'
                              : 'border-transparent'
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCalendar}
                    disabled={!newCalendarName.trim() || createCalendar.isPending}
                  >
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

interface CalendarMenuItemProps {
  calendar: Calendar
  onToggleVisibility: (calendar: Calendar) => void
  onDelete: (calendar: Calendar) => void
}

function CalendarMenuItem({ calendar, onToggleVisibility, onDelete }: CalendarMenuItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  return (
    <>
      <SidebarMenuItem>
        <div className="group flex items-center gap-2 px-2 py-1.5">
          <SidebarMenuButton className="flex-1">
            <div
              className={cn(
                "size-3 rounded-sm shrink-0 transition-opacity",
                !calendar.is_visible && "opacity-50"
              )}
              style={{ backgroundColor: calendar.color }}
            />
            <span className={cn(!calendar.is_visible && "opacity-50")}>
              {calendar.name}
            </span>
            {calendar.is_default && (
              <Lock className="size-3 text-muted-foreground ml-auto" />
            )}
          </SidebarMenuButton>
          
          {!calendar.is_default && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleVisibility(calendar)
                }}
                title={calendar.is_visible ? 'Hide calendar' : 'Show calendar'}
                className="p-1 hover:bg-sidebar-accent rounded"
              >
                {calendar.is_visible ? (
                  <Eye className="size-4 text-muted-foreground" />
                ) : (
                  <EyeSlash className="size-4 text-muted-foreground" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteDialogOpen(true)
                }}
                title="Delete calendar"
                className="p-1 hover:bg-destructive/10 rounded transition-colors"
              >
                <Trash className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          )}
        </div>
      </SidebarMenuItem>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calendar</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{calendar.name}"? This action cannot be undone.
              All events in this calendar will be moved to "No calendar".
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
