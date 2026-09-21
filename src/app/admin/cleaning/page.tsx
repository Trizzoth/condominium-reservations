import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyUser } from '@/lib/notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubmitButton from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SprayCan, CheckCircle, RotateCcw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function requireAdmin() {
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
  if (profile?.role !== 'admin') return null;
  return { supabase, adminId: user.id };
}

const taskSchema = z.object({
  title: z.string().min(3).max(120),
  detail: z.string().max(500).optional(),
  common_area_id: z.string().uuid().optional(),
});

async function createTask(formData: FormData) {
  'use server';
  const auth = await requireAdmin();
  if (!auth) return;
  const validated = taskSchema.safeParse({
    title: formData.get('title'),
    detail: formData.get('detail') || undefined,
    common_area_id: formData.get('common_area_id') || undefined,
  });
  if (!validated.success) return;

  const { data: task, error } = await createAdminClient()
    .from('cleaning_tasks')
    .insert({
      title: validated.data.title,
      detail: validated.data.detail || null,
      common_area_id: validated.data.common_area_id || null,
      created_by: auth.adminId,
    })
    .select('id, title')
    .single();
  if (error || !task) return;

  // Aviso por campanita a todo el personal de seguridad (conserjes).
  try {
    const admin = createAdminClient();
    const { data: staff } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'security');
    for (const s of staff || []) {
      await notifyUser({
        user_id: s.id,
        title: 'Nueva tarea de limpieza',
        body: task.title,
        type: 'info',
      });
    }
  } catch (err) {
    console.error('notify cleaning staff failed:', err);
  }

  revalidatePath('/admin/cleaning');
}

async function setDone(formData: FormData) {
  'use server';
  const auth = await requireAdmin();
  const id = formData.get('id');
  const done = formData.get('done') === '1';
  if (!auth || typeof id !== 'string') return;
  await createAdminClient()
    .from('cleaning_tasks')
    .update({
      status: done ? 'done' : 'pending',
      done_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  revalidatePath('/admin/cleaning');
}

async function deleteTask(formData: FormData) {
  'use server';
  const auth = await requireAdmin();
  const id = formData.get('id');
  if (!auth || typeof id !== 'string') return;
  await createAdminClient().from('cleaning_tasks').delete().eq('id', id);
  revalidatePath('/admin/cleaning');
}

export default async function AdminCleaningPage() {
  // Service-role: el layout ya validó rol admin.
  const supabase = createAdminClient();
  const { data: tasks } = await supabase
    .from('cleaning_tasks')
    .select('*, common_areas(name)')
    .order('created_at', { ascending: false });
  const { data: areas } = await supabase
    .from('common_areas')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  const pending = (tasks || []).filter((t) => t.status === 'pending');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Limpieza</h1>
        <p className="mt-1 text-muted-foreground">
          Tareas para el conserje ({pending.length} pendiente(s)) · se le avisa por campanita
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva tarea</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTask} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Título *</Label>
              <Input
                id="task-title"
                name="title"
                placeholder="Ej: Limpiar salón después del evento"
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Área (opcional)</Label>
              <Select name="common_area_id">
                <SelectTrigger>
                  <SelectValue placeholder="Sin área específica" />
                </SelectTrigger>
                <SelectContent>
                  {(areas || []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-detail">Detalle</Label>
              <Textarea
                id="task-detail"
                name="detail"
                placeholder="Horario, insumos, a quién avisar..."
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="md:col-span-2">
              <SubmitButton pendingText="Creando y avisando...">
                <SprayCan className="mr-2 h-4 w-4" /> Crear y avisar al conserje
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(tasks || []).map((t) => (
          <Card key={t.id} className={t.status === 'done' ? 'opacity-70' : ''}>
            <CardContent className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{t.title}</p>
                    <Badge
                      className={
                        t.status === 'done'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {t.status === 'done' ? 'Hecha' : 'Pendiente'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.common_areas?.name || 'General'} ·{' '}
                    {format(parseISO(t.created_at), "d MMM HH:mm", { locale: es })}
                  </p>
                  {t.detail && <p className="mt-1 text-sm">{t.detail}</p>}
                </div>
                <div className="flex gap-2">
                  <form action={setDone}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="done" value={t.status === 'done' ? '0' : '1'} />
                    <SubmitButton size="sm" variant="outline" pendingText="...">
                      {t.status === 'done' ? (
                        <>
                          <RotateCcw className="mr-1 h-4 w-4" /> Reabrir
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-1 h-4 w-4" /> Hecha
                        </>
                      )}
                    </SubmitButton>
                  </form>
                  <form action={deleteTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <SubmitButton
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      pendingText="..."
                    >
                      <Trash2 className="h-4 w-4" />
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(tasks || []).length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Sin tareas todavía
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
