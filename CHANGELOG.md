# Changelog - MVP Reservas Condominio

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
| Rate limit emails (2/h por defecto)                               | 🟡 Medio  | ⚠️ Manual    | Configurar Supabase Auth → 10/hora           |
| Botones "Cambiar rol"/"Eliminar" en admin/users sin funcionalidad | 🟢 Baja   | 🟢 Pendiente | Placeholders sin implementar                 |
| Rate limit emails no configurado en Supabase                      | 🟡 Medio  | ⚠️ Manual    | Configurar en Dashboard → Auth → Rate Limits |
| Tests E2E solo cubren auth protection                             | 🟢 Baja   | 🟢 Pendiente | Ampliar cobertura                            |
| Botones "Cambiar rol"/"Eliminar" en admin/users sin handler       | 🟢 Baja   | 🟢 Pendiente | Solo UI placeholder                          |

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
