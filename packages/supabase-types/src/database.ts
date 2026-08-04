/**
 * Hand-written Supabase Database type, scoped to the tables Phase 2 code
 * actually touches (profiles, room_templates, rooms, room_memberships,
 * room_invites, room_objects). Once a live Supabase project exists, run
 * `pnpm --filter @yume/supabase-types gen` to replace this with a fully
 * generated file covering every table in supabase/migrations — do that
 * before Phase 3 rather than hand-extending this further.
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
