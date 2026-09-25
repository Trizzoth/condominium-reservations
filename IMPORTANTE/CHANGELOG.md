# Changelog - MVP Reservas Condominio

## [v1.1.0] - 2026-09-17 - Estabilización + Fase 3 parcial

### Agregado (PRs #10–#44)

- Login redirige según rol (admin→/admin, security→/security) + `?next=`/`callbackUrl` con guard anti open-redirect
- Recuperar contraseña (forgot + reset con Supabase recovery)
- Admin usuarios: buscar, invitar, cambiar rol, eliminar (guards anti auto-bloqueo)
- Admin reservas: filtros por estado y fecha (hoy/semana), exportar CSV
- Seguridad: buscar por código de reserva (QR/email), realtime auto-refresh en 3 layouts
- Ventana de cancelación 4h (helper + unit tests + UI/servidor)
- Cron no-show automático integrado al cron diario (límite 1 job del plan)
- Emails por SMTP/Gmail $0 con fallback a Resend (`getEmailProvider`)
- QR de check-in en email de aprobada
- PWA instalable: manifest + icon.svg + theme-color
- Sentry (cliente/servidor/edge + `global-error.tsx`, DSN en Vercel)
- Tooling RULES: Vitest (27+ tests), Prettier + formato total, Husky pre-commit
- Menú hamburguesa móvil + layouts únicos por ruta (fin doble header)
- Modo claro forzado (dark del SO rompía la UI)

### Fixes críticos (todos verificados en vivo contra prod)

| Issue                                            | Fix                                                        |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `escapeHtml` no-op (XSS abierto)                 | Entidades reales + escape en los 4 templates               |
| Botón cancelar y check-in/out rotos (`onClick`)  | Server Actions vía `<form action>` + validación de rol     |
| Cron recordatorios devolvía 0 filas              | Cliente service-role + `vercel.json` + `CRON_SECRET`       |
| `profiles` sin columna `email` (6 queries 400)   | `getUserEmailsByIds` vía Admin API                         |
| Aprobar respondía 500 (`profiles.full_name` nul) | Lecturas service-role en paneles + null-safe               |
| RLS: security veía 0 reservas, todos 1 perfil    | Lecturas privilegiadas tras layouts con rol                |
| Guardar perfil 400 RLS                           | Upsert service-role + precarga del form                    |
| Tema sin color (tripletes HSL sin `hsl()`)       | `@theme` con `hsl(var(--x))`                               |
| Calendario en lista vertical (v10 sin grid)      | Clases `months`/`month_grid`/`weeks`/`week`                |
| Áreas con spinner eterno (sin fetch al montar)   | `useEffect` + patrón `useMemo`/`useCallback`               |
| Links muertos (`/forgot-password`, checkin/…)    | Flujo recovery + poda de nav                               |
| Build Preview roto (`new Resend()` sin key)      | Lazy-init + `RESEND_API_KEY` ausente tolerado              |
| Redirect Supabase a URL vieja (recovery/mágico)  | Site URL + Redirect URLs en dashboard                      |
| Límite emails Supabase                           | SMTP propio en Supabase (30/h) + Gmail en app              |

### Infra/limpieza

- Proyecto Vercel duplicado eliminado (causaba 500s falsos)
- `supabase/migrations/000002`, SQL raíz movido, temporales borrados
- `memory.md` → `SPECS_PC.md`, `RESUMEN_PROYECTO.md` deprecado

## [v1.0.0] - 2026-09-16 - Producción Ready

### ✅ Features Implementadas

#### Auth & Security

- [x] Login/Register con email/password
- [x] Magic Link authentication
- [x] Perfil de usuario editable
- [x] Middleware de protección de rutas
- [x] Role-based access (resident, admin, security)
- [x] RLS Policies sin recursión infinita
- [x] UPDATE profiles restringido (no cambia role/id)

#### Reservas CRUD

- [x] Calendario visual (react-day-picker)
- [x] Slots horarios dinámicos por área/día
- [x] Validación solapamiento BD (constraint exclusivo)
- [x] Validaciones negocio: max 2 reservas/semana, anticipación 2h/30d, max 4h
- [x] Check-in/Check-out (Security panel)
- [x] Estados: pending, approved, rejected, cancelled, no_show

#### Admin Panel

- [x] CRUD Áreas comunes
- [x] CRUD Horarios (por día/semana)
- [x] Gestión usuarios (roles, apartamentos)
- [x] Aprobar/Rechazar reservas con notas
- [x] Dashboard métricas

