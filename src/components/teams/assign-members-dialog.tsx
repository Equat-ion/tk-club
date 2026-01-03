'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlass, Crown, Shield, User } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEventMembers, useTeamMembers, useAssignMembers } from '@/hooks/use-teams'
import type { EventTeam } from '@/lib/database.types'

interface AssignMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: EventTeam
  eventId: string
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?'
  const parts = name.split(/[\s@]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':
      return <Crown className="size-3" weight="fill" />
    case 'admin':
      return <Shield className="size-3" weight="fill" />
    default:
      return <User className="size-3" />
  }
}

export function AssignMembersDialog({
  open,
  onOpenChange,
  team,
  eventId,
}: AssignMembersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  
  const { data: eventMembers, isLoading: loadingMembers } = useEventMembers(eventId)
  const { data: teamMembers, isLoading: loadingTeamMembers } = useTeamMembers(team.id)
  const assignMembers = useAssignMembers()

  // Initialize selected members when team members load
  useEffect(() => {
    if (teamMembers) {
      const memberIds = new Set(teamMembers.map(tm => tm.member_id))
      setSelectedMemberIds(memberIds)
    }
  }, [teamMembers])

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
    }
  }, [open])

  const currentMemberIds = teamMembers?.map(tm => tm.member_id) || []

  const filteredMembers = eventMembers?.filter(member => {
    const name = member.user_name || member.user_email || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const handleSave = async () => {
    try {
      await assignMembers.mutateAsync({
        teamId: team.id,
        eventId,
        memberIds: Array.from(selectedMemberIds),
        currentMemberIds,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to assign members:', error)
    }
  }

  const isLoading = loadingMembers || loadingTeamMembers

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members to {team.name}</DialogTitle>
          <DialogDescription>
            Select members to add to this team. Members can belong to multiple teams.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Member List */}
          <ScrollArea className="h-75 pr-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="size-4" />
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMembers && filteredMembers.length > 0 ? (
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-none hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMemberIds.has(member.id)}
                      onCheckedChange={() => handleToggleMember(member.id)}
                    />
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.user_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {member.user_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {member.user_email}
                      </div>
                    </div>
                    <Badge variant="outline" className="gap-1 text-xs">
                      {getRoleIcon(member.role)}
                      {member.role}
                    </Badge>
                  </label>
                ))}
              </div>
            ) : eventMembers && eventMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No members to add.</p>
                <p className="text-sm mt-1">Invite members to the event first.</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No members found matching &quot;{searchQuery}&quot;.</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={assignMembers.isPending}>
            {assignMembers.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
