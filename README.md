# MVP Reservas Condominio

Sistema de reservas de áreas comunes para condominios. Mobile-first, multi-usuario (residentes, admins, seguridad).

## Stack

- **Next.js 14** (App Router, Server Components)
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (PostgreSQL + Auth + Realtime)
- **React Hook Form** + **Zod** (validación)
- **pnpm** (package manager)

## Estructura del proyecto

```
src/
├── app/                    # Rutas Next.js (App Router)
│   ├── (auth)/            # Login, Register, Callback (públicas)
│   ├── (dashboard)/       # Rutas protegidas (residente)
│   ├── admin/             # Panel admin (protegido)
│   ├── api/               # Server Actions
│   └── layout.tsx         # Layout raíz + providers
├── components/
│   ├── ui/                # shadcn/ui (Button, Input, Card, Dialog, etc.)
│   ├── forms/             # Formularios reutilizables (FormField, FormInput...)
│   └── layout/            # Header, Sidebar, etc.
├── lib/
│   ├── supabase/          # Cliente Supabase (server.ts, client.ts)
│   ├── utils.ts           # Utilidades (cn = clsx + tailwind-merge)
│   └── validations/       # Esquemas Zod
├── hooks/                 # Custom hooks (useAuth, useReservations...)
├── types/                 # Tipos TypeScript globales
└── middleware.ts          # Auth middleware (protege /dashboard, /admin)
```

## Scripts

```bash
pnpm dev        # Desarrollo (localhost:3000)
pnpm build      # Compilar producción
pnpm start      # Servidor producción
pnpm lint       # ESLint
pnpm typecheck  # TypeScript check (tsc --noEmit)
```

## Variables de entorno

Crear `.env.local` en la raíz:

```env
# Supabase (obtener en Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Solo server
```

## Base de datos (Supabase SQL Editor)

Ejecutar el schema en `MEMORY.md` (líneas 23-70). Incluye:
- `profiles` - Extiende `auth.users`
- `common_areas` - Áreas reservables
- `reservations` - Reservas con constraint anti-solapamiento
- `availability_schedules` - Horarios por área/día

## Flujo de trabajo (Git)

```
main (producción, deploy Vercel)
  ↑ PR develop→main
develop (integración)
  ↑ PR feature/*→develop
feature/xxx (trabajo individual)
```

- Commits: `feat:`, `fix:`, `style:`, `docs:`, `chore:`
- PR requiere 1 aprobación mínima
- Nunca push directo a `main` ni `develop`

## Despliegue

1. Push a `main` → Vercel deploya automático
2. Variables de entorno en Vercel Dashboard
3. Preview deployments en cada PR

## Próximos pasos (Issues)

Ver [GitHub Issues](https://github.com/Trizzoth/miproyecto-reservas/issues)