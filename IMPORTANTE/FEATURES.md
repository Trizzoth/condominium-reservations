# Features Tracking - MVP Reservas Condominio

## ✅ IMPLEMENTADO (Producción Ready)

### 🔐 Auth & Security

| Feature                      | Archivo                                           | Estado | Notas                                 |
| ---------------------------- | ------------------------------------------------- | ------ | ------------------------------------- |
| Login email/password         | `src/app/(auth)/login/page.tsx`                   | ✅     | Server Action `signIn`                |
| Register con apartment/phone | `src/app/(auth)/register/page.tsx`                | ✅     | Metadata en signUp                    |
| Magic Link                   | `src/app/(auth)/login/page.tsx`                   | ✅     | Server Action `sendMagicLink`         |
| Callback auth                | `src/app/auth/callback/route.ts`                 | ✅     | Exchange + redirect por rol                  |
| Perfil usuario               | `src/app/(dashboard)/dashboard/profile/page.tsx`  | ✅     | Upsert service-role + precarga               |
| Redirect por rol             | `src/lib/auth-redirect.ts` + `signIn`             | ✅     | admin→/admin, security→/security             |
| Recuperar contraseña         | `forgot-password` + `reset-password`              | ✅     | Supabase recovery, probado en vivo           |
| Middleware auth              | `src/middleware.ts`                               | ✅     | Protege /dashboard, /admin, /security |
| Role-based access            | `src/app/admin/layout.tsx`, `security/layout.tsx` | ✅     | Server Components verifican rol       |

### 📅 Reservas CRUD

| Feature                    | Archivo                                                   | Estado | Notas                                              |
| -------------------------- | --------------------------------------------------------- | ------ | -------------------------------------------------- |
| Calendario visual          | `src/components/ui/calendar.tsx`                          | ✅     | react-day-picker + Días sin horario deshabilitados |
| Slots horarios dinámicos   | `src/app/(dashboard)/dashboard/reservations/new/page.tsx` | ✅     | Basados en horarios BD                             |
| Validación solapamiento BD | `schema.sql` + `actions.ts`                               | ✅     | Constraint `no_overlap` (EXCLUDE gist)             |
| Validaciones negocio       | `actions.ts`                                              | ✅     | Max 2/semana, 2h-30d, max 4h                       |
| Crear reserva              | `src/app/api/reservations/create/route.ts`                | ✅     | Server Action `createReservation`                  |
| Ver mis reservas           | `src/app/(dashboard)/dashboard/reservations/page.tsx`     | ✅     | Cancelar (ventana 4h UI+servidor)              |
| Nueva reserva UI           | `src/app/(dashboard)/dashboard/reservations/new/page.tsx` | ✅     | 3 pasos: área, fecha, hora                     |
| Ventana cancelación 4h     | `src/lib/reservation-rules.ts` (+6 unit tests)            | ✅     | Regla IDEA antes sin implementar               |
| No-show automático         | Cron diario integrado a reminders                         | ✅     | Plan Vercel admite 1 solo job                  |

### 👑 Admin Panel

| Feature            | Archivo                                                     | Estado                      |
| ------------------ | ----------------------------------------------------------- | --------------------------- |
| Dashboard métricas | `src/app/admin/page.tsx`                                    | ✅                          |
| CRUD Áreas comunes | `src/app/admin/areas/page.tsx`                              | ✅                          |
| CRUD Horarios      | `src/app/admin/schedules/page.tsx`                          | ✅                          |
| Gestión usuarios   | `src/app/admin/users/page.tsx`                              | ✅                          |
| Buscar/invitar/rol/borrar | `src/app/admin/actions.ts` + `user-actions.tsx`        | ✅ (guards anti auto-bloqueo) |
| Gestión reservas   | `src/app/admin/reservations/page.tsx`                       | ✅                          |
| Aprobar/Rechazar   | `src/app/admin/actions/approve/route.ts`, `reject/route.ts` | ✅                          |

### 🛡️ Security Panel