#### Security Panel

- [x] Lista reservas de hoy
- [x] Check-in / Check-out / No-show
- [x] Estados: pendiente, dentro, salió, no-show
- [x] Stats cards (total, pendientes, dentro, no-show)

#### Notificaciones

- [x] Email confirmación reserva (Resend)
- [x] Email aprobación/rechazo (Resend)
- [x] Recordatorio 24h (Cron job Vercel)
- [x] Templates HTML Resend

#### Admin Panel - Gestión

- [x] CRUD Áreas comunes
- [x] CRUD Horarios por área/día
- [x] Gestión usuarios (roles, apartamentos)
- [x] Dashboard métricas (total, pendientes, aprobadas, este mes)

### 🔧 Fixes Críticos (2026-09-16)

| Issue                                                      | Severidad  | Fix                                         | Estado              |
| ---------------------------------------------------------- | ---------- | ------------------------------------------- | ------------------- |
| Escalación privilegios (UPDATE profiles sin restricción)   | 🔴 Crítico | `WITH CHECK` restringe `role`/`id`          | ✅ Solucionado      |
| Recursión infinita RLS (políticas admin/security)          | 🔴 Crítico | `auth.jwt() ->> 'role'` en lugar de query   | ✅ Solucionado      |
| Trigger `handle_new_user` no guardaba apartment/phone/role | 🟡 Medio   | Trigger actualizado con metadata            | ✅ Solucionado      |
| Security sin RLS policies                                  | 🔴 Crítico | Policies en profiles/reservations/schedules | ✅ Solucionado      |
| Server actions sin validación rol                          | 🔴 Crítico | Validación en server actions                | ✅ Solucionado      |
| **XSS en admin_notes emails**                              | 🔴 Crítico | `escapeHtml()` en email templates           | ✅ Solucionado      |
| Rate limit emails (2/h)                                    | 🟡 Medio   | Config manual: 10/hora                      | ⚠️ Pendiente manual |

### 🐛 Bugs Corregidos (2026-09-16, commit `3ed208a`)

| Bug                                                                                              | Fix                                                                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Calendario no respondía al click (override de `Day` eliminaba el `onClick` interno de DayPicker) | Override de `DayButton` en su lugar; verificado con test E2E `calendar-click.spec.ts` |
| Register con UI vieja gris                                                                       | Rediseño con el tema nuevo (iconos, cards, grid 2 col)                                |

### 🐛 Bugs Conocidos / Pendientes

| Bug                                                               | Severidad | Estado       | Comentario                                   |
| ----------------------------------------------------------------- | --------- | ------------ | -------------------------------------------- |
| Rate limit emails (cuota por hora)                               | 🟡 Medio  | ✅ Mitigado  | SMTP propio: 30/h Supabase + Gmail en app    |
| Tests E2E solo cubrían auth protection                           | 🟢 Baja   | ✅ Resuelto  | 18/18 incl. flujos felices, roles y UI       |
| Botones admin sin funcionalidad (rol/eliminar/filtros/CSV)       | 🟢 Baja   | ✅ Resuelto  | PR #26: todos funcionales                    |

---

## [v0.3.0] - 2026-09-16 - Phase 2 Complete

### Added

- Security Panel completo (check-in/out, no-show)
- Admin Panel completo (CRUD áreas, horarios, usuarios, reservas)
- Notificaciones email (Resend) + Cron job (Vercel)
- Business validations (max 2 reservas/semana, anticipación, max duración)
- RLS Security policies completas

### Fixed

- Trigger `handle_new_user` guarda apartment, phone, role
- RLS recursion fix: `auth.jwt() ->> 'role'`
- UPDATE profiles restricción role/id

---

## [v0.2.0] - 2026-09-16 - Phase 1 Complete

### Added

- Auth flow completo (login/register/magic link)
- Dashboard residente (áreas, reservas, perfil)
- Admin panel (aprobar/rechazar reservas)
- Calendar visual (react-day-picker)
- Validación solapamiento BD (constraint exclusivo)
- Admin CRUD áreas + horarios

---

## [v0.1.0] - 2026-09-16 - Initial Setup

### Added

- Next.js 14 + TS + Tailwind + Supabase
- shadcn/ui components base
- Supabase client/server + middleware auth
- Git flow + GitHub repo + Vercel deploy
- shadcn/ui components base (button, input, card, dialog, select, dropdown, avatar, badge, form, calendar, textarea)
