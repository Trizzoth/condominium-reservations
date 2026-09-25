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

## D6 — Escrituras admin vía service-role (policies JWT sin claim)

**Fecha:** 2026-09-21

**Opciones consideradas:**
- (a) Service-role tras verificar rol en servidor
- (b) Arreglar policies a `EXISTS` sobre `profiles`
- (c) Hook de claims en Auth para inyectar `role` al JWT

**Decisión:** (a). El JWT de Supabase no trae `role = admin` y los `UPDATE` vía user-client no tocaban filas (fallo silencioso en aprobar/rechazar/atender/limpiar/ajustes/áreas/horarios). Patrón: verificar rol leyendo el propio profile + escribir con service-role (ya usado en `adminCancelReservation`).

**Por qué:** (b) toca RLS en producción con riesgo de abrir de más; (c) requiere dashboard + no es versionable. (a) es solo código, reversible y auditado en `audit_log`.

**Qué se sacrifica:** la defensa queda en la Server Action, no en la BD. Aceptado y documentado; si algún día hay hook de claims, se puede volver a user-client.

## D7 — Botones con estado pending + idempotencia

**Fecha:** 2026-09-21

**Opciones consideradas:**
- (a) `SubmitButton` con `useFormStatus` en todos los forms + guards por estado
- (b) Deshabilitar a mano en cada botón
- (c) Nada (el usuario espera)

**Decisión:** (a). Las acciones esperan al email SMTP (lento) y parecían muertas → doble-click duplicaba aprobados (visto en auditoría: misma reserva aprobada 2×). Guards: aprobar/rechazar solo `pending`, check-in/out solo si null, atender solo abierta.

**Por qué:** un componente compartido cubre todos los forms presentes y futuros; los guards hacen el doble-submit inofensivo aunque ocurra.

**Qué se sacrifica:** ~1 dependencia conceptual más (`react-dom/useFormStatus`). Nada funcional.

## D8 — QR del email como adjunto CID (no data-URL)

**Fecha:** 2026-09-21

**Opciones consideradas:**
- (a) Adjunto inline `cid:qr-checkin`
- (b) Subir el PNG a Storage y link público
- (c) Dejar `data:` (roto en Gmail)

**Decisión:** (a) para SMTP (proveedor vivo); Resend lo adjunta sin inline (degradado aceptable). Verificado el MIME real en test.

**Por qué:** Gmail jamás renderiza `data:` (icono roto permanente). (b) exigiría "mostrar imágenes" igual y suma dependencia de red.

**Qué se sacrifica:** +~1KB por email aprobado. Irrelevante.

## D9 — Multicuenta con tokens guardados + salida local

**Fecha:** 2026-09-21

**Opciones consideradas:**
- (a) Guardar refresh tokens por cuenta + salida solo-local
- (b) Botones demo que rellenan credenciales
- (c) Nada (login completo cada vez)

**Decisión:** (a) en el avatar; (b) se descartó (no sirve en deploy). Hallazgo: el backend revoca el refresh tras logout **aunque se pida `scope: local`** (probado en vivo) — por eso "Cerrar sesión" ya no llama al servidor.

**Por qué:** cambio en 1 click era el pedido; nunca se guardan contraseñas (mismo nivel que el storage propio de Supabase).

**Qué se sacrifica:** en dispositivos compartidos, "Cerrar sesión" no invalida en servidor. Documentado en código; aceptado para MVP/hackatón.

## D10 — Teléfono normalizado con código de país

**Fecha:** 2026-09-21

**Opciones consideradas:**
- (a) Selector de país + solo dígitos, guarda `50688888888`
- (b) Texto libre como antes

**Decisión:** (a) en registro y perfil; zod 7–15 dígitos; valores viejos se normalizan al guardar (retrocompatible con `toWaNumber`).

**Por qué:** había letras en teléfonos y eso rompía `wa.me`. Un formato único elimina la clase entera de bugs.

**Qué se sacrifica:** formatos locales con guiones/espacios se pierden al guardar. Aceptado (wa.me los rechaza igual).

