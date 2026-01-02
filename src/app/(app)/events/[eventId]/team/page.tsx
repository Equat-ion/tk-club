'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { 
  Plus, 
  MagnifyingGlass, 
  Users, 
  X,
  PencilSimple,
  Trash,
  Crown,
  Shield,
  User,
  UserPlus
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  useEventTeams, 
  useMyTeams,
  useTeamMembers,
  useCurrentMember,
  useDeleteTeam,
  useRemoveFromTeam,
} from '@/hooks/use-teams'
import { useEvent, useOrganizer } from '@/hooks/use-events'
import { CreateTeamDialog } from '@/components/teams/create-team-dialog'
import { EditTeamDialog } from '@/components/teams/edit-team-dialog'
import { AssignMembersDialog } from '@/components/teams/assign-members-dialog'
import { InviteMemberDialog } from '@/components/teams/invite-member-dialog'
import type { EventTeam } from '@/lib/database.types'
import AppShell from '@/components/app-shell'

import { SidebarInset } from "@/components/ui/sidebar"

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':
      return (
        <Badge variant="default" className="gap-1">
          <Crown className="size-3" weight="fill" />
          Owner
        </Badge>
      )
    case 'admin':
      return (
        <Badge variant="secondary" className="gap-1">
          <Shield className="size-3" weight="fill" />
          Admin
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <User className="size-3" />
          Member
        </Badge>
      )
  }
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?'
  const parts = name.split(/[\s@]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function TeamList({
  teams,
  isLoading,
  searchQuery,
  selectedTeamId,
  onSelectTeam,
  onSearchChange,
  canManage,
  onCreateTeam,
  onInviteMember,
}: {
  teams: (EventTeam & { member_count: number })[] | undefined
  isLoading: boolean
  searchQuery: string
  selectedTeamId: string | null
  onSelectTeam: (team: EventTeam | null) => void
  onSearchChange: (query: string) => void
  canManage: boolean
  onCreateTeam: () => void
  onInviteMember: () => void
}) {
  const filteredTeams = teams?.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-80 shrink-0 border-r flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button onClick={onCreateTeam} variant="outline" size="sm" className="flex-1 gap-1">
              <Plus className="size-4" />
              New Team
            </Button>
            <Button onClick={onInviteMember} size="sm" className="flex-1 gap-1">
              <UserPlus className="size-4" />
              Invite
            </Button>
          </div>
        )}
      </div>

      {/* Team List */}
      <ScrollArea className="flex-1">
        <div className="p-1.5">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-lg">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : filteredTeams && filteredTeams.length > 0 ? (
            <div className="space-y-1">
              {filteredTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => onSelectTeam(team)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedTeamId === team.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium truncate">{team.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Users className="size-3" />
                    {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="p-4 text-center text-muted-foreground">
              <p>No teams found matching &quot;{searchQuery}&quot;.</p>
              <Button
                variant="link"
                onClick={() => onSearchChange('')}
                className="mt-1"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <Users className="size-12 mx-auto mb-3 opacity-50" />
              <p>No teams yet.</p>
              {canManage && (
                <p className="text-sm mt-1">Create your first team to organize members.</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function TeamDetails({
  team,
  eventId,
  canManage,
  onEdit,
  onDelete,
  onAssignMembers,
}: {
  team: EventTeam | null
  eventId: string
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
  onAssignMembers: () => void
}) {
  const { data: teamMembers, isLoading: loadingMembers } = useTeamMembers(team?.id || null)
  const removeFromTeam = useRemoveFromTeam()
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; memberId: string; name: string } | null>(null)

  const handleRemoveMember = async () => {
    if (!memberToRemove || !team) return
    
    try {
      await removeFromTeam.mutateAsync({
        teamId: team.id,
        memberId: memberToRemove.memberId,
        eventId,
      })
    } finally {
      setMemberToRemove(null)
    }
  }

  if (!team) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Users className="size-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Select a team to view details</p>
          <p className="text-sm mt-1">Choose a team from the list to see its members</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Team Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{team.name}</h2>
            {team.description && (
              <p className="text-muted-foreground text-sm mt-1">{team.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {teamMembers?.length || 0} member{(teamMembers?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <PencilSimple className="size-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
                <Trash className="size-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h3 className="font-medium text-sm">Team Members</h3>
          {canManage && (
            <Button variant="outline" size="sm" onClick={onAssignMembers}>
              <UserPlus className="size-4 mr-1" />
              Add Members
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 px-4">
          {loadingMembers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : teamMembers && teamMembers.length > 0 ? (
            <div className="space-y-1.5 pb-4">
              {teamMembers.map((tm) => (
                <div
                  key={tm.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(tm.event_member?.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {tm.event_member?.user_name || 'Unknown'}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {tm.event_member?.user_email}
                    </div>
                  </div>
                  {getRoleBadge(tm.event_member?.role || 'member')}
                  {canManage && tm.event_member?.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setMemberToRemove({
                        id: tm.id,
                        memberId: tm.member_id,
                        name: tm.event_member?.user_name || 'this member',
                      })}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="size-12 mx-auto mb-3 opacity-50" />
              <p>No members assigned yet.</p>
              {canManage && (
                <Button variant="link" onClick={onAssignMembers} className="mt-1">
                  Add members to this team
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {memberToRemove?.name} from {team.name}? They will remain in the event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function TeamPage() {
  const params = useParams()
  const eventId = params.eventId as string

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<EventTeam | null>(null)
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [editTeamOpen, setEditTeamOpen] = useState(false)
  const [assignMembersOpen, setAssignMembersOpen] = useState(false)
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<EventTeam | null>(null)

  // Data
  const { data: currentMember, isLoading: loadingCurrentMember } = useCurrentMember(eventId)
  const { data: event, isLoading: loadingEvent } = useEvent(eventId)
  const { data: organizer, isLoading: loadingOrganizer } = useOrganizer()
  
  // Check if user can manage: either has owner/admin role in event_members, 
  // OR is the event organizer (fallback for cases where trigger didn't fire)
  const isEventOrganizer = event && organizer && event.organizer_id === organizer.id
  const canManage = !!(currentMember?.role === 'owner' || currentMember?.role === 'admin' || isEventOrganizer)
  
  // Use different team queries based on role
  const { data: allTeams, isLoading: loadingAllTeams } = useEventTeams(canManage ? eventId : null)
  const { data: myTeams, isLoading: loadingMyTeams } = useMyTeams(!canManage ? eventId : null)
  
  const teams = canManage ? allTeams : myTeams
  const isLoadingTeams = canManage ? loadingAllTeams : loadingMyTeams

  const deleteTeam = useDeleteTeam()

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return
    
    try {
      await deleteTeam.mutateAsync({
        teamId: teamToDelete.id,
        eventId,
      })
      if (selectedTeam?.id === teamToDelete.id) {
        setSelectedTeam(null)
      }
    } finally {
      setTeamToDelete(null)
    }
  }

  if (loadingCurrentMember || loadingEvent || loadingOrganizer) {
    return (
      <AppShell>
        <SidebarInset>
        <div className="flex h-[calc(100vh-3rem)]">
          <div className="w-80 shrink-0 border-r overflow-hidden p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2 mt-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        </SidebarInset>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <SidebarInset>
      <div className="flex h-[calc(100vh-3rem)]">
        <TeamList
          teams={teams}
          isLoading={isLoadingTeams}
          searchQuery={searchQuery}
          selectedTeamId={selectedTeam?.id || null}
          onSelectTeam={setSelectedTeam}
          onSearchChange={setSearchQuery}
          canManage={canManage}
          onCreateTeam={() => setCreateTeamOpen(true)}
          onInviteMember={() => setInviteMemberOpen(true)}
        />
        <TeamDetails
          team={selectedTeam}
          eventId={eventId}
          canManage={canManage}
          onEdit={() => setEditTeamOpen(true)}
          onDelete={() => setTeamToDelete(selectedTeam)}
          onAssignMembers={() => setAssignMembersOpen(true)}
        />
      </div>
      </SidebarInset>

      {/* Dialogs */}
      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
        eventId={eventId}
        onCreated={(team: EventTeam) => {
          setSelectedTeam(team)
          setCreateTeamOpen(false)
        }}
      />

      {selectedTeam && (
        <>
          <EditTeamDialog
            open={editTeamOpen}
            onOpenChange={setEditTeamOpen}
            team={selectedTeam}
            eventId={eventId}
            onUpdated={(team: EventTeam) => {
              setSelectedTeam(team)
              setEditTeamOpen(false)
            }}
          />

          <AssignMembersDialog
            open={assignMembersOpen}
            onOpenChange={setAssignMembersOpen}
            team={selectedTeam}
            eventId={eventId}
          />
        </>
      )}

      <InviteMemberDialog
        open={inviteMemberOpen}
        onOpenChange={setInviteMemberOpen}
        eventId={eventId}
      />

      {/* Delete Team Confirmation */}
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{teamToDelete?.name}&quot;? Members will remain in the event but will be removed from this team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </AppShell>
  )
}
