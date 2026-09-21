import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SprayCan, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { revalidatePath } from 'next/cache';

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
  return supabase;
}

async function markDone(formData: FormData) {
  'use server';
  const supabase = await requireStaff();
  const id = formData.get('id');
  if (!supabase || typeof id !== 'string') return;
  await supabase
    .from('cleaning_tasks')
    .update({
      status: 'done',
      done_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  revalidatePath('/security/cleaning');
}

export default async function SecurityCleaningPage() {
  // Service-role: RLS de cleaning_tasks no deja a security leer todo por
  // anon; el layout ya validó el rol.
  const supabase = createAdminClient();
  const { data: tasks } = await supabase
    .from('cleaning_tasks')
    .select('*, common_areas(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Limpieza pendiente</h1>
        <p className="mt-1 text-muted-foreground">
          Tareas asignadas por administración ({tasks?.length || 0})
        </p>
      </div>

      {!tasks || tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <SprayCan className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Todo limpio, sin pendientes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t.title}</p>
                      <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t.common_areas?.name || 'General'} ·{' '}
                      {format(parseISO(t.created_at), "d MMM HH:mm", { locale: es })}
                    </p>
                    {t.detail && <p className="mt-1 text-sm">{t.detail}</p>}
                  </div>
                  <form action={markDone}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="mr-2 h-4 w-4" /> Marcar hecha
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
