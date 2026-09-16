# CONTEXTO COMPRIMIDO — MVP Reservas Condominio

> Archivo para alimentar a otro modelo IA. Última actualización: 2026-09-16.
> Repo: https://github.com/Trizzoth/condominium-reservations (privado) · Rama: `main` · Commit: `08b0eb8`
> Producción: https://condominium-reservations-gbsx.vercel.app · Supabase project: `ytwixmzrzcawtoxzjkeo`

## 1. Qué es

Sistema de reservas de áreas comunes para condominios (hackathon/MVP). 3 roles: `resident` (reserva), `admin` (aprueba/gestiona), `security` (check-in/out). Mobile-first, español.

## 2. Stack (inmutable sin aprobación de David)

Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui + Supabase (Postgres+Auth) + Zod + React Hook Form + pnpm + Vercel + Resend (emails) + Playwright E2E. Sin Prettier/Husky/Sentry/Vitest instalados.

## 3. Estado: PRODUCCIÓN READY (con pendientes abajo)

- Auth: login/register/magic-link/perfil + middleware + role-based layouts.
- Reservas: calendario react-day-picker, slots por horario, constraint anti-solapamiento BD, reglas (max 2/semana, 2h–30d anticipación, max 4h).
- Admin: CRUD áreas/horarios/usuarios/reservas, aprobar/rechazar. Usuarios admin page tiene botones placeholder sin handler.
- Security: panel hoy + check-in/out/no-show.
- Emails Resend (4 templates) + cron recordatorio 24h.
- Build ✅, tsc ✅, Playwright 8/8 ✅, `pnpm lint` ❌ (11 errores, 44 warnings).

## 4. Pendientes (orden sugerido)

1. **Reescribir `escapeHtml` en `src/lib/emails.ts:14-21` con entidades reales** (`&amp; &lt; &gt; &quot;`) y aplicar a `userName`/`areaName` — el fix actual es no-op, XSS de `adminNotes` sigue abierto.
2. Botón cancelar (`reservations/page.tsx`, Server Component con `onClick`) → mover a Server Action con `"use server"`.
3. `checkIn/checkOut/markNoShow` en `security/page.tsx` → mismo fix + validar rol.
4. Cron reminders usa cliente anon sin sesión → crear helper service-role y probar.
5. Dejar `pnpm lint` en verde. Rate limit emails en Supabase → 10/hora (manual).
6. Fase 3: PWA, Sentry, QR codes, Vitest, push notifications.

## 5. Usuarios de prueba (todos confirmados en Auth)

- `admin@test.com` / Admin123 → rol admin
- `security@test.com` / Security123 → rol security
- `resident@test.com` / Resident123 → rol resident
- (La cuenta del dueño `andypiedravarela@gmail.com` fue borrada para recrearla desde cero.)

## 6. Mapa de archivos .md (HAY DUPLICADOS — leer solo los marcados ★)

| Archivo                                                             | Qué es                                                             | Leer                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| ★ `RULES.md`                                                        | Reglas del proyecto (única fuente; no existe `.continue/rules/`)   | SÍ                     |
| ★ `MEMORY.md`                                                       | Memoria del proyecto + decisiones + preferencias + apps vinculadas | SÍ                     |
| ★ `VERIFICACION.md`                                                 | Auditoría honesta 2026-09-16 (hallazgos con archivo+línea)         | SÍ                     |
| ★ `CHANGELOG.md`                                                    | Historial de cambios y fixes                                       | SÍ                     |
| ★ `FEATURES.md`                                                     | Qué está implementado vs pendiente (detalle)                       | Si se necesita detalle |
| `memory.md` (minúsculas)                                            | **NO es memoria del proyecto**: son specs de hardware/OS de la PC  | Solo si se pide specs  |
| `RESUMEN_PROYECTO.md`                                               | Resumen ejecutivo viejo (puede estar desactualizado)               | Solo referencia        |
| `IDEA_PRINCIPAL.md`                                                 | Idea/producto original                                             | Contexto producto      |
| `guia-onboarding-mvp.md`                                            | Guía onboarding hackathon                                          | Contexto equipo        |
| `issue2-body.md`, `issue3-body.md`, `pr-body.md`                    | Temporales para crear issues/PRs (ya mergeados)                    | Borrables              |
| `ACCESO_MCP.md`                                                     | Capacidades MCP filesystem+playwright                              | Contexto herramientas  |
| `schema.sql`, `migration_security.sql`, `migration_fix_trigger.sql` | SQL aplicado en Supabase                                           | Si se toca BD          |
| Este archivo `CONTEXTO_IA.md`                                       | Comprimido para alimentar IAs                                      | —                      |

## 7. Apps/extensiones vinculadas (MCP en `~/.config/opencode/opencode.jsonc`)

- `filesystem`: `/home/trizzoth` total ✅ · `playwright`: Chromium ✅ · `supabase` remoto: configurado, **falta** `opencode mcp auth supabase` + reiniciar (tiene ESCRITURA en prod, sin read-only — avisar antes de usar).
- CLI: `gh` autenticado; `psql` instalado pero conexión directa imposible (IPv6); Supabase REST con `sb_secret_*` funciona (bypass RLS).
- Credenciales reales: solo en `.env.local` (gitignored) y Vercel env vars. **Nunca commitear, nunca pedirlas de nuevo.**

## 8. Aprendizajes duros (no repetir)

- DayPicker v9: el click vive en `DayButton`, no en `Day`. Override de `Day` rompe la selección.
- RLS: nunca consultar `profiles` dentro de una policy de `profiles` (recursión 42P17); usar `auth.jwt() ->> 'role'`.
- UPDATE en `profiles` siempre con `WITH CHECK` que bloquee cambio de `role`/`id`.
- `sb_secret_*` sirve como `apikey`+Bearer en REST/Admin API, pero NO como JWT crudo en todos lados; conexión `db.<ref>` directa falla por IPv6.
- Signup REST puede devolver ID sin persistir si hay rate limit de emails → verificar con `GET /auth/v1/admin/users`.
- `pnpm build`/`tsc` NO detectan Server Components con `onClick` inválido ni `escapeHtml` no-op: solo tests + lectura lo cazan.

## 9. Conversación comprimida (qué pasó en este chat)

Sesión de construcción del MVP: setup Next.js+Supabase+GitHub+Vercel → auth flow → reservas+calendario → admin/security panels → emails Resend → fixes seguridad (RLS recursión, UPDATE profiles, trigger, XSS adminNotes — **este último quedó mal, ver pendiente 1**) → deploy Vercel OK → auditoría externa de "David" (2 críticos BD, parcheados) → verificación formal en `VERIFICACION.md` (honesta: lint falla, botones rotos probables, cron no verificado) → fix calendario DayButton (verificado E2E) + rediseño register → este archivo.
Preferencia del usuario: que el agente ejecute código/acciones directamente en vez de dar pasos manuales; solo pedir manual lo imposible (OAuth, clicks en dashboards).
