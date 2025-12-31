'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, CalendarSidebar } from '@/components/calendar'
import { useEvent } from '@/hooks/use-events'
import { useAppStore } from '@/lib/store'

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  
  const { data: event, isLoading, error } = useEvent(eventId)
  const setCurrentEventId = useAppStore((state) => state.setCurrentEventId)

  // Set current event on mount
  useEffect(() => {
    if (eventId) {
      setCurrentEventId(eventId)
    }
  }, [eventId, setCurrentEventId])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-semibold">Event not found</h2>
          <p className="text-sm text-muted-foreground">
            The event you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-primary hover:underline"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex" style={{ height: 'calc(100vh - 3rem)' }}>
      <CalendarSidebar eventId={eventId} />
      <Calendar eventId={eventId} />
    </div>
  )
}
