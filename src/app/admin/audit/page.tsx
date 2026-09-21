import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const actionConfig: Record<string, { label: string; color: string }> = {
  'reservation.created': { label: 'Creada', color: 'bg-blue-100 text-blue-800' },
  'reservation.approved': { label: 'Aprobada', color: 'bg-green-100 text-green-800' },
  'reservation.rejected': { label: 'Rechazada', color: 'bg-red-100 text-red-800' },
  'reservation.cancelled': { label: 'Cancelada (residente)', color: 'bg-gray-100 text-gray-800' },
  'reservation.admin_cancelled': { label: 'Cancelada (admin)', color: 'bg-orange-100 text-orange-800' },
  'reservation.checked_in': { label: 'Check-in', color: 'bg-green-100 text-green-800' },
  'reservation.checked_out': { label: 'Check-out', color: 'bg-blue-100 text-blue-800' },
  'reservation.no_show': { label: 'No-show', color: 'bg-red-100 text-red-800' },
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Service-role: audit_log solo legible por admin vía RLS.
  const supabase = createAdminClient();
  const { q = '' } = await searchParams;
  const query = q.trim().toLowerCase();

  const { data: events } = await supabase
    .from('audit_log')
    .select('*, profiles(full_name, apartment)')
    .order('created_at', { ascending: false })
    .limit(100);

  const displayed = query
    ? (events || []).filter(
        (e) =>
          (e.entity_id || '').toLowerCase().startsWith(query) ||
          (e.detail || '').toLowerCase().includes(query) ||
          (e.profiles?.full_name || '').toLowerCase().includes(query),
      )
    : events || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auditoría</h1>
        <p className="mt-1 text-muted-foreground">
          Quién aprobó, canceló o movió qué, con fecha (últimos 100 eventos)
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por código, detalle o persona"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Buscar
        </button>
      </form>

      {displayed.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ScrollText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {query ? 'Sin coincidencias' : 'Aún no hay eventos (se registran desde ahora)'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayed.map((e) => {
            const config = actionConfig[e.action] || {
              label: e.action,
              color: 'bg-gray-100 text-gray-800',
            };
            return (
              <Card key={e.id}>
                <CardContent className="py-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>{config.label}</Badge>
                      <span className="text-sm">
                        {e.profiles?.full_name
                          ? `${e.profiles.full_name}${e.profiles.apartment ? ` · ${e.profiles.apartment}` : ''}`
                          : 'Sistema'}
                      </span>
                      {e.entity_id && (
                        <span className="font-mono text-xs text-muted-foreground">
                          #{e.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(e.created_at), "d MMM yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                  {e.detail && <p className="mt-1 text-sm text-muted-foreground">{e.detail}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
