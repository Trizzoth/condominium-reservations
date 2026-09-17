# Bitácora de Decisiones — MVP Reservas Condominio

Formato por entrada: Fecha / Opciones / Decisión / Por qué / Sacrificio.

---

## D1 — Definición de semana para el límite de reservas (RN-06)

**Fecha:** 2026-09-17

**Opciones consideradas:**
- (a) Domingo a sábado (inicio `getDay() === 0`)
- (b) Lunes a domingo (ISO)
- (c) Ventana móvil de últimos 7 días

**Decisión:** (a) Domingo a sábado. La reserva pertenece a la semana de su `start_time`. Implementado en `createReservation` y en el contador del dashboard con `America/Costa_Rica`.

**Por qué:** `date-fns` `startOfWeek` usa domingo por defecto; misma regla en validación y UI (un solo cálculo, sin divergencias).

**Qué se sacrifica:** usuarios junto al corte semanal pueden percibir el límite como arbitrario; (c) sería más "justo" pero impredecible de explicar.

## D2 — ¿Las reservas canceladas cuentan para el límite de RN-06?

**Fecha:** 2026-09-17

**Opciones consideradas:**
- (a) Solo `pending` + `approved` cuentan (canceladas/rechazadas liberan)
- (b) Todo lo creado en la semana cuenta

**Decisión:** (a). RN-08 (cancelada libera bloque) se extiende a liberar cupo semanal.

**Por qué:** coherente con RN-08; castigar la cancelación desincentiva liberar horarios.

**Qué se sacrifica:** un usuario podría cancelar y re-reservar en bucle (churn). Aceptado para MVP; detectable en admin.

## D3 — Desactivar un área con reservas futuras aprobadas

**Fecha:** 2026-09-17

**Opciones consideradas:**
- (a) Bloquear con mensaje
- (b) Cancelarlas automáticamente
- (c) Dejarlas (huérfanas)

**Decisión:** (a) El toggle valida futuras aprobadas y bloquea: *"Cancélalas primero"*. Nunca se borra físicamente (A4).

**Por qué:** (b) destruye datos de usuarios sin su consentimiento; (c) deja reservas imposibles de cumplir. (a) no pierde nada.

**Qué se sacrifica:** fricción para el admin (dos pasos). Aceptable y reversible.

## D4 — ¿El admin está sujeto al límite de RN-06?

**Fecha:** 2026-09-17

**Opciones consideradas:**
- (a) Sí, sin excepciones por rol
- (b) Admins exentos

**Decisión:** (a) `createReservation` no distingue roles.

**Por qué:** simplicidad + evita vías de abuso (una cuenta admin comprometida no puede saturar áreas).

**Qué se sacrifica:** admins probando consumen su cuota semanal (usar cuentas de test).

## D5 — Dos usuarios reservan el mismo bloque a la vez

**Fecha:** 2026-09-17

**Opciones consideradas:**
- (a) Lock optimista en UI
- (b) Dejar que la BD decida (constraint `EXCLUDE`)

**Decisión:** (b) El segundo recibe error 23P01 → mensaje *"ya está reservado (conflicto en BD)"*. Realtime refresca listas para que se vea el cambio. Script `scripts/concurrencia.ts` lo demuestra (10 intentos → 1 éxito).

**Por qué:** la BD es la única fuente de verdad bajo concurrencia; cualquier check previo en app tiene race condition.

**Qué se sacrifica:** UX del perdedor (reintentar manual). Sin locks distribuidos que complejicen.

---

## Desviaciones reto ↔ producto (decididas con el equipo)

- **Roles:** reto pide miembro/admin; el producto tiene resident/admin/security (superset, security exigido por el condominio).
- **Reglas numéricas:** se alinearon al reto (30min bloques, 1–3h, 07:00–21:00 fijo, 30min anticipación, 3/semana, cancelar 2h, `America/Costa_Rica`). Antes: 2h/4h/2sem (idea condominio).
- **Horarios por área:** la tabla `availability_schedules` sigue alimentando el calendario UI, pero el servidor impone el fijo 07:00–21:00. Si un área configura fuera de rango, el servidor manda (documentado; simplificar UI queda pendiente).
- **Emails/QR/PWA/Sentry:** fuera del reto, exigidos por el producto. Se mantienen.

## Decisiones técnicas relevantes

- **Service-role solo servidor** (`src/lib/supabase/admin.ts`): RLS deja ver solo lo propio; los paneles leen vía service-role tras layouts con rol. Nunca se expone al cliente.
- **Rol por JWT** (`auth.jwt() ->> 'role'`): leer `profiles` dentro de una policy de `profiles` causa recursión 42P17. Prohibido en este repo.
- **Tipos TS desde esquema** (`src/types/database.ts`): generados por introspección (sin token no hay `supabase gen types`); regenerar oficial con el comando del header cuando haya `SUPABASE_ACCESS_TOKEN`.
- **Un cron diario** (no dos): el plan Vercel usado rechaza el segundo job; reminders + no-show comparten invocación.
- **SMTP Gmail dual**: sin dominio no hay envíos Resend a residentes; SMTP gana si hay `SMTP_*`, si no Resend, si no nada (error controlado).
