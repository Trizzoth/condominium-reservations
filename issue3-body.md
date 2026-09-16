## Descripción
Implementar Fase 2 del MVP: notificaciones email, validaciones de negocio avanzadas, panel de seguridad.

## Qué hay que hacer

### Notificaciones Email (Resend)
- [ ] Configurar Resend (API key en Vercel/Supabase)
- [ ] Email confirmación reserva creada (residente)
- [ ] Email reserva aprobada (residente + detalles)
- [ ] Email reserva rechazada (residente + motivo)
- [ ] Email recordatorio 24h antes (cron job Supabase pg_cron o Vercel Cron)

### Validaciones de Negocio (Frontend + Backend)
- [ ] Max 2 reservas activas/semana por usuario
- [ ] Anticipación mínima: 2 horas
- [ ] Anticipación máxima: 30 días
- [ ] Duración máxima por reserva: configurable por área (default 4h)
- [ ] Validar en Server Action antes de insertar

### Panel Seguridad (`/security`)
- [ ] Login con role=security
- [ ] Lista reservas de hoy (aprobadas + pendientes check-in)
- [ ] Check-in: botón "Entrada" → marca checked_in_at
- [ ] Check-out: botón "Salida" → marca checked_out_at
- [ ] Marcar no-show (no llegó en 30 min)
- [ ] Vista lista con estados: Pendiente check-in, Dentro, Completado, No-show
- [ ] Filtro por área

### Extras
- [ ] QR code en email confirmación para check-in rápido
- [ ] Dashboard admin: métricas uso por área/mes

## Criterios de aceptación
- Emails se envían correctamente en cada evento
- Validaciones rechazan reservas inválidas con mensaje claro
- Panel seguridad funciona en móvil (responsive)
- Build pasa, TypeScript OK

## Referencias
- Resend: https://resend.com/docs
- Supabase pg_cron: https://supabase.com/docs/guides/database/extensions/pg-cron
- Vercel Cron: https://vercel.com/docs/cron-jobs

## Responsable
@Trizzoth