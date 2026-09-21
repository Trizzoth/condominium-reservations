import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TriangleAlert } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import ReportForm from '@/components/incidents/report-form';

const statusConfig = {
  open: { label: 'Abierta', color: 'bg-red-100 text-red-800' },
  in_progress: { label: 'En atención', color: 'bg-yellow-100 text-yellow-800' },
  resolved: { label: 'Resuelta', color: 'bg-green-100 text-green-800' },
} as const;

export default async function IncidentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS: cada residente solo ve las suyas.
  const { data: incidents } = await supabase
    .from('incidents')
    .select('*, common_areas(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const { data: areas } = await supabase
    .from('common_areas')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportar incidencia</h1>
        <p className="mt-1 text-muted-foreground">
          Daños o problemas en áreas comunes, con foto si puedes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportForm areas={areas || []} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Mis reportes ({incidents?.length || 0})</h2>
        {!incidents || incidents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TriangleAlert className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Aún no has reportado nada</p>
            </CardContent>
          </Card>
        ) : (
          incidents.map((i) => {
            const config = statusConfig[i.status as keyof typeof statusConfig];
            return (
              <Card key={i.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{i.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {i.common_areas?.name || 'Área sin especificar'} ·{' '}
                        {format(parseISO(i.created_at), "d MMM yyyy HH:mm", { locale: es })}
                      </p>
                      {i.description && <p className="mt-2 text-sm">{i.description}</p>}
                    </div>
                    <Badge className={config?.color}>{config?.label}</Badge>
                  </div>
                  {i.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.photo_url}
                      alt={i.title}
                      className="mt-3 max-h-56 rounded-lg border"
                    />
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
