# Memoria del Proyecto - MVP Reservas Condominio

## Contexto General

**Proyecto**: Sistema de reservas para condominios (MVP)
**Objetivo**: Permitir a residentes reservar áreas comunes (salón, piscina, cancha, etc.) con validación de disponibilidad, aprobación admin, notificaciones.
**Usuario final**: Residentes + Administradores del condominio
**Plazo**: Hackathon / MVP rápido

## Decisiones Técnicas Tomadas

| Tema | Decisión | Fecha | Autor |
|------|----------|-------|-------|
| Stack | Next.js 14 + TS + Tailwind + Supabase | Inicio | David |
| Auth | Supabase Auth (email/password + magic link) | Inicio | David |
| BD | PostgreSQL via Supabase | Inicio | David |
| UI | shadcn/ui + Tailwind | Inicio | David |
| Package Manager | pnpm | 2026-09-16 | David |
| Git Flow | main/develop/feature/fix | Inicio | David |
| Testing | Playwright E2E | 2026-09-16 | David |
| Notifications | Resend (email) + Cron (Vercel) | 2026-09-16 | David |

## Esquema BD Actualizado (Supabase) - Post Migration

```sql
-- Perfiles extendidos de usuarios
profiles (
  id uuid REFERENCES auth.users PK,
  full_name text,
  apartment text,
  phone text,
  role text CHECK (role IN ('resident', 'admin', 'security')) DEFAULT 'resident',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Áreas comunes reservables
common_areas (
  id uuid PK DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  capacity integer,
  rules text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Reservas (CON CONSTRAINT ANTI-SOLAPAMIENTO + check-in/out)
reservations (
  id uuid PK DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  common_area_id uuid REFERENCES common_areas(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'no_show')) DEFAULT 'pending',
  admin_notes text,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    common_area_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('pending', 'approved'))
)

-- Horarios de disponibilidad por área
availability_schedules (
  id uuid PK DEFAULT gen_random_uuid(),
  common_area_id uuid REFERENCES common_areas(id),
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo
  open_time time NOT NULL,
  close_time time NOT NULL,
  max_duration_hours int DEFAULT 4,
  created_at timestamptz DEFAULT now()
)

-- Trigger handle_new_user (FIXED: guarda apartment, phone, role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, apartment, phone, role)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'apartment',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'resident')
  );
  RETURN NEW;
END;
$$;
```

## Funcionalidades MVP (Alcance Mínimo)

### Fase 1 - Core (Semana 1)
- [x] Auth: Login/Register/Magic Link + Perfil
- [x] Dashboard residente: Ver áreas, reservar, ver mis reservas
- [x] Dashboard admin: Ver todas las reservas, aprobar/rechazar
- [x] Validación solapamiento BD (constraint exclusivo)
- [x] UI responsive mobile-first
- [x] Calendar visual (react-day-picker)
- [x] Admin: CRUD áreas comunes + horarios

### Fase 2 - Pulido (Semana 2)
- [x] Notificaciones email (Resend): confirmación reserva, aprobada/rechazada, recordatorio 24h (cron)
- [x] Reglas de negocio: max 2 reservas/semana, anticipación 2h/30d, max 4h por reserva (configurable por área)
- [x] Panel seguridad: check-in/check-out, lista hoy, estados (pendiente/dentro/salió/no-show)

### Fase 3 - Nice to Have
- [ ] PWA / offline básico
- [ ] Sentry monitoring
- [ ] Tests E2E (Playwright)
- [ ] QR codes en emails para check-in rápido

## Estado Actual (2026-09-16)