## D11 — WhatsApp manual (wa.me), masivo queda fuera

**Fecha:** 2026-09-21

**Opciones consideradas:**
- (a) Links `wa.me` por residente/incidencia/usuario ($0)
- (b) Twilio o Meta Cloud API (automático/masivo, con costo y setup)

**Decisión:** (a) en seguridad y admin-usuarios con mensaje prellenado. (b) documentado como camino futuro si hay presupuesto.

**Por qué:** $0, sin keys, sin comandos; cubre el caso real (contactar al vecino). El broadcast no existe gratis en WhatsApp.

**Qué se sacrifica:** nada automático; cada mensaje lo inicia una persona.

## D12 — Lotes de semana extra (stats v2, paginación, series, detalle QR)

**Fecha:** 2026-09-21

**Opciones consideradas:**
- (a) Un PR grande con todo
- (b) Dos lotes (1: seguridad-incidencias/usuarios/stats · 2: limpieza-programada/detalle-QR)

**Decisión:** (b) PRs #71 y #72. Todo con datos e infra existentes (sin keys nuevas).

**Por qué:** PRs chicos se revisan y revierten fácil; cada lote se probó funcionalmente antes de abrirse.

**Qué se sacrifica:** un poco más de ceremonia git. Vale la pena.

---

## Desviaciones reto ↔ producto (decididas con el equipo)

- **Roles:** reto pide miembro/admin; el producto tiene resident/admin/security (superset, security exigido por el condominio).
- **Reglas numéricas:** se alinearon al reto (30min bloques, 1–3h, 07:00–21:00 fijo, 30min anticipación, 3/semana, cancelar 2h, `America/Costa_Rica`). Antes: 2h/4h/2sem (idea condominio).
- **2026-09-18 (David): duración 3–6h, horario 06:00–24:00.** Reemplaza RN-03/RN-04. Supuesto registrado: día operativo 06:00 a medianoche exacta; turnos "6–12 / 12–12" interpretados como ventana continua (NO bloques rígidos: eso requeriría confirmación explícita). UI solo ofrece fines válidos; medianoche exacta seleccionable como "24:00".
- **Horarios por área:** la tabla `availability_schedules` sigue alimentando el calendario UI, pero el servidor impone el fijo 07:00–21:00. Si un área configura fuera de rango, el servidor manda (documentado; simplificar UI queda pendiente).
- **2026-09-21 (semana extra, dueño): reglas POR ÁREA.** Cada área tiene duración min/max, horario y máx/semana editables (`common_areas`, migración `..._area_rules`); el cap semanal ahora cuenta por área (no global). Defaults = decisión David.
- **2026-09-21: notificaciones in-app + auditoría + incidencias + limpieza.** Tablas `notifications`, `audit_log`, `incidents` (+bucket `incidencias`), `cleaning_tasks`, `app_settings`, bucket `avatars`. Todo $0 en plan free.
- **Emails/QR/PWA/Sentry:** fuera del reto, exigidos por el producto. Se mantienen.

## Decisiones técnicas relevantes

- **Service-role solo servidor** (`src/lib/supabase/admin.ts`): RLS deja ver solo lo propio; los paneles leen vía service-role tras layouts con rol. Nunca se expone al cliente.
- **Rol por JWT** (`auth.jwt() ->> 'role'`): leer `profiles` dentro de una policy de `profiles` causa recursión 42P17. Prohibido en este repo.
- **Tipos TS desde esquema** (`src/types/database.ts`): generados por introspección (sin token no hay `supabase gen types`); regenerar oficial con el comando del header cuando haya `SUPABASE_ACCESS_TOKEN`.
- **Un cron diario** (no dos): el plan Vercel usado rechaza el segundo job; reminders + no-show comparten invocación.
- **SMTP Gmail dual**: sin dominio no hay envíos Resend a residentes; SMTP gana si hay `SMTP_*`, si no Resend, si no nada (error controlado).
