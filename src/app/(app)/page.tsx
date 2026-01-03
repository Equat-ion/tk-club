'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEvents } from '@/hooks/use-events'
import { useUserSettings } from '@/hooks/use-settings'
import { useAppStore } from '@/lib/store'
import { Plus, ArrowRight, Gear, SignOut } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateEventDialog } from '@/components/create-event-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import type { Event } from '@/lib/database.types'

export default function HomePage() {
  const router = useRouter()
  const { data: events, isLoading } = useEvents()
  const setCurrentEventId = useAppStore((state) => state.setCurrentEventId)
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Load user settings on mount
  useUserSettings()

  const handleEventSelect = (event: Event) => {
    setCurrentEventId(event.id)
    router.push(`/events/${event.id}`)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const formatEventDates = (event: Event) => {
    if (!event.start_date && !event.end_date) return null
    if (event.start_date && event.end_date) {
      return `${format(new Date(event.start_date), 'MMM d')} - ${format(new Date(event.end_date), 'MMM d, yyyy')}`
    }
    if (event.start_date) {
      return `Starts ${format(new Date(event.start_date), 'MMM d, yyyy')}`
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Event Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Gear className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <SignOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Events</h1>
            <p className="text-muted-foreground">Select an event to manage or create a new one</p>
          </div>
          <Button onClick={() => setCreateEventOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Create Event
          </Button>
        </div>

        {!events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-none border border-dashed py-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-3xl">
              🎉
            </div>
            <h2 className="mt-4 text-xl font-semibold">No events yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first event to start scheduling calendar entries.
            </p>
            <Button onClick={() => setCreateEventOpen(true)} className="mt-4 gap-2">
              <Plus className="size-4" />
              Create Event
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="group cursor-pointer transition-colors hover:bg-muted/50 rounded-none"
                onClick={() => handleEventSelect(event)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-none border bg-muted text-xl">
                        {event.icon || '🎉'}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        {formatEventDates(event) && (
                          <CardDescription>{formatEventDates(event)}</CardDescription>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateEventDialog open={createEventOpen} onOpenChange={setCreateEventOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
