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

## Esquema BD Preliminar (Supabase)

```sql
-- Perfiles extendidos de usuarios
profiles (
  id uuid REFERENCES auth.users PK,
  full_name text,
  apartment text,
  phone text,
  role text CHECK (role IN ('resident', 'admin', 'security')),
  created_at timestamptz DEFAULT now()
)

-- Áreas comunes reservables
common_areas (
  id uuid PK DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  capacity integer,
  rules text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Reservas
reservations (
  id uuid PK DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  common_area_id uuid REFERENCES common_areas(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    common_area_id WITH =,
    tsrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('pending', 'approved'))
)

-- Horarios de disponibilidad por área
availability_schedules (
  id uuid PK DEFAULT gen_random_uuid(),
  common_area_id uuid REFERENCES common_areas(id),
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo
  open_time time NOT NULL,
  close_time time NOT NULL,
  max_duration_hours int DEFAULT 4
)
```

## Funcionalidades MVP (Alcance Mínimo)

### Fase 1 - Core (Semana 1)
- [ ] Auth: Login/Register/Magic Link + Perfil
- [ ] Dashboard residente: Ver áreas, reservar, ver mis reservas
- [ ] Dashboard admin: Ver todas las reservas, aprobar/rechazar
- [ ] Validación solapamiento BD (constraint exclusivo)
- [ ] UI responsive mobile-first

### Fase 2 - Pulido (Semana 2)
- [ ] Notificaciones email (Supabase Auth hooks / Resend)
- [ ] Calendario visual (react-day-picker o similar)
- [ ] Reglas de negocio: max horas/semana, anticipación mínima
- [ ] Panel seguridad: check-in/check-out reservas

### Fase 3 - Nice to Have
- [ ] PWA / offline básico
- [ ] Sentry monitoring
- [ ] Tests E2E (Playwright)

## Estado Actual (2026-09-16)

- ✅ Reglas y memoria creadas
- ✅ pnpm 11.26.0 instalado (Arch/EndeavourOS)
- ✅ Node v26.8.2
- ✅ Git 2.55.0
- ✅ Proyecto Next.js 14 + TypeScript + Tailwind creado
- ✅ Supabase client/server + middleware auth configurado
- ✅ shadcn/ui components (button, input, label, card, dialog, select, dropdown, avatar, badge, form)
- ✅ Repo GitHub creado: https://github.com/Trizzoth/condominium-reservations (privado)
- ✅ Git flow configurado: `main` (producción) ← `develop` (integración) ← `feature/*`
- ✅ **Auth flow COMPLETADO** (Issue #1 merged): login, register, magic link, profile, dashboard, admin panel
- ✅ Supabase project creado + schema ejecutado
- ✅ .env.local configurado

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

---

### 🔄 SIGUIENTE: Issue #2 - Reservations CRUD & Calendar
- [ ] Calendar visual mejorado (react-day-picker)
- [ ] Admin: CRUD áreas comunes + horarios
- [ ] Validaciones negocio: max horas/semana, anticipación
- [ ] Notificaciones email (Resend)
- [ ] Panel seguridad check-in/out

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