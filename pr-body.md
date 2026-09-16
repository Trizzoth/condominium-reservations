## Resumen

Implementación completa del Issue #1: Auth flow

## Qué incluye

- **Login** (`/login`): Email/password + Magic link
- **Register** (`/register`): Validación Zod, create profile automático via trigger
- **Callback** (`/auth/callback`): Confirmación email
- **Dashboard** (`/dashboard`): Resumen de reservas, stats cards
- **Perfil** (`/dashboard/profile`): Editar nombre, apto, teléfono
- **Mis reservas** (`/dashboard/reservations`): Lista con cancelar pendientes
- **Nueva reserva** (`/dashboard/reservations/new`): Calendario + slots de hora + validación disponibilidad
- **Admin panel** (`/admin`): Tabla todas las reservas, aprobar/rechazar con Server Actions

## Stack usado

- Next.js 14 App Router + TypeScript strict
- Supabase Auth (SSR via @supabase/ssr)
- React Hook Form + Zod validación
- shadcn/ui components (Button, Input, Card, Dialog, Select, Dropdown, Avatar, Badge, Calendar)
- Tailwind CSS
- Server Actions para mutaciones

## Para probar

1. Crear `.env.local` con credenciales Supabase
2. Ejecutar `schema.sql` en Supabase SQL Editor
3. `pnpm dev`
4. Probar registro → login → crear reserva → admin aprobar

## Screenshots

(pendiente)

## Checklist

- [x] TypeScript compile
- [x] ESLint pass
- [x] Build success
- [x] Middleware protege /dashboard y /admin
- [x] RLS policies en Supabase
- [x] Constraint anti-solapamiento en BD
