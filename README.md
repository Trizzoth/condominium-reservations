# MVP Reservas Condominio

Sistema de reservas de áreas comunes: residentes reservan, admins aprueban,
seguridad hace check-in/out. Mobile-first, español.

**Producción:** https://condominium-reservations-gbsx.vercel.app

## Levantar desde cero (probado)

```bash
git clone https://github.com/Trizzoth/condominium-reservations.git
cd condominium-reservations
pnpm install
cp .env.example .env.local   # completar con valores del dashboard Supabase
# BD: pegar supabase/migrations/*.sql en orden en el SQL Editor de Supabase
pnpm dev                      # http://localhost:3000
```

Verificación:

```bash
pnpm lint && pnpm typecheck && pnpm test:unit   # sin secretos
pnpm build                                       # dummy env en CI
npx playwright test                              # requiere .env.local real
node scripts/seed.ts                             # datos de prueba (SEED-*)
node scripts/concurrencia.ts                     # prueba §4.1 del reto
```

## Modelo de datos

```
auth.users ──1:1── profiles (id, full_name, apartment, phone, role)
common_areas (id, name, capacity, rules, is_active)
    │ 1:N
availability_schedules (common_area_id, day_of_week, open/close, max_hours)
    │ 1:N                  │ 1:N
    └──── reservations (user_id, common_area_id, start/end, status,
                        admin_notes, checked_in/out_at)
                        + EXCLUDE no_overlap (mismo área + rango horario,
                          solo pending/approved) → RN-01 a nivel BD
```

Roles: `resident` (reserva) · `admin` (aprueba/gestiona) · `security` (check-in/out).
RLS activo en las 4 tablas, políticas por operación (ver `SEGURIDAD.md`).

## Qué funciona / qué quedó fuera

Funciona: auth email+magic link+recovery, reservas con calendario y reglas
RN-02–RN-09 (ver `DECISIONES.md` D1–D5), panel admin (áreas/horarios/usuarios/
reservas, filtros, CSV, aprobar/rechazar/cancelar), panel seguridad
(check-in/out/no-show/búsqueda por código), emails SMTP (confirmación,
aprobación con QR, recordatorio 24h), cron no-show, realtime, PWA instalable,
Sentry, Vitest + Playwright en verde.

Fuera por alcance: pagos, multi-condominio, app nativa, reportes BI,
incidencias de seguridad, reglas configurables por área, offline total,
push notifications. Detalle en `FEATURES.md`.

## Prueba de concurrencia (§4.1 del reto)

```
$ node scripts/concurrencia.ts
intentos=10 exitosas=1 fallidas=9
codigos_fallo=23P01
CONCURRENCIA OK: exactamente 1 ganó, 9 rechazadas por EXCLUDE
```

## Docs

- `DECISIONES.md` — D1–D5 + decisiones técnicas (formato Fecha/Opciones/Decisión/Por qué/Sacrificio)
- `SEGURIDAD.md` — cada policy RLS + ataque que bloquea
- `guia-onboarding-mvp.md` — stack y metodología del equipo
- `RULES.md` / `MEMORY.md` / `FEATURES.md` / `CHANGELOG.md` — reglas, memoria, alcance, historial
