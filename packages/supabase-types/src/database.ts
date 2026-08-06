/**
 * Hand-written Supabase Database type, scoped to the tables the app code
 * actually touches so far (still no live Supabase project to run
 * `supabase gen types` against — see docs/phase-1/11-implementation-checklist.md).
 * Once a live project exists, run `pnpm --filter @yume/supabase-types gen`
 * to replace this with a fully generated file covering every table in
 * supabase/migrations, instead of continuing to hand-extend it.
 *
 * `Relationships` arrays below must stay in sync with the foreign keys
 * declared in supabase/migrations — they're what let supabase-js type
 * nested `.select("foo(...)")` embeds.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RoomRole = "owner" | "moderator" | "member" | "guest";
export type PresenceStatus = "online" | "away" | "busy" | "studying" | "offline";
export type RoomObjectType =
  | "furniture"
  | "rug"
  | "plant"
  | "lamp"
  | "poster"
  | "frame"
  | "window"
  | "background"
  | "gif"
  | "sticker"
  | "image"
  | "text"
  | "sticky_note"
  | "embed"
  | "drawing"
  | "decorative";
export type MediaProvider = "youtube" | "spotify";
export type GameType = "draw_and_guess" | "trivia" | "tic_tac_toe" | "connect_four";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          custom_avatar: Json | null;
          status: PresenceStatus;
          is_guest: boolean;
          background_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          custom_avatar?: Json | null;
          status?: PresenceStatus;
          is_guest?: boolean;
          background_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      room_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_system_template: boolean;
          created_by: string | null;
          objects: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_system_template?: boolean;
          created_by?: string | null;
          objects?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["room_templates"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "room_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rooms: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          template_id: string | null;
          background_url: string | null;
          is_locked: boolean;
          capacity: number;
          audio_mode: "spatial" | "room_wide";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          template_id?: string | null;
          background_url?: string | null;
          is_locked?: boolean;
          capacity?: number;
          audio_mode?: "spatial" | "room_wide";
        };
        Update: Partial<Database["public"]["Tables"]["rooms"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "rooms_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rooms_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "room_templates";
            referencedColumns: ["id"];
          }
        ];
      };
      room_memberships: {
        Row: {
          id: string;
          room_id: string;
          profile_id: string;
          role: RoomRole;
          joined_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          profile_id: string;
          role?: RoomRole;
        };
        Update: Partial<Database["public"]["Tables"]["room_memberships"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "room_memberships_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_invites: {
        Row: {
          id: string;
          room_id: string;
          token: string;
          created_by: string;
          password_hash: string | null;
          requires_owner_approval: boolean;
          max_uses: number | null;
          use_count: number;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          token: string;
          created_by: string;
          password_hash?: string | null;
          requires_owner_approval?: boolean;
          max_uses?: number | null;
          expires_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["room_invites"]["Insert"] & {
            use_count: number;
            revoked_at: string | null;
          }
        >;
        Relationships: [
          {
            foreignKeyName: "room_invites_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      room_objects: {
        Row: {
          id: string;
          room_id: string;
          type: RoomObjectType;
          asset_url: string | null;
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          z_index: number;
          locked: boolean;
          owner_id: string | null;
          interaction_permissions: Json;
          data: Json | null;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          type: RoomObjectType;
          asset_url?: string | null;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          z_index?: number;
          locked?: boolean;
          owner_id?: string | null;
          interaction_permissions?: Json;
          data?: Json | null;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["room_objects"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "room_objects_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_objects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_versions: {
        Row: {
          id: string;
          room_id: string;
          snapshot: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          snapshot: Json;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["room_versions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "room_versions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      asset_licenses: {
        Row: {
          id: string;
          source_url: string;
          creator: string;
          license: string;
          downloaded_at: string;
          attribution_required: boolean;
          attribution_text: string | null;
          modification_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_url: string;
          creator: string;
          license: string;
          downloaded_at: string;
          attribution_required?: boolean;
          attribution_text?: string | null;
          modification_notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["asset_licenses"]["Insert"]>;
        Relationships: [];
      };
      room_assets: {
        Row: {
          id: string;
          name: string;
          category: string;
          asset_url: string;
          thumbnail_url: string | null;
          license_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          asset_url: string;
          thumbnail_url?: string | null;
          license_id?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["room_assets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "room_assets_license_id_fkey";
            columns: ["license_id"];
            isOneToOne: false;
            referencedRelation: "asset_licenses";
            referencedColumns: ["id"];
          }
        ];
      };
      room_notes: {
        Row: {
          id: string;
          room_id: string;
          type: string;
          content: Json;
          color: string | null;
          pinned: boolean;
          locked: boolean;
          edit_mode: string;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          type?: string;
          content?: Json;
          color?: string | null;
          pinned?: boolean;
          locked?: boolean;
          edit_mode?: string;
          owner_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["room_notes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "room_notes_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_notes_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_drawings: {
        Row: {
          id: string;
          room_id: string;
          layer_locked: boolean;
          strokes: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          layer_locked?: boolean;
          strokes?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["room_drawings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "room_drawings_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      room_messages: {
        Row: {
          id: string;
          room_id: string;
          author_id: string | null;
          body: string | null;
          image_url: string | null;
          reply_to_id: string | null;
          mentions: string[];
          deleted_at: string | null;
          deleted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          author_id?: string | null;
          body?: string | null;
          image_url?: string | null;
          reply_to_id?: string | null;
          mentions?: string[];
        };
        Update: Partial<
          Database["public"]["Tables"]["room_messages"]["Insert"] & {
            deleted_at: string | null;
            deleted_by: string | null;
          }
        >;
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_messages_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_messages_reply_to_id_fkey";
            columns: ["reply_to_id"];
            isOneToOne: false;
            referencedRelation: "room_messages";
            referencedColumns: ["id"];
          }
        ];
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          profile_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          profile_id: string;
          emoji: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_reactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "room_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_reactions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      media_sessions: {
        Row: {
          id: string;
          room_id: string;
          provider: MediaProvider;
          control_mode: string;
          current_item_id: string | null;
          playback_state: string;
          position_ms: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          provider: MediaProvider;
          control_mode?: string;
          current_item_id?: string | null;
          playback_state?: string;
          position_ms?: number;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["media_sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "media_sessions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      media_queue_items: {
        Row: {
          id: string;
          session_id: string;
          provider: MediaProvider;
          external_id: string;
          title: string | null;
          thumbnail_url: string | null;
          duration_ms: number | null;
          added_by: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          provider: MediaProvider;
          external_id: string;
          title?: string | null;
          thumbnail_url?: string | null;
          duration_ms?: number | null;
          added_by?: string | null;
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["media_queue_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "media_queue_items_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "media_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      spotify_connections: {
        Row: {
          id: string;
          profile_id: string;
          spotify_user_id: string;
          access_token: string;
          refresh_token: string;
          scope: string;
          expires_at: string;
          is_premium: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          spotify_user_id: string;
          access_token: string;
          refresh_token: string;
          scope: string;
          expires_at: string;
          is_premium?: boolean | null;
        };
        Update: Partial<Database["public"]["Tables"]["spotify_connections"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "spotify_connections_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      study_sessions: {
        Row: {
          id: string;
          room_id: string;
          work_minutes: number;
          break_minutes: number;
          status: string;
          started_at: string | null;
          ambient_audio_url: string | null;
          do_not_disturb: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          work_minutes?: number;
          break_minutes?: number;
          status?: string;
          started_at?: string | null;
          ambient_audio_url?: string | null;
          do_not_disturb?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["study_sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "study_sessions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      timers: {
        Row: {
          id: string;
          room_id: string;
          type: string;
          mode: string;
          owner_id: string | null;
          duration_seconds: number | null;
          target_at: string | null;
          status: string;
          started_at: string | null;
          alarm_sound: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          type: string;
          mode?: string;
          owner_id?: string | null;
          duration_seconds?: number | null;
          target_at?: string | null;
          status?: string;
          started_at?: string | null;
          alarm_sound?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["timers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "timers_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timers_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      study_focus_logs: {
        Row: {
          id: string;
          profile_id: string;
          room_id: string | null;
          minutes: number;
          completed_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          room_id?: string | null;
          minutes: number;
        };
        Update: Partial<Database["public"]["Tables"]["study_focus_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "study_focus_logs_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_focus_logs_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      game_sessions: {
        Row: {
          id: string;
          room_id: string;
          game_type: GameType;
          status: string;
          state: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          game_type: GameType;
          status?: string;
          state?: Json;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["game_sessions"]["Insert"] & { updated_at: string }
        >;
        Relationships: [
          {
            foreignKeyName: "game_sessions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      game_players: {
        Row: {
          id: string;
          session_id: string;
          profile_id: string;
          is_spectator: boolean;
          is_ready: boolean;
          score: number;
          connected: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          profile_id: string;
          is_spectator?: boolean;
          is_ready?: boolean;
          score?: number;
          connected?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["game_players"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "game_players_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_players_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      game_events: {
        Row: {
          id: string;
          session_id: string;
          profile_id: string | null;
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          profile_id?: string | null;
          event_type: string;
          payload?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["game_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "game_events_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      game_round_secrets: {
        Row: {
          session_id: string;
          secret: Json;
          updated_at: string;
        };
        Insert: {
          session_id: string;
          secret: Json;
        };
        Update: Partial<Database["public"]["Tables"]["game_round_secrets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "game_round_secrets_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "game_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      room_bans: {
        Row: {
          id: string;
          room_id: string;
          profile_id: string | null;
          banned_guest_fingerprint: string | null;
          banned_by: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          profile_id?: string | null;
          banned_guest_fingerprint?: string | null;
          banned_by: string;
          reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["room_bans"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "room_bans_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_bans_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_bans_banned_by_fkey";
            columns: ["banned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      reports: {
        Row: {
          id: string;
          room_id: string | null;
          reported_by: string;
          reported_profile_id: string | null;
          message_id: string | null;
          reason: string;
          details: string | null;
          status: ReportStatus;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          room_id?: string | null;
          reported_by: string;
          reported_profile_id?: string | null;
          message_id?: string | null;
          reason: string;
          details?: string | null;
          status?: ReportStatus;
        };
        Update: Partial<
          Database["public"]["Tables"]["reports"]["Insert"] & {
            status: ReportStatus;
            resolved_at: string | null;
            resolved_by: string | null;
          }
        >;
        Relationships: [
          {
            foreignKeyName: "reports_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_profile_id_fkey";
            columns: ["reported_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "room_messages";
            referencedColumns: ["id"];
          }
        ];
      };
      user_blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_blocks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          room_id: string | null;
          actor_id: string | null;
          action: string;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id?: string | null;
          actor_id?: string | null;
          action: string;
          target_id?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "audit_logs_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_target_id_fkey";
            columns: ["target_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: string;
          payload: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: string;
          payload?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"] & { read_at: string | null }>;
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      restore_room_version: {
        Args: { p_room_id: string; p_version_id: string };
        Returns: undefined;
      };
      append_drawing_stroke: {
        Args: { p_room_id: string; p_stroke: Json };
        Returns: undefined;
      };
      clear_drawing_layer: {
        Args: { p_room_id: string };
        Returns: undefined;
      };
      increment_game_score: {
        Args: { p_session_id: string; p_profile_id: string; p_delta: number };
        Returns: undefined;
      };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
  };
}
