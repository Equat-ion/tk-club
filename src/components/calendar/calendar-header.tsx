'use client'

import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useAppStore, type CalendarView } from '@/lib/store'
import { navigateDate, formatDateHeader } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'

const viewOptions: { value: CalendarView; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

export function CalendarHeader() {
  const calendarDate = useAppStore((state) => state.calendarDate)
  const calendarView = useAppStore((state) => state.calendarView)
  const setCalendarDate = useAppStore((state) => state.setCalendarDate)
  const setCalendarView = useAppStore((state) => state.setCalendarView)

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    setCalendarDate(navigateDate(calendarDate, calendarView, direction))
  }

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => handleNavigate('prev')}
          >
            <CaretLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate('today')}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => handleNavigate('next')}
          >
            <CaretRight className="size-4" />
          </Button>
        </div>
        <h2 className="text-sm font-semibold">
          {formatDateHeader(calendarDate, calendarView)}
        </h2>
      </div>

      <div className="flex items-center gap-1 rounded-none border p-1">
        {viewOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setCalendarView(option.value)}
            aria-label={`Switch to ${option.label} view`}
            aria-pressed={calendarView === option.value}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-none transition-colors',
              calendarView === option.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
