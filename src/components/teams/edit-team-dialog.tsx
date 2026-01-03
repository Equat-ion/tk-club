'use client'

import { useState, useEffect } from 'react'
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
import { useUpdateTeam } from '@/hooks/use-teams'
import type { EventTeam } from '@/lib/database.types'

interface EditTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: EventTeam
  eventId: string
  onUpdated: (team: EventTeam) => void
}

export function EditTeamDialog({
  open,
  onOpenChange,
  team,
  eventId,
  onUpdated,
}: EditTeamDialogProps) {
  const [name, setName] = useState(team.name)
  const [description, setDescription] = useState(team.description || '')
  const updateTeam = useUpdateTeam()

  // Reset form when team changes
  useEffect(() => {
    setName(team.name)
    setDescription(team.description || '')
  }, [team])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    try {
      const updated = await updateTeam.mutateAsync({
        id: team.id,
        eventId,
        name: name.trim(),
        description: description.trim() || null,
      })
      
      onUpdated(updated)
    } catch (error) {
      console.error('Failed to update team:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update the team name and description.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                placeholder="e.g., Logistics, Marketing, Volunteers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-team-description">Description (optional)</Label>
              <Textarea
                id="edit-team-description"
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
              onClick={() => onOpenChange(false)}
              disabled={updateTeam.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || updateTeam.isPending}>
              {updateTeam.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
