'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfToday, isBefore } from 'date-fns'
import { CalendarBlank } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useCreateEvent } from '@/hooks/use-events'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EMOJI_OPTIONS = [
  '🎉', '🎊', '🎈', '🎯', '🏆', '⭐', '🌟', '✨',
  '🎭', '🎨', '🎬', '🎤', '🎵', '🎸', '🎹', '🎺',
  '📚', '📖', '✏️', '🎓', '💡', '🔬', '🔭', '💻',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🎱',
  '🚀', '🌈', '🔥', '💫', '🎪', '🏕️', '🎄', '🌸',
]

export function CreateEventDialog({ open, onOpenChange }: CreateEventDialogProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [icon, setIcon] = useState('🎉')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setCurrentEventId = useAppStore((state) => state.setCurrentEventId)
  
  const createEvent = useCreateEvent()

  const today = startOfToday()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (startDate && isBefore(startDate, today)) {
      setError('Start date must be today or in the future')
      return
    }

    if (startDate && endDate && isBefore(endDate, startDate)) {
      setError('End date must be after or equal to start date')
      return
    }
    
    try {
      const event = await createEvent.mutateAsync({
        name,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        icon,
      })
      
      setCurrentEventId(event.id)
      onOpenChange(false)
      resetForm()
      router.push(`/events/${event.id}`)
    } catch (err) {
      console.error('Failed to create event:', err)
      setError('Failed to create event. Please try again.')
    }
  }

  const resetForm = () => {
    setName('')
    setStartDate(undefined)
    setEndDate(undefined)
    setIcon('🎉')
    setError(null)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Create a new event to start scheduling calendar entries.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-none border border-destructive/20 p-3 text-sm">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">Event Name</Label>
              <div className="flex gap-2">
                <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-12 h-10 text-xl p-0"
                    >
                      {icon}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="p-1.5 text-lg hover:bg-muted rounded-none transition-colors"
                          onClick={() => {
                            setIcon(emoji)
                            setEmojiPickerOpen(false)
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Spring Festival 2025"
                  className="flex-1"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarBlank className="mr-2 size-4" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        setStartDateOpen(false)
                        // Reset end date if it's before new start date
                        if (date && endDate && isBefore(endDate, date)) {
                          setEndDate(undefined)
                        }
                      }}
                      disabled={(date) => isBefore(date, today)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarBlank className="mr-2 size-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date)
                        setEndDateOpen(false)
                      }}
                      disabled={(date) => {
                        // Must be today or future
                        if (isBefore(date, today)) return true
                        // Must be after or equal to start date if set
                        if (startDate && isBefore(date, startDate)) return true
                        return false
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending || !name.trim()}>
              {createEvent.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