- ✅ Reglas y memoria creadas
- ✅ pnpm 11.26.0 instalado (Arch/EndeavourOS)
- ✅ Node v26.8.2
- ✅ Git 2.55.0
- ✅ Proyecto Next.js 14 + TypeScript + Tailwind creado
- ✅ Supabase client/server + middleware auth configurado
- ✅ shadcn/ui components (button, input, label, card, dialog, select, dropdown, avatar, badge, form, calendar, textarea)
- ✅ Repo GitHub creado: https://github.com/Trizzoth/condominium-reservations (privado)
- ✅ Git flow configurado: `main` (producción) ← `develop` (integración) ← `feature/*`
- ✅ **Auth flow COMPLETADO** (Issue #1 merged): login, register, magic link, profile, dashboard, admin panel
- ✅ **Reservations CRUD COMPLETADO** (Issue #2 merged): calendar visual, admin areas/schedules/users/reservations
- ✅ **Phase 2 COMPLETADO** (Issue #3 merged): Resend emails, business validations, security panel
- ✅ Supabase project creado + schema ejecutado + migration_security.sql
- ✅ .env.local configurado (incluye RESEND_API_KEY)

## Próximos Pasos Inmediatos

1. ✅ `pnpm create next-app@latest` - COMPLETADO
2. ✅ Dependencias instaladas - COMPLETADO
3. ✅ shadcn/ui + componentes base - COMPLETADO
4. ✅ Supabase client/server + middleware - COMPLETADO
5. ✅ Repo GitHub + git flow - COMPLETADO
6. ✅ **Crear proyecto Supabase** → COMPLETADO
7. ✅ **Crear `.env.local`** con credenciales Supabase → COMPLETADO
8. ✅ **Ejecutar SQL schema** en Supabase SQL Editor → COMPLETADO
9. ✅ **Crear Issue #1** → COMPLETADO + MERGED
10. ✅ **Crear rama** `feature/auth-flow` → COMPLETADO + MERGED
11. ✅ **Crear Issue #2** → COMPLETADO + MERGED
12. ✅ **Crear Issue #3** → COMPLETADO + MERGED

---

### 🔄 SIGUIENTE: Issue #4 - Fase 3: Nice to Have
- [ ] PWA / offline básico (service worker, manifest)
- [ ] Sentry monitoring (error tracking)
- [ ] Tests E2E (Playwright): auth flow, reservas, admin
- [ ] QR codes en emails de confirmación para check-in rápido
- [ ] Tests unitarios (Vitest): validaciones, utils

## Credenciales / Secrets (NO COMMITEAR)

- `NEXT_PUBLIC_SUPABASE_URL` 
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server)
- Guardar en `.env.local` y Vercel Environment Variables

## Contactos / Recursos

- Supabase Dashboard: https://supabase.com/dashboard
- Vercel: https://vercel.com
- shadcn/ui: https://ui.shadcn.com
- Next.js Docs: https://nextjs.org/docs

## Apps y Extensiones Vinculadas (MCP + herramientas)

**Config:** `~/.config/opencode/opencode.jsonc` (requiere reiniciar opencode tras cambios)

| App / Servidor MCP | Estado | Alcance | Notas |
|---|---|---|---|
| `filesystem` (`@modelcontextprotocol/server-filesystem`) | ✅ Activo | `/home/trizzoth` lectura/escritura total | Ver `ACCESO_MCP.md` |
| `playwright` (`@playwright/mcp@latest`) | ✅ Activo | Chromium en `~/.cache/ms-playwright` | Testing E2E, screenshots, automatización navegador |
| `supabase` (remoto `mcp.supabase.com`, project `ytwixmzrzcawtoxzjkeo`) | ⚠️ Configurado, falta auth | features: docs, account, database, debugging, development, functions, branching (**ESCRITURA en prod, sin read-only**) | Falta: `opencode mcp auth supabase` en terminal + reiniciar opencode |

**Herramientas CLI verificadas en la PC:**
| Herramienta | Estado | Uso |
|---|---|---|
| `gh` (GitHub CLI) | ✅ Autenticado como Trizzoth | repos, PRs, issues |
| `psql` 18 (instalado vía pacman) | ✅ | Conexión directa Postgres **NO funciona** (DNS solo IPv6, red inaccesible) |
| `supabase` vía npx | ✅ | `link`, `db push`, `migration repair` (requiere `SUPABASE_ACCESS_TOKEN`) |
| Supabase REST API (`/rest/v1/*`, `/auth/v1/admin/*`) | ✅ Funciona con `sb_secret_*` como `apikey` + Bearer (bypass RLS) | Crear usuarios, leer/escribir tablas |
| Playwright vía npx | ✅ `@playwright/test 1.63.0` | `npx playwright test` (usa `playwright.config.ts`) |

## Preferencias del Usuario (2026-09-16)

- **Ejecutar antes de pedir**: el usuario prefiere que el agente ejecute código y acciones directamente (Supabase REST API, psql, CLI) en lugar de darle pasos manuales. Solo pedir pasos manuales cuando sea técnicamente imposible (OAuth en navegador, clicks en dashboards).
- **Accesos verificados que funcionan desde terminal**:
  - Supabase REST API (`/rest/v1/*` + Auth Admin API) con `sb_secret_*` como `apikey` + `Authorization: Bearer` → bypass RLS, funciona.
  - Conexión directa Postgres (`db.<ref>.supabase.co:5432`) → **NO funciona** (DNS solo IPv6, red inaccesible).
  - `sb_secret_*` como Bearer en `/auth/v1/admin/*` → SÍ funciona (lista/lee usuarios).
- **Cuentas de prueba existentes** (todas confirmadas, roles OK en `profiles`):
  - `admin@test.com` / Admin123 → `eed8373b-...` → admin
  - `security@test.com` / Security123 → `78ef91b2-...` → security
  - `resident@test.com` / Resident123 → `baec1006-...` → resident
  - `andypiedravarela@gmail.com` → `bb2bb9ed-...` → resident (cuenta del dueño)
- **Nota**: signups vía REST devuelven ID pero pueden no persistir si el rate limit de emails está activo; verificar siempre con `GET /auth/v1/admin/users`.