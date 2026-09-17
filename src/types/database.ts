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
