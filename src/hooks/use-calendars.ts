import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Calendar, CalendarInsert, CalendarUpdate } from '@/lib/database.types'

// Get all calendars for a specific event
export function useCalendars(eventId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['calendars', eventId],
    queryFn: async () => {
      if (!eventId) return []
      
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('event_id', eventId)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error
      return data as Calendar[]
    },
    enabled: !!eventId,
  })
}

// Create calendar
export function useCreateCalendar() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (calendar: CalendarInsert) => {
      const { data, error } = await supabase
        .from('calendars')
        .insert(calendar as never)
        .select()
        .single()

      if (error) throw error
      return data as Calendar
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendars', data.event_id] })
    },
  })
}

// Update calendar
export function useUpdateCalendar() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      eventId, 
      ...updates 
    }: { id: string; eventId: string } & CalendarUpdate) => {
      const { data, error } = await supabase
        .from('calendars')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...(data as Calendar), eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendars', data.eventId] })
      // Also invalidate calendar events if visibility changed
      queryClient.invalidateQueries({ queryKey: ['calendar-events', data.eventId] })
    },
  })
}

// Delete calendar
export function useDeleteCalendar() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      const { error } = await supabase
        .from('calendars')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendars', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events', data.eventId] })
    },
  })
}

// Toggle calendar visibility
export function useToggleCalendarVisibility() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      eventId, 
      isVisible 
    }: { id: string; eventId: string; isVisible: boolean }) => {
      const { data, error } = await supabase
        .from('calendars')
        .update({ is_visible: isVisible } as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...(data as Calendar), eventId }
    },
    onMutate: async ({ id, eventId, isVisible }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['calendars', eventId] })

      // Snapshot the previous value
      const previousCalendars = queryClient.getQueryData<Calendar[]>(['calendars', eventId])

      // Optimistically update
      if (previousCalendars) {
        queryClient.setQueryData<Calendar[]>(
          ['calendars', eventId],
          previousCalendars.map((cal) =>
            cal.id === id ? { ...cal, is_visible: isVisible } : cal
          )
        )
      }

      return { previousCalendars }
    },
    onError: (_err, { eventId }, context) => {
      // Rollback on error
      if (context?.previousCalendars) {
        queryClient.setQueryData(['calendars', eventId], context.previousCalendars)
      }
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['calendars', data.eventId] })
      }
    },
  })
}

// Default calendar colors for users to choose from
// Note: Orange (#f97316) is reserved for the Primary calendar
export const CALENDAR_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Gray', value: '#6b7280' },
]
