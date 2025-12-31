import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Event, EventInsert, Organizer } from '@/lib/database.types'

// Get current organizer
export function useOrganizer() {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['organizer'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error) throw error
      return data as Organizer
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
      // Get organizer id first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let { data: organizer } = await supabase
        .from('organizers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      // Create organizer if it doesn't exist (fallback for users who signed up before callback was added)
      if (!organizer) {
        const { data: newOrganizer, error: createError } = await supabase
          .from('organizers')
          .insert({
            auth_user_id: user.id,
            email: user.email!,
          })
          .select('id')
          .single()
        
        if (createError) throw new Error(`Failed to create organizer: ${createError.message}`)
        organizer = newOrganizer
      }

      if (!organizer) throw new Error('Organizer not found and could not be created')

      const { data, error } = await supabase
        .from('events')
        .insert({ ...event, organizer_id: organizer.id })
        .select()
        .single()

      if (error) throw new Error(`Failed to create event: ${error.message}`)
      
      // Note: Default calendar is automatically created by database trigger
      
      return data as Event
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['calendars', data.id] })
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
