/**
 * Tipos de la base de datos (forma compatible con supabase-js).
 *
 * Generado por introspección del esquema vivo el 2026-09-17
 * (columnas verificadas vía API + migraciones en supabase/migrations).
 * Regeneración oficial cuando haya token (requiere login humano):
 *   npx supabase login
 *   npx supabase gen types typescript --project-id ytwixmzrzcawtoxzjkeo > src/types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          apartment: string | null;
          phone: string | null;
          role: "resident" | "admin" | "security";
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
        Insert: {
          id: string;
          full_name?: string | null;
          apartment?: string | null;
          phone?: string | null;
          role?: "resident" | "admin" | "security";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          apartment?: string | null;
          phone?: string | null;
          role?: "resident" | "admin" | "security";
          created_at?: string;
          updated_at?: string;
        };
      };
      common_areas: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          capacity: number | null;
          rules: string | null;
          is_active: boolean;
          min_duration_hours: number;
          max_duration_hours: number;
          open_hour: string;
          close_hour: string;
          max_per_week: number;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          capacity?: number | null;
          rules?: string | null;
          is_active?: boolean;
          min_duration_hours?: number;
          max_duration_hours?: number;
          open_hour?: string;
          close_hour?: string;
          max_per_week?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          capacity?: number | null;
          rules?: string | null;
          is_active?: boolean;
          min_duration_hours?: number;
          max_duration_hours?: number;
          open_hour?: string;
          close_hour?: string;
          max_per_week?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      reservations: {
        Row: {
          id: string;
          user_id: string;
          common_area_id: string;
          start_time: string;
          end_time: string;
          status: "pending" | "approved" | "rejected" | "cancelled" | "no_show";
          admin_notes: string | null;
          checked_in_at: string | null;
          checked_out_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_common_area_id_fkey";
            columns: ["common_area_id"];
            isOneToOne: false;
            referencedRelation: "common_areas";
            referencedColumns: ["id"];
          },
        ];
        Insert: {
          id?: string;
          user_id: string;
          common_area_id: string;
          start_time: string;
          end_time: string;
          status?: "pending" | "approved" | "rejected" | "cancelled" | "no_show";
          admin_notes?: string | null;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          common_area_id?: string;
          start_time?: string;
          end_time?: string;
          status?: "pending" | "approved" | "rejected" | "cancelled" | "no_show";
          admin_notes?: string | null;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      availability_schedules: {
        Row: {
          id: string;
          common_area_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          max_duration_hours: number;
          created_at: string;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "availability_schedules_common_area_id_fkey";
            columns: ["common_area_id"];
            isOneToOne: false;
            referencedRelation: "common_areas";
            referencedColumns: ["id"];
          },
        ];
        Insert: {
          id?: string;
          common_area_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          max_duration_hours?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          common_area_id?: string;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
          max_duration_hours?: number;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string | null;
          type: "info" | "approved" | "rejected" | "reminder" | "checkin" | "cancelled";
          reservation_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body?: string | null;
          type?: "info" | "approved" | "rejected" | "reminder" | "checkin" | "cancelled";
          reservation_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string | null;
          type?: "info" | "approved" | "rejected" | "reminder" | "checkin" | "cancelled";
          reservation_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
      cleaning_tasks: {
        Row: {
          id: string;
          common_area_id: string | null;
          title: string;
          detail: string | null;
          status: "pending" | "done";
          created_by: string | null;
          scheduled_for: string | null;
          created_at: string;
          done_at: string | null;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_tasks_common_area_id_fkey";
            columns: ["common_area_id"];
            isOneToOne: false;
            referencedRelation: "common_areas";
            referencedColumns: ["id"];
          },
        ];
        Insert: {
          id?: string;
          common_area_id?: string | null;
          title: string;
          detail?: string | null;
          status?: "pending" | "done";
          created_by?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
          done_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          common_area_id?: string | null;
          title?: string;
          detail?: string | null;
          status?: "pending" | "done";
          created_by?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
          done_at?: string | null;
          updated_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          detail: string | null;
          created_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity?: string;
          entity_id?: string | null;
          detail?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          detail?: string | null;
          created_at?: string;
        };
      };
      app_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Relationships: [];
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
      };
      incidents: {
        Row: {
          id: string;
          user_id: string;
          common_area_id: string | null;
          title: string;
          description: string | null;
          photo_url: string | null;
          status: "open" | "in_progress" | "resolved";
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_common_area_id_fkey";
            columns: ["common_area_id"];
            isOneToOne: false;
            referencedRelation: "common_areas";
            referencedColumns: ["id"];
          },
        ];
        Insert: {
          id?: string;
          user_id: string;
          common_area_id?: string | null;
          title: string;
          description?: string | null;
          photo_url?: string | null;
          status?: "open" | "in_progress" | "resolved";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          common_area_id?: string | null;
          title?: string;
          description?: string | null;
          photo_url?: string | null;
          status?: "open" | "in_progress" | "resolved";
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