| Feature                                 | Archivo                      | Estado |
| --------------------------------------- | ---------------------------- | ------ |
| Dashboard hoy                           | `src/app/security/page.tsx`  | ✅     |
| Check-in / Check-out                    | Server Actions en `page.tsx` | ✅     |
| No-show                                 | Manual + cron automático     | ✅     |
| Buscar por código (QR/email)            | `?code=` filtra lista de hoy | ✅     |
| Realtime auto-refresh                   | `useRealtimeRefresh` en 3 layouts | ✅ |
| Estados: pendiente/dentro/salió/no-show | ✅                           |        |
| Datos perfil (tel, email) en cards      | ✅                           |        |

### 📧 Notificaciones

| Feature                    | Archivo                               | Estado                 |
| -------------------------- | ------------------------------------- | ---------------------- |
| Email confirmación reserva | `src/lib/emails.ts` (SMTP/Gmail)      | ✅ probado en vivo     |
| Email aprobación (+QR)     | `src/lib/emails.ts` + `qrcode`        | ✅ probado en vivo     |
| Email rechazo              | `src/lib/emails.ts`                   | ✅                     |
| Recordatorio 24h (cron)    | `src/app/api/cron/reminders/route.ts` | ✅ código (falta ver disparo real) |
| Proveedor dual SMTP/Resend | `getEmailProvider` (+21 unit tests)   | ✅                     |
| Templates HTML             | `src/lib/emails.ts`                   | ✅ XSS escapado        |

### 🛡️ Seguridad RLS

| Tabla                  | Policy                                                            | Estado |
| ---------------------- | ----------------------------------------------------------------- | ------ |
| profiles               | Solo propio por RLS; paneles leen vía service-role (tras rol)     | ✅     |
| reservations           | Propias; admin todas; security 0 por RLS → service-role en panel  | ✅     |
| common_areas           | Lectura autenticada OK; admin gestiona                            | ✅     |
| availability_schedules | Lectura OK; admin gestiona                                        | ✅     |

---

## 📋 POR IMPLEMENTAR (Fase 3 - Nice to Have)

### 🔐 PWA / Offline

| Feature                  | Prioridad | Estimación | Notas                             |
| ------------------------ | --------- | ---------- | --------------------------------- |
| Service Worker           | 🟡 Media  | 1 día      | Cache estático + offline fallback |
| Web App Manifest         | 🟢 Baja   | 0.5 día    | manifest.json + icons             |
| Offline fallback page    | 🟢 Baja   | 0.5 día    | `/offline` page                   |
| Background sync reservas | 🔴 Alta   | 2 días     | Queue reservas offline            |

### 📊 Monitoreo

| Feature                | Prioridad | Estimación | Notas                         |
| ---------------------- | --------- | ---------- | ----------------------------- |
| Sentry error tracking  | 🟡 Media  | 0.5 día    | DSN en env + `@sentry/nextjs` |
| Performance monitoring | 🟢 Baja   | 1 día      | Web Vitals + custom metrics   |
| Error boundary global  | 🟢 Baja   | 0.5 día    | `app/global-error.tsx`        |

### 📱 UX / Mobile

| Feature                | Prioridad | Estimación | Notas                          |
| ---------------------- | --------- | ---------- | ------------------------------ |
| QR codes en emails     | 🟡 Media  | 1 día      | ✅ en aprobada (`qrcode`)  |
| Push notifications     | 🔴 Alta   | 2 días     | Web Push API + VAPID           |
| Dark mode toggle       | 🟢 Baja   | 0.5 día    | Theme provider + localStorage  |
| Pull-to-refresh mobile | 🟢 Baja   | 0.5 día    | Pull-to-refresh en listas      |

### 🧪 Testing

| Feature                                | Prioridad | Estimación | Estado                        |
| -------------------------------------- | --------- | ---------- | ----------------------------- |
| Playwright E2E: Auth flow              | 🔴 Alta   | 1 día      | ✅ 18/18 (roles, recovery, UI) |
| Playwright E2E: Flujo reserva completa | 🔴 Alta   | 1 día      | ✅ probado (crear→aprobar)     |
| Playwright E2E: Admin approve/reject   | 🔴 Alta   | 1 día      | ✅ probado                     |
| Playwright E2E: Security check-in/out  | 🔴 Alta   | 1 día      | ✅ probado                     |
| Unit Tests (Vitest)                    | 🟡 Media  | 1 día      | ✅ 27+ (redirect, emails, reglas) |
| Coverage mínimo 70%                    | 🟡 Media  | -          | 🟢 Pendiente medir             |

