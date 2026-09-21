'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Notification = Database['public']['Tables']['notifications']['Row'];

const typeColor: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  reminder: 'bg-yellow-100 text-yellow-800',
  checkin: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

/**
 * Campanita in-app: lee las notificaciones propias por RLS
 * (sin API route) y se actualiza por realtime en INSERT.
 */
export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Carga inicial (patrón del repo: async dentro del efecto,
    // setState solo en la continuación, como DashboardLayout).
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setItems(data);
    };
    load();
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notificaciones</p>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3 w-3" /> Marcar leídas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin notificaciones todavía
            </p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href="/dashboard/reservations"
                onClick={() => setOpen(false)}
                className={`block border-b px-4 py-3 last:border-0 hover:bg-muted/50 ${n.read_at ? '' : 'bg-primary/5'}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeColor[n.type] || typeColor.info}`}
                  >
                    {n.type === 'approved'
                      ? 'Aprobada'
                      : n.type === 'rejected'
                        ? 'Rechazada'
                        : n.type === 'cancelled'
                          ? 'Cancelada'
                          : n.type === 'reminder'
                            ? 'Recordatorio'
                            : 'Aviso'}
                  </span>
                  {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <p className="mt-1 text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
