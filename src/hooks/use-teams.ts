import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { 
  EventMember, 
  EventMemberInsert, 
  EventMemberUpdate,
  EventTeam,
  EventTeamInsert,
  EventTeamUpdate,
  TeamMember,
  TeamMemberInsert,
  EventInvite,
  EventInviteInsert,
} from '@/lib/database.types'

// ============================================
// Event Members Hooks
// ============================================

// Get current user's membership for an event
export function useCurrentMember(eventId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['current-member', eventId],
    queryFn: async () => {
      if (!eventId) return null
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('event_members')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      return data as EventMember
    },
    enabled: !!eventId,
  })
}

// Get all members for an event with user info
export function useEventMembers(eventId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['event-members', eventId],
    queryFn: async () => {
      if (!eventId) return []

      // First get all event members
      const { data: members, error: membersError } = await supabase
        .from('event_members')
        .select('*')
        .eq('event_id', eventId)
        .order('joined_at', { ascending: true })

      if (membersError) throw membersError

      // Get user details from organizers table (which has auth_user_id mapping)
      const userIds = members.map(m => m.user_id)
      const { data: organizers, error: orgError } = await supabase
        .from('organizers')
        .select('auth_user_id, email, display_name')
        .in('auth_user_id', userIds)

      if (orgError) throw orgError

      // Map organizer info to members
      const membersWithInfo = members.map(member => {
        const org = organizers?.find(o => o.auth_user_id === member.user_id)
        return {
          ...member,
          user_email: org?.email,
          user_name: org?.display_name || org?.email,
        }
      })

      return membersWithInfo
    },
    enabled: !!eventId,
  })
}

// Update member role
export function useUpdateMemberRole() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      memberId, 
      eventId, 
      role 
    }: { memberId: string; eventId: string; role: 'admin' | 'member' }) => {
      const { data, error } = await supabase
        .from('event_members')
        .update({ role } as never)
        .eq('id', memberId)
        .select()
        .single()

      if (error) throw error
      return { ...(data as EventMember), eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-members', data.eventId] })
    },
  })
}

// Remove member from event
export function useRemoveMember() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ memberId, eventId }: { memberId: string; eventId: string }) => {
      const { error } = await supabase
        .from('event_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      return { memberId, eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-members', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

// Leave event (current user)
export function useLeaveEvent() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('event_members')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      if (error) throw error
      return eventId
    },
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event-members', eventId] })
      queryClient.invalidateQueries({ queryKey: ['current-member', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

// ============================================
// Event Teams Hooks
// ============================================

// Get all teams for an event
export function useEventTeams(eventId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['event-teams', eventId],
    queryFn: async () => {
      if (!eventId) return []

      const { data, error } = await supabase
        .from('event_teams')
        .select(`
          *,
          team_members (
            id,
            member_id
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Add member count to each team
      return (data || []).map(team => ({
        ...team,
        member_count: team.team_members?.length || 0,
      })) as (EventTeam & { member_count: number; team_members: { id: string; member_id: string }[] })[]
    },
    enabled: !!eventId,
  })
}

// Get teams for current user only (for Member role visibility)
export function useMyTeams(eventId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['my-teams', eventId],
    queryFn: async () => {
      if (!eventId) return []

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Get current user's member record
      const { data: member } = await supabase
        .from('event_members')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single()

      if (!member) return []

      // Get teams that the user is assigned to
      const { data: teamAssignments } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('member_id', member.id)

      if (!teamAssignments || teamAssignments.length === 0) return []

      const teamIds = teamAssignments.map(ta => ta.team_id)

      const { data, error } = await supabase
        .from('event_teams')
        .select(`
          *,
          team_members (
            id,
            member_id
          )
        `)
        .in('id', teamIds)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      return (data || []).map(team => ({
        ...team,
        member_count: team.team_members?.length || 0,
      })) as (EventTeam & { member_count: number; team_members: { id: string; member_id: string }[] })[]
    },
    enabled: !!eventId,
  })
}

// Create team
export function useCreateTeam() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (team: EventTeamInsert) => {
      const { data, error } = await supabase
        .from('event_teams')
        .insert(team as never)
        .select()
        .single()

      if (error) throw error
      return data as EventTeam
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-teams', data.event_id] })
    },
  })
}

// Update team
export function useUpdateTeam() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      eventId, 
      ...updates 
    }: { id: string; eventId: string } & EventTeamUpdate) => {
      const { data, error } = await supabase
        .from('event_teams')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...(data as EventTeam), eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-teams', data.eventId] })
    },
  })
}

// Delete team
export function useDeleteTeam() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ teamId, eventId }: { teamId: string; eventId: string }) => {
      const { error } = await supabase
        .from('event_teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error
      return { teamId, eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-teams', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

// ============================================
// Team Members Hooks
// ============================================

// Get members of a specific team
export function useTeamMembers(teamId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!teamId) return []

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          event_member:event_members (
            id,
            user_id,
            role
          )
        `)
        .eq('team_id', teamId)
        .order('assigned_at', { ascending: true })

      if (error) throw error

      // Get user details for all members
      const memberUserIds = data?.map(tm => tm.event_member?.user_id).filter(Boolean) || []
      
      if (memberUserIds.length === 0) return []

      const { data: organizers } = await supabase
        .from('organizers')
        .select('auth_user_id, email, display_name')
        .in('auth_user_id', memberUserIds)

      // Combine data
      return (data || []).map(tm => {
        const org = organizers?.find(o => o.auth_user_id === tm.event_member?.user_id)
        return {
          ...tm,
          event_member: {
            ...tm.event_member,
            user_email: org?.email,
            user_name: org?.display_name || org?.email,
          },
        }
      })
    },
    enabled: !!teamId,
  })
}

// Assign members to team (batch operation)
export function useAssignMembers() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      teamId, 
      eventId,
      memberIds,
      currentMemberIds 
    }: { 
      teamId: string
      eventId: string
      memberIds: string[] // New set of member IDs to assign
      currentMemberIds: string[] // Current member IDs (for comparison)
    }) => {
      // Calculate additions and removals
      const toAdd = memberIds.filter(id => !currentMemberIds.includes(id))
      const toRemove = currentMemberIds.filter(id => !memberIds.includes(id))

      // Remove members no longer assigned
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', teamId)
          .in('member_id', toRemove)

        if (removeError) throw removeError
      }

      // Add new members
      if (toAdd.length > 0) {
        const insertData = toAdd.map(memberId => ({
          team_id: teamId,
          member_id: memberId,
        }))

        const { error: addError } = await supabase
          .from('team_members')
          .insert(insertData as never)

        if (addError) throw addError
      }

      return { teamId, eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', data.teamId] })
      queryClient.invalidateQueries({ queryKey: ['event-teams', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-teams', data.eventId] })
    },
  })
}

