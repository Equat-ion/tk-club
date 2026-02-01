import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventInsert } from '@/lib/database.types'

// Get current user
export function useUser() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error) throw error
      return data
    },
  })
}

// Get all events for current organizer
export function useEvents() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Event[]
    },
  })
}

// Get single event
export function useEvent(eventId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (error) throw error
      return data as Event
    },
    enabled: !!eventId,
  })
}

// Create event
export function useCreateEvent() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (event: Omit<EventInsert, 'organizer_id'>) => {
      // Get user id first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      // Create user if it doesn't exist (fallback for users who signed up before callback was added)
      if (!currentUser) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email!,
          })
          .select('id')
          .single()
        
        if (createError) throw new Error(`Failed to create user: ${createError.message}`)
        currentUser = newUser
      }

      if (!currentUser) throw new Error('User not found and could not be created')

      const { data, error } = await supabase
        .from('events')
        .insert({ ...event, organizer_id: currentUser.id })
        .select()
        .single()

      if (error) throw new Error(`Failed to create event: ${error.message}`)
      
      // Note: Default calendar is automatically created by database trigger
      
      // If event has start_date and/or end_date, create a calendar event on the Primary calendar
      if (data && (event.start_date || event.end_date)) {
        // Wait a bit for the trigger to create the default calendar
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Get the Primary calendar for this event
        const { data: calendars } = await supabase
          .from('calendars')
          .select('id')
          .eq('event_id', data.id)
          .eq('is_default', true)
          .single()
        
        if (calendars) {
          // Create start and end times for the all-day event
          const startDate = event.start_date ? new Date(event.start_date) : new Date(event.end_date!)
          startDate.setHours(0, 0, 0, 0)
          
          const endDate = event.end_date ? new Date(event.end_date) : new Date(event.start_date!)
          endDate.setHours(23, 59, 59, 999)
          
          // Create the calendar event
          await supabase
            .from('calendar_events')
            .insert({
              event_id: data.id,
              calendar_id: calendars.id,
              title: event.name,
              start_time: startDate.toISOString(),
              end_time: endDate.toISOString(),
              is_all_day: true,
              description: `Event: ${event.name}`,
            })
        }
      }
      
      return data as Event
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['calendars', data.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events', data.id] })
    },
  })
}

// Update event
export function useUpdateEvent() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Event>) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Event
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', data.id] })
    },
  })
}

// Delete event
export function useDeleteEvent() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error
      return eventId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
