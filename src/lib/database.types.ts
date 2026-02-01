export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          calendar_id: string | null
          created_at: string
          description: string | null
          end_time: string
          event_id: string
          id: string
          is_all_day: boolean
          location: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          event_id: string
          id?: string
          is_all_day?: boolean
          location?: string | null
          start_time?: string
          title: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          event_id?: string
          id?: string
          is_all_day?: boolean
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string
          created_at: string
          event_id: string
          id: string
          is_default: boolean | null
          is_visible: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          event_id: string
          id?: string
          is_default?: boolean | null
          is_visible?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          event_id?: string
          id?: string
          is_default?: boolean | null
          is_visible?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invites: {
        Row: {
          created_at: string
          email: string | null
          event_id: string
          expires_at: string
          id: string
          invite_type: string
          invited_by: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_id: string
          expires_at: string
          id?: string
          invite_type?: string
          invited_by?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          invite_type?: string
          invited_by?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          joined_at: string
          role: string
          updated_at: string
          userId: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          joined_at?: string
          role?: string
          userId: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id: string
          id?: string
          joined_at?: string
          role?: string
          userId?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_user_id_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_teams: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived: boolean
          assigneeId: string | null
          assignerId: string | null
          completedAt: string | null
          created_at: string
          description: string | null
          dueAt: string | null
          eventId: string
          id: string
          ownerId: string
          priority: string
          status: string
          teamId: string | null
          title: string
          updatedAt: string
          waitingReason: string | null
        }
        Insert: {
          archived?: boolean
          assigneeId?: string | null
          assignerId?: string | null
          completedAt?: string | null
          created_at?: string
          description?: string | null
          dueAt?: string | null
          eventId: string
          id?: string
          ownerId?: string
          priority?: string
          status?: string
          teamId?: string | null
          title: string
          updatedAt?: string
          waitingReason?: string | null
        }
        Update: {
          archived?: boolean
          assigneeId?: string | null
          assignerId?: string | null
          completedAt?: string | null
          created_at?: string
          description?: string | null
          dueAt?: string | null
          eventId: string
          id?: string
          ownerId?: string
          priority?: string
          status?: string
          teamId?: string | null
          title?: string
          updatedAt?: string
          waitingReason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assigneeId"]
            isOneToOne: false
            referencedRelation: "event_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigner_id_fkey"
            columns: ["assignerId"]
            isOneToOne: false
            referencedRelation: "event_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["ownerId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["eventId"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["teamId"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          assignedAt: string
          id: string
          memberId: string
          teamId: string
        }
        Insert: {
          assignedAt?: string
          id?: string
          memberId: string
          teamId: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_member_id_fkey"
            columns: ["memberId"]
            isOneToOne: false
            referencedRelation: "event_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["teamId"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          authUserId: string
          createdAt: timestamp
          displayName: string | null
          email: string
          id: string
          updatedAt: timestamp
        }
        Insert: {
          authUserId: string
          createdAt?: timestamp
          displayName?: string | null
          email?: string
          id?: string
          updatedAt?: timestamp
        }
        Update: {
          authUserId?: string
          createdAt?: timestamp
          displayName?: string | null
          email?: string
          id?: string
          updatedAt?: timestamp
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          createdAt: timestamp
          defaultCalendarView: string
          id: string
          organizerId: string
          themePreference: string
          updatedAt: timestamp
        }
        Insert: {
          createdAt?: timestamp
          defaultCalendarView?: string
          id?: string
          organizerId: string
          themePreference?: string
          updatedAt?: timestamp
        }
        Update: {
          createdAt?: timestamp
          defaultCalendarView?: string
          id?: string
          organizerId?: string
          themePreference?: string
          updatedAt?: timestamp
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_organizer_id_fkey"
            columns: ["organizerId"]
            isOneToOne: true
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      Views: {
        [_ in never]: never
      }
}
