import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { UserSettings } from '@/lib/database.types'
import { useAppStore, type ThemePreference, type CalendarView } from '@/lib/store'

export function useUserSettings() {
  const supabase = createClient()
  const setThemePreference = useAppStore((state) => state.setThemePreference)
  const setCalendarView = useAppStore((state) => state.setCalendarView)
  
  return useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: organizer } = await supabase
        .from('organizers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!organizer) return null

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('organizer_id', organizer.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      
      // Sync with Zustand store
      if (data) {
        setThemePreference(data.theme_preference as ThemePreference)
        setCalendarView(data.default_calendar_view as CalendarView)
      }
      
      return data as UserSettings | null
    },
  })
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const setThemePreference = useAppStore((state) => state.setThemePreference)
  const setCalendarView = useAppStore((state) => state.setCalendarView)
  
  return useMutation({
    mutationFn: async (updates: { 
      theme_preference?: ThemePreference
      default_calendar_view?: CalendarView 
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: organizer } = await supabase
        .from('organizers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!organizer) throw new Error('Organizer not found')

      // Upsert settings
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(
          { organizer_id: organizer.id, ...updates },
          { onConflict: 'organizer_id' }
        )
        .select()
        .single()

      if (error) throw error
      return data as UserSettings
    },
    onSuccess: (data) => {
      // Update Zustand store
      if (data.theme_preference) {
        setThemePreference(data.theme_preference as ThemePreference)
      }
      if (data.default_calendar_view) {
        setCalendarView(data.default_calendar_view as CalendarView)
      }
      queryClient.invalidateQueries({ queryKey: ['user-settings'] })
    },
  })
}
