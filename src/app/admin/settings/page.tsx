import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppSettings } from '@/lib/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const settingsSchema = z.object({
  cancel_window_hours: z.coerce.number().int().min(1).max(72),
  min_advance_minutes: z.coerce.number().int().min(10).max(1440),
});

async function saveSettings(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return;

  const validated = settingsSchema.safeParse({
    cancel_window_hours: formData.get('cancel_window_hours'),
    min_advance_minutes: formData.get('min_advance_minutes'),
  });
  if (!validated.success) return;

  const rows = [
    { key: 'cancel_window_hours', value: String(validated.data.cancel_window_hours) },
    { key: 'min_advance_minutes', value: String(validated.data.min_advance_minutes) },
  ];
  for (const row of rows) {
    // service-role: el JWT no trae claim admin (ver approveReservationAction).
    await createAdminClient()
      .from('app_settings')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }
  revalidatePath('/admin/settings');
  revalidatePath('/dashboard/reservations');
}

export default async function AdminSettingsPage() {
  // Service-role para leer aunque el JWT no traiga claims (fail-safe a defaults).
  const settings = await getAppSettings();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ajustes globales</h1>
        <p className="mt-1 text-muted-foreground">
          Límites y anticipación sin tocar código (las reglas por área están en Áreas)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservas</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel_window_hours">Cancelar hasta (horas antes del inicio)</Label>
              <Input
                id="cancel_window_hours"
                name="cancel_window_hours"
                type="number"
                min={1}
                max={72}
                defaultValue={settings.cancelWindowHours}
                required
              />
              <p className="text-xs text-muted-foreground">
                RN-07: el botón de cancelar se oculta y el servidor rechaza dentro de esta ventana.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_advance_minutes">Anticipación mínima (minutos)</Label>
              <Input
                id="min_advance_minutes"
                name="min_advance_minutes"
                type="number"
                min={10}
                max={1440}
                defaultValue={settings.minAdvanceMinutes}
                required
              />
              <p className="text-xs text-muted-foreground">
                RN-05: no se puede reservar con menos anticipación que esta.
              </p>
            </div>
            <Button type="submit">Guardar ajustes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