// Remove single member from team
export function useRemoveFromTeam() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      teamId, 
      memberId, 
      eventId 
    }: { teamId: string; memberId: string; eventId: string }) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('member_id', memberId)

      if (error) throw error
      return { teamId, memberId, eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', data.teamId] })
      queryClient.invalidateQueries({ queryKey: ['event-teams', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-teams', data.eventId] })
    },
  })
}

// ============================================
// Event Invites Hooks
// ============================================

// Get all invites for an event
export function useEventInvites(eventId: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['event-invites', eventId],
    queryFn: async () => {
      if (!eventId) return []

      const { data, error } = await supabase
        .from('event_invites')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as EventInvite[]
    },
    enabled: !!eventId,
  })
}

// Create email invite
export function useCreateEmailInvite() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ 
      eventId, 
      email 
    }: { eventId: string; email: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create invite record
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48) // 48 hour expiry

      const { data, error } = await supabase
        .from('event_invites')
        .insert({
          event_id: eventId,
          invite_type: 'email',
          email,
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
        } as never)
        .select()
        .single()

      if (error) throw error
      return data as EventInvite
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-invites', data.event_id] })
    },
  })
}

// Create link invite
export function useCreateLinkInvite() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create invite record
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48) // 48 hour expiry

      const { data, error } = await supabase
        .from('event_invites')
        .insert({
          event_id: eventId,
          invite_type: 'link',
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
        } as never)
        .select()
        .single()

      if (error) throw error
      return data as EventInvite
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-invites', data.event_id] })
    },
  })
}

// Revoke/delete invite
export function useRevokeInvite() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async ({ inviteId, eventId }: { inviteId: string; eventId: string }) => {
      const { error } = await supabase
        .from('event_invites')
        .delete()
        .eq('id', inviteId)

      if (error) throw error
      return { inviteId, eventId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-invites', data.eventId] })
    },
  })
}

// Validate invite token (for invite acceptance page)
export function useValidateInvite(token: string | null) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['validate-invite', token],
    queryFn: async () => {
      if (!token) return null

      const { data, error } = await supabase
        .from('event_invites')
        .select(`
          *,
          event:events (
            id,
            name,
            icon
          )
        `)
        .eq('token', token)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      
      // Check if expired or already used
      if (data.used_at || new Date(data.expires_at) < new Date()) {
        return { ...data, valid: false }
      }

      return { ...data, valid: true }
    },
    enabled: !!token,
  })
}

// Accept invite (adds user to event)
export function useAcceptInvite() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (token: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get invite
      const { data: invite, error: inviteError } = await supabase
        .from('event_invites')
        .select('*')
        .eq('token', token)
        .single()

      if (inviteError) throw inviteError
      if (!invite) throw new Error('Invite not found')
      if (invite.used_at) throw new Error('Invite already used')
      if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired')

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('event_members')
        .select('id')
        .eq('event_id', invite.event_id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        return { eventId: invite.event_id, alreadyMember: true }
      }

      // Add user as member
      const { error: memberError } = await supabase
        .from('event_members')
        .insert({
          event_id: invite.event_id,
          user_id: user.id,
          role: 'member',
        } as never)

      if (memberError) throw memberError

      // Mark invite as used
      await supabase
        .from('event_invites')
        .update({ used_at: new Date().toISOString() } as never)
        .eq('id', invite.id)

      return { eventId: invite.event_id, alreadyMember: false }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-members', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['current-member', data.eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