### 🔔 Notificaciones Avanzadas

| Feature                     | Prioridad | Estimación | Notas                          |
| --------------------------- | --------- | ---------- | ------------------------------ |
| QR codes en emails          | 🟡 Media  | 1 día      | ✅ hecho                   |
| Push notifications Web Push | 🔴 Alta   | 2 días     | VAPID keys + Service Worker    |
| SMS notifications (Twilio)  | 🟢 Baja   | 1 día      | Opcional                       |
| In-app notifications center | 🟡 Media  | 1 día      | Toast + notification center    |

### 👑 Admin Features Avanzados

| Feature                                 | Prioridad | Estimación | Estado                     |
| --------------------------------------- | --------- | ---------- | -------------------------- |
| Cambiar rol usuario (botón funcional)   | 🟡 Media  | 0.5 día    | ✅ hecho (con guards)      |
| Eliminar usuario (botón funcional)      | 🟡 Media  | 0.5 día    | ✅ hecho                   |
| Reportes/Exportar CSV                   | 🟢 Baja   | 1 día      | ✅ reservas (con filtros)  |
| Analytics dashboard                     | 🟢 Baja   | 2 días     | Gráficas uso/ocupación     |
| Configuración global (rate limits, etc) | 🟢 Baja   | 1 día      | Settings panel             |

### 🔧 Infra / DevOps

| Feature                         | Prioridad | Estimación | Estado                           |
| ------------------------------- | --------- | ---------- | -------------------------------- |
| PWA Service Worker              | 🟡 Media  | 1 día      | Workbox + next-pwa               |
| Background sync reservas        | 🔴 Alta   | 2 días     | IndexedDB + Sync API             |
| Sentry error tracking           | 🟡 Media  | 0.5 día    | ✅ código + DSN (falta ver 1er evento real) |
| CI/CD Pipeline (GitHub Actions) | 🟡 Media  | 1 día      | Lint + Typecheck + Test + Deploy |
| Preview deployments (Vercel)    | 🟢 Baja   | -          | ✅ Auto (Vercel)                 |
| Database migrations versionadas | 🟡 Media  | 1 día      | Supabase CLI migrations          |

### 🏢 Multi-tenancy (Futuro)

| Feature              | Prioridad | Estimación | Notas                    |
| -------------------- | --------- | ---------- | ------------------------ |
| Multi-condominio     | 🔴 Futuro | -          | Schema changes needed    |
| Roles personalizados | 🟢 Futuro | -          | RBAC avanzado            |
| API pública/Partner  | 🟢 Futuro | -          | REST API + rate limiting |

---

## 📊 Resumen Estado

| Categoría                 | Total   | ✅ Done | 🟢 Pending | 🟡 In Progress | 🔴 Blocked |
| ------------------------- | ------- | ------- | ---------- | -------------- | ---------- |
| Auth & Security           | 7       | 7       | 0          | 0              | 0          |
| Reservas CRUD             | 7       | 7       | 0          | 0              | 0          |
| Admin Panel               | 7       | 6       | 1          | 0              | 0          |
| Security Panel            | 5       | 5       | 0          | 0              | 0          |
| Notificaciones            | 4       | 4       | 0          | 0              | 0          |
| RLS Security              | 7       | 7       | 0          | 0              | 0          |
| **Core Total**            | **34**  | **33**  | **1**      | **0**          | **0**      |
| **Fase 3 (Nice to Have)** | **25+** | **0**   | **20+**    | **0**          | **0**      |

### 🎯 Próximos 3 Sprints Sugeridos

**Sprint 1 (Semana 1-2): Testing & PWA**

- Playwright E2E: flujo completo reserva + admin + security
- PWA: Service Worker + Manifest + Offline fallback
- Unit tests Vitest (validaciones + utils)

**Sprint 2 (Semana 3-4): Notificaciones + Admin**

- QR codes en emails + check-in rápido
- Push notifications (Web Push)
- Botones funcionales admin/users

**Sprint 3 (Semana 5-6): Infra + Monitoreo**

