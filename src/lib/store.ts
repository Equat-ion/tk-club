import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CalendarView = 'week' | 'month'
export type ThemePreference = 'light' | 'dark' | 'system'

interface AppState {
  // Current event context
  currentEventId: string | null
  setCurrentEventId: (id: string | null) => void

  // Calendar state
  calendarView: CalendarView
  setCalendarView: (view: CalendarView) => void
  calendarDate: Date
  setCalendarDate: (date: Date) => void

  // Sidebar state
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void

  // Theme (persisted)
  themePreference: ThemePreference
  setThemePreference: (theme: ThemePreference) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Current event context
      currentEventId: null,
      setCurrentEventId: (id) => set({ currentEventId: id }),

      // Calendar state
      calendarView: 'week',
      setCalendarView: (view) => set({ calendarView: view }),
      calendarDate: new Date(),
      setCalendarDate: (date) => set({ calendarDate: date }),

      // Sidebar state
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Theme
      themePreference: 'system',
      setThemePreference: (theme) => set({ themePreference: theme }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        themePreference: state.themePreference,
        calendarView: state.calendarView,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
