import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SubmitButton from '@/components/ui/submit-button';
import ReportForm from '@/components/incidents/report-form';
import { TriangleAlert, Wrench, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { revalidatePath } from 'next/cache';

const statusConfig = {
  open: { label: 'Abierta', color: 'bg-red-100 text-red-800' },
  in_progress: { label: 'En atención', color: 'bg-yellow-100 text-yellow-800' },
  resolved: { label: 'Resuelta', color: 'bg-green-100 text-green-800' },
} as const;

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'security' && profile?.role !== 'admin') return null;
  return true;
}

async function setStatus(formData: FormData) {
  'use server';
  const ok = await requireStaff();
  const id = formData.get('id');
  const status = formData.get('status');
  if (!ok || typeof id !== 'string' || typeof status !== 'string') return;
  if (!['open', 'in_progress', 'resolved'].includes(status)) return;
  // service-role: incidents no tiene policy de escritura para security.
  const adminDb = createAdminClient();
  let q = adminDb.from('incidents').update({
    status: status as 'open' | 'in_progress' | 'resolved',
    updated_at: new Date().toISOString(),
  });
  q = status === 'in_progress' ? q.eq('status', 'open') : q.neq('status', 'resolved');
  await q.eq('id', id);
  revalidatePath('/security/incidents');
}

export default async function SecurityIncidentsPage() {
  // Service-role: el layout ya validó el rol.
  const supabase = createAdminClient();
  const { data: incidents } = await supabase
    .from('incidents')
    .select('*, common_areas(name), profiles(full_name, apartment)')
    .neq('status', 'resolved')
    .order('created_at', { ascending: false });
  const { data: areas } = await supabase
    .from('common_areas')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Incidencias</h1>
        <p className="mt-1 text-muted-foreground">
          Daños que ves en rondas: repórtalos o atiéndelos ({incidents?.length || 0} abiertas)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reportar daño</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportForm areas={areas || []} />
        </CardContent>
      </Card>

      {!incidents || incidents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TriangleAlert className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Sin incidencias abiertas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {incidents.map((i) => {
            const config = statusConfig[i.status as keyof typeof statusConfig];
            return (
              <Card key={i.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{i.title}</p>
                        <Badge className={config?.color}>{config?.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {i.profiles?.full_name || 'Anónimo'}
                        {i.profiles?.apartment ? ` · ${i.profiles.apartment}` : ''} ·{' '}
                        {i.common_areas?.name || 'Área sin especificar'} ·{' '}
                        {format(parseISO(i.created_at), "d MMM HH:mm", { locale: es })}
                      </p>
                      {i.description && <p className="mt-1 text-sm">{i.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      {i.status === 'open' && (
                        <form action={setStatus}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="status" value="in_progress" />
                          <SubmitButton size="sm" variant="outline" pendingText="...">
                            <Wrench className="mr-1 h-4 w-4" /> Atender
                          </SubmitButton>
                        </form>
                      )}
                      <form action={setStatus}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <SubmitButton size="sm" pendingText="...">
                          <CheckCircle className="mr-1 h-4 w-4" /> Resolver
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                  {i.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.photo_url} alt={i.title} className="mt-3 max-h-56 rounded-lg border" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
