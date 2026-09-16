"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Refresca la ruta cuando cambian reservas/áreas/horarios
 * (diferenciador IDEA: realtime sin polling). Solo revalida el
 * Server Component actual; no trae datos al cliente.
 */
export function useRealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () =>
        router.refresh()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "common_areas" }, () =>
        router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability_schedules" },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);
}
