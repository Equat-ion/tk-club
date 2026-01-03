'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateTeam } from '@/hooks/use-teams'
import type { EventTeam } from '@/lib/database.types'

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onCreated: (team: EventTeam) => void
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  eventId,
  onCreated,
}: CreateTeamDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createTeam = useCreateTeam()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    try {
      const team = await createTeam.mutateAsync({
        event_id: eventId,
        name: name.trim(),
        description: description.trim() || null,
      })
      
      // Reset form
      setName('')
      setDescription('')
      
      onCreated(team)
    } catch (error) {
      console.error('Failed to create team:', error)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('')
      setDescription('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a team to organize event members into groups.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="e.g., Logistics, Marketing, Volunteers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description (optional)</Label>
              <Textarea
                id="team-description"
                placeholder="What is this team responsible for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createTeam.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createTeam.isPending}>
              {createTeam.isPending ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
