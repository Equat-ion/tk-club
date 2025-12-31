'use client'

import { cn } from '@/lib/utils'
import { formatTime, parseCalendarEventTime } from '@/lib/calendar-utils'
import type { CalendarEvent } from '@/lib/database.types'

interface CalendarEntryProps {
  event: CalendarEvent
  style: { 
    top: number
    height: number
    left?: string
    width?: string
  }
  color?: string
  onClick: () => void
  onDragStart?: (e: React.MouseEvent) => void
  onResizeStart?: (e: React.MouseEvent, edge: 'top' | 'bottom') => void
  isDragging?: boolean
  isResizing?: boolean
}

export function CalendarEntry({ 
  event, 
  style, 
  color,
  onClick, 
  onDragStart,
  onResizeStart,
  isDragging,
  isResizing,
}: CalendarEntryProps) {
  const startTime = parseCalendarEventTime(event.start_time)
  const endTime = parseCalendarEventTime(event.end_time)

  // Use custom color or default to primary
  const bgColor = color ? `${color}20` : undefined // 20 is hex for ~12% opacity
  const borderColor = color ? `${color}40` : undefined
  const textColor = color || undefined

  return (
    <div
      className={cn(
        'absolute overflow-hidden rounded-sm border text-left transition-all group',
        'cursor-pointer select-none',
        !color && 'border-primary/20 bg-primary/10 hover:bg-primary/20',
        color && 'hover:brightness-110',
        (isDragging || isResizing) && 'opacity-70 shadow-lg z-50 ring-2 ring-primary'
      )}
      style={{
        top: `${style.top}px`,
        height: `${style.height}px`,
        left: style.left ?? '2px',
        width: style.width ?? 'calc(100% - 4px)',
        minHeight: '20px',
        backgroundColor: bgColor,
        borderColor: borderColor,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onMouseDown={(e) => {
        // Only trigger drag if not clicking on resize handles
        const target = e.target as HTMLElement
        if (!target.dataset.resize && onDragStart) {
          onDragStart(e)
        }
      }}
    >
      {/* Top resize handle */}
      {onResizeStart && (
        <div
          data-resize="top"
          className="absolute top-0 left-0 right-0 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30 transition-opacity"
          onMouseDown={(e) => {
            e.stopPropagation()
            onResizeStart(e, 'top')
          }}
        />
      )}

      {/* Event content */}
      <div className="px-1.5 py-0.5 h-full">
        <div 
          className={cn(
            'text-xs font-medium truncate',
            !color && 'text-primary'
          )}
          style={{ color: textColor }}
        >
          {event.title}
        </div>
        {style.height >= 32 && (
          <div className="text-[10px] text-muted-foreground truncate">
            {formatTime(startTime)} - {formatTime(endTime)}
          </div>
        )}
        {style.height >= 48 && event.location && (
          <div className="text-[10px] text-muted-foreground truncate">
            {event.location}
          </div>
        )}
      </div>

      {/* Bottom resize handle */}
      {onResizeStart && (
        <div
          data-resize="bottom"
          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30 transition-opacity"
          onMouseDown={(e) => {
            e.stopPropagation()
            onResizeStart(e, 'bottom')
          }}
        />
      )}
    </div>
  )
}