- Sentry + Performance monitoring
- CI/CD GitHub Actions
- Background sync + PWA completa
- Background sync reservas offline

---

## 📝 Notas Técnicas Importantes

### Decisiones Arquitectónicas Clave

1. **Server Actions > API Routes** para mutaciones
2. **RLS en BD** como primera línea de defensa
3. **Server Components** por defecto, Client solo cuando necesario
4. **Trigger BD** para perfil automático (source of truth)
5. **JWT claims** para RLS (evita recursión)
6. **Server Actions** para mutaciones (no API Routes)

### Debt Técnico Conocido

1. `security/page.tsx` - Server Actions inline (deberían estar en actions.ts)
2. `admin/users/page.tsx` - Botones sin handlers
3. `admin/users/page.tsx` - Falta pagination para muchos usuarios
4. `security/page.tsx` - Server Actions inline (checkIn, checkOut, markNoShow)
5. Falta pagination en listas grandes (reservas, usuarios, áreas)

### Migraciones Pendientes BD

- [ ] Índices compuestos para queries frecuentes
- [ ] Partitioning reservations por fecha (si escala)
- [ ] Materialized views para dashboard admin

---

## 📋 COMPARATIVA 2026-09-17: Proyecto vs guia-onboarding-mvp.md vs reto-hackaton-reservas.pdf

### 1. Vs Guía Onboarding — ✅ 90% alineado
- [x] Stack: Next.js App Router + TS strict + Tailwind + shadcn/ui + Supabase Auth + Zod/RHF + ESLint/Prettier/Husky + Vercel + Sentry
- [x] Metodología: main←develop←feat/fix, commits convencionales, PRs con closes #, decisiones David
- [ ] Gap menor: convención `feat/` vs `feature/` guía; `guia-onboarding-mvp.md` y `*.pdf` ignorados en `.gitignore`

### 2. Vs Reto Hackatón (coworking salas) — ⚠️ No entregable hoy
Dominio distinto: reto=sala coworking San José / proyecto=áreas condominio.

Funcional:
- [x] M1 ver áreas activas, M3 crear reserva, A2-A4 CRUD/desactivar
- [ ] M4 próximas/pasadas separadas + M6 contador semanal visible
- [ ] M5/A6 cancelar con regla RN-07 (2h) + motivo admin (`cancelReservationAction` solo pending sin tiempo)

Reglas RN01-RN10:
- [x] RN01 no-solape (EXCLUDE gist + 23P01) + RN08 cancelada libera
- [ ] RN02 bloques 30min (validar alineación inicio)
- [ ] RN03 duración 1-3h (hoy max 4h, sin mínimo)
- [ ] RN04 horario fijo 07:00-21:00 (hoy schedules dinámicos)
- [ ] RN05 30min anticipación (hoy 2h)
- [ ] RN06 max 3/semana (hoy 2/semana)
- [ ] RN09 bloquear reserva en sala desactivada (`is_active`)
- [ ] RN10 timezone America/Costa_Rica (date-fns-tz)
- [ ] D1-D5 documentar en DECISIONES.md (descalificatorio si falta)

Técnico/Seguridad/Git:
- [ ] RLS: separar políticas por operación (hoy `FOR ALL` admin) + mover `migration_fix_trigger.sql` a `supabase/migrations/`
- [ ] Generar `src/types/database.ts` (`supabase gen types`)
- [ ] Proteger `main` (hoy commits directos `e08318a/eb417bb`) + agregar `.github/workflows/ci.yml` (tsc/eslint/build)
- [ ] Crear `.env.example` (hoy solo `.env.local`)

Entregables reto:
- [ ] `DECISIONES.md` (D1-D5 + formato Fecha/Opciones/Decisión/Por qué/Sacrificio)
- [ ] `SEGURIDAD.md` (cada policy RLS + ataque que bloquea)
- [ ] `scripts/seed.ts` (3 salas, 2 miembros, 1 admin, 10 reservas)
- [ ] `scripts/concurrencia.ts` (10 req simultáneas, esperado=1) + pegar salida en README
- [ ] README: setup desde cero + diagrama datos + qué funciona/fuera + link Vercel
